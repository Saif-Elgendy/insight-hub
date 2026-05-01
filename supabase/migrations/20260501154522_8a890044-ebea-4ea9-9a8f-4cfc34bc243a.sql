
-- 1. تحديث consultant_requests: إضافة المستندات الإجبارية واللغات والموافقة المزدوجة
ALTER TABLE public.consultant_requests
  ADD COLUMN IF NOT EXISTS id_card_url text,
  ADD COLUMN IF NOT EXISTS license_url text,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS admin_review_notes text,
  ADD COLUMN IF NOT EXISTS super_admin_approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS super_admin_approved_by uuid;

-- تحديث القيم المسموحة للحالة: pending -> admin_reviewed -> approved/rejected
-- (نُبقي العمود text للمرونة)

-- 2. تحديث specialists: إضافة عدد الحالات والمراجعات واللغات
ALTER TABLE public.specialists
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS completed_consultations_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_permanently_banned boolean NOT NULL DEFAULT false;

-- 3. تحديث specialist_reviews: تفاصيل سبب التقييم وحقول التحقيق
ALTER TABLE public.specialist_reviews
  ADD COLUMN IF NOT EXISTS reason_details text,
  ADD COLUMN IF NOT EXISTS is_under_investigation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS investigation_result text,
  ADD COLUMN IF NOT EXISTS investigated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS investigated_by uuid;

-- منع إنشاء تقييم سيئ بدون تفاصيل (عبر trigger بدلاً من CHECK)
CREATE OR REPLACE FUNCTION public.validate_review_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating <= 2 AND (NEW.reason_details IS NULL OR length(trim(NEW.reason_details)) < 20) THEN
    RAISE EXCEPTION 'يجب توضيح سبب التقييم بالتفصيل (20 حرف على الأقل) عند التقييم الضعيف';
  END IF;
  -- التقييمات الضعيفة تدخل تحت التحقيق تلقائياً
  IF NEW.rating <= 2 THEN
    NEW.is_under_investigation := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_review_details_trigger ON public.specialist_reviews;
CREATE TRIGGER validate_review_details_trigger
BEFORE INSERT OR UPDATE ON public.specialist_reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review_details();

-- 4. تحديث violations: درجة الخطورة ومدة الإيقاف
ALTER TABLE public.violations
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS suspension_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS issued_by uuid,
  ADD COLUMN IF NOT EXISTS related_review_id uuid;

-- 5. جدول جديد: السجل الطبي للمرضى
CREATE TABLE IF NOT EXISTS public.patient_medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  specialist_id uuid NOT NULL,
  consultation_id uuid,
  diagnosis text NOT NULL,
  recommendations text,
  notes text,
  visible_to_patient boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pmr_patient ON public.patient_medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_pmr_specialist ON public.patient_medical_records(specialist_id);
CREATE INDEX IF NOT EXISTS idx_pmr_consultation ON public.patient_medical_records(consultation_id);

ALTER TABLE public.patient_medical_records ENABLE ROW LEVEL SECURITY;

-- سياسات السجل الطبي
CREATE POLICY "Specialists can view their patients records"
ON public.patient_medical_records FOR SELECT
USING (
  specialist_id IN (SELECT id FROM public.specialists WHERE user_id = auth.uid())
);

CREATE POLICY "Patients can view their own visible records"
ON public.patient_medical_records FOR SELECT
USING (auth.uid() = patient_id AND visible_to_patient = true);

CREATE POLICY "Admins can view all medical records"
ON public.patient_medical_records FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Specialists can insert records for their patients"
ON public.patient_medical_records FOR INSERT
WITH CHECK (
  specialist_id IN (SELECT id FROM public.specialists WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.user_id = patient_medical_records.patient_id
      AND c.specialist_id = patient_medical_records.specialist_id
  )
);

CREATE POLICY "Specialists can update their patients records"
ON public.patient_medical_records FOR UPDATE
USING (
  specialist_id IN (SELECT id FROM public.specialists WHERE user_id = auth.uid())
);

CREATE POLICY "Specialists can delete their patients records"
ON public.patient_medical_records FOR DELETE
USING (
  specialist_id IN (SELECT id FROM public.specialists WHERE user_id = auth.uid())
);

-- trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_pmr_updated_at ON public.patient_medical_records;
CREATE TRIGGER update_pmr_updated_at
BEFORE UPDATE ON public.patient_medical_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. تحديث آلية موافقة الاستشاري: السوبر آدمن فقط يحدد approved
CREATE OR REPLACE FUNCTION public.enforce_consultant_approval_flow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid := '9a48cfb7-03ed-4df4-afc9-67a06d014d77';
BEGIN
  -- منع الموافقة النهائية إلا من السوبر آدمن
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF auth.uid() IS DISTINCT FROM v_super_admin_id THEN
      RAISE EXCEPTION 'الموافقة النهائية على الاستشاري حصراً للسوبر آدمن';
    END IF;
    -- يجب أن يكون الآدمن قد راجع أولاً
    IF NEW.admin_reviewed_at IS NULL THEN
      RAISE EXCEPTION 'يجب مراجعة الطلب من قبل آدمن قبل الموافقة النهائية';
    END IF;
    -- يجب أن تكون المستندات الإجبارية مرفوعة
    IF NEW.id_card_url IS NULL OR NEW.license_url IS NULL 
       OR NEW.photo_url IS NULL 
       OR NEW.certificates_urls IS NULL OR array_length(NEW.certificates_urls, 1) IS NULL THEN
      RAISE EXCEPTION 'جميع المستندات الإجبارية مطلوبة (الصورة، الشهادات، الترخيص، بطاقة الهوية)';
    END IF;
    NEW.super_admin_approved_at := now();
    NEW.super_admin_approved_by := auth.uid();
  END IF;

  -- مرحلة مراجعة الآدمن
  IF NEW.status = 'admin_reviewed' AND (OLD.status IS DISTINCT FROM 'admin_reviewed') THEN
    NEW.admin_reviewed_at := now();
    NEW.admin_reviewed_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_consultant_approval_flow_trigger ON public.consultant_requests;
CREATE TRIGGER enforce_consultant_approval_flow_trigger
BEFORE UPDATE ON public.consultant_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_consultant_approval_flow();

-- 7. تحديث specialists تلقائياً عند اكتمال استشارة
CREATE OR REPLACE FUNCTION public.update_specialist_completed_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'::consultation_status 
     AND (OLD.status IS DISTINCT FROM 'completed'::consultation_status) THEN
    UPDATE public.specialists
    SET completed_consultations_count = completed_consultations_count + 1
    WHERE id = NEW.specialist_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_specialist_completed_count_trigger ON public.consultations;
CREATE TRIGGER update_specialist_completed_count_trigger
AFTER UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.update_specialist_completed_count();

-- 8. تحديث reviews_count تلقائياً
CREATE OR REPLACE FUNCTION public.update_specialist_reviews_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_specialist_id uuid := COALESCE(NEW.specialist_id, OLD.specialist_id);
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.specialist_reviews
  WHERE specialist_id = v_specialist_id;
  
  UPDATE public.specialists
  SET reviews_count = v_count
  WHERE id = v_specialist_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_specialist_reviews_count_trigger ON public.specialist_reviews;
CREATE TRIGGER update_specialist_reviews_count_trigger
AFTER INSERT OR DELETE ON public.specialist_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_specialist_reviews_count();

-- 9. تحديث آلية الإيقاف بناءً على عدد المخالفات (5 مخالفات = إيقاف نهائي)
CREATE OR REPLACE FUNCTION public.check_and_ban_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  violation_count integer;
  total_suspension_days integer;
  is_specialist boolean;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(suspension_days), 0) 
    INTO violation_count, total_suspension_days
  FROM public.violations
  WHERE user_id = NEW.user_id;

  SELECT EXISTS(SELECT 1 FROM public.specialists WHERE user_id = NEW.user_id)
    INTO is_specialist;

  -- إيقاف نهائي عند 5 مخالفات أو أكثر
  IF violation_count >= 5 THEN
    UPDATE public.profiles SET is_banned = true WHERE user_id = NEW.user_id;
    IF is_specialist THEN
      UPDATE public.specialists 
      SET is_available = false, is_permanently_banned = true 
      WHERE user_id = NEW.user_id;
    END IF;
  -- إيقاف مؤقت بناءً على suspension_days للمخالفة الحالية
  ELSIF NEW.suspension_days > 0 THEN
    IF is_specialist THEN
      UPDATE public.specialists 
      SET is_available = false,
          suspended_until = now() + (NEW.suspension_days || ' days')::interval
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  -- إشعار
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.user_id,
    CASE 
      WHEN violation_count >= 5 THEN 'تم إيقاف حسابك نهائياً'
      WHEN NEW.suspension_days > 0 THEN 'تم إيقاف حسابك مؤقتاً'
      ELSE 'تحذير: مخالفة جديدة'
    END,
    CASE 
      WHEN violation_count >= 5 THEN 
        'تم إيقاف حسابك نهائياً بسبب تجاوز الحد الأقصى للمخالفات (5 مخالفات).'
      WHEN NEW.suspension_days > 0 THEN
        'تم إيقاف حسابك لمدة ' || NEW.suspension_days || ' يوم بسبب: ' || NEW.reason
      ELSE 
        'لديك مخالفة جديدة بسبب: ' || NEW.reason || '. عند بلوغ 5 مخالفات سيتم إيقاف حسابك نهائياً.'
    END,
    'violation'
  );

  RETURN NEW;
END;
$$;

-- إعادة ربط الـ trigger
DROP TRIGGER IF EXISTS check_and_ban_user_trigger ON public.violations;
CREATE TRIGGER check_and_ban_user_trigger
AFTER INSERT ON public.violations
FOR EACH ROW EXECUTE FUNCTION public.check_and_ban_user();

-- 10. bucket لمستندات الاستشاريين (موجود مسبقاً) - نتأكد من السياسات
-- سياسات الرفع لمستندات الاستشاريين
DO $$ BEGIN
  CREATE POLICY "Users can upload their own consultant documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'consultant-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their own consultant documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'consultant-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1] 
         OR public.has_role(auth.uid(), 'admin'::app_role))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own consultant documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'consultant-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
