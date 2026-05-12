
-- 1. consultant-documents bucket: drop loose INSERT policy (path-enforced policy remains)
DROP POLICY IF EXISTS "Authenticated users can upload consultant documents" ON storage.objects;

-- 2. consultations INSERT: require authenticated role (not anon)
DROP POLICY IF EXISTS "Users can create their own consultations" ON public.consultations;
CREATE POLICY "Users can create their own consultations"
ON public.consultations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. enrollments: prevent users from changing status/paid_at/deleted_at themselves
CREATE OR REPLACE FUNCTION public.prevent_user_enrollment_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role and admins to make any change
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Block sensitive field changes for the row owner
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by THEN
    RAISE EXCEPTION 'Not allowed to modify enrollment status, payment, or deletion fields';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_user_enrollment_privilege_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_user_enrollment_privilege_change ON public.enrollments;
CREATE TRIGGER trg_prevent_user_enrollment_privilege_change
BEFORE UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_enrollment_privilege_change();

-- Also block insert with elevated status/paid_at by non-admins
CREATE OR REPLACE FUNCTION public.sanitize_user_enrollment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- Force pending/no-payment for self-inserts
  NEW.status := 'pending'::enrollment_status;
  NEW.paid_at := NULL;
  NEW.deleted_at := NULL;
  NEW.deleted_by := NULL;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sanitize_user_enrollment_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sanitize_user_enrollment_insert ON public.enrollments;
CREATE TRIGGER trg_sanitize_user_enrollment_insert
BEFORE INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.sanitize_user_enrollment_insert();

-- 4. course_progress: prevent self-issuing certificate / marking complete
CREATE OR REPLACE FUNCTION public.sanitize_user_course_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_done int;
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Always force certificate_issued to its trusted value (never user-controlled)
  IF TG_OP = 'INSERT' THEN
    NEW.certificate_issued := false;
  ELSE
    NEW.certificate_issued := COALESCE(OLD.certificate_issued, false);
  END IF;

  -- Recompute completion server-side from completed_lesson_ids
  SELECT COUNT(*) INTO v_total FROM public.lessons WHERE course_id = NEW.course_id;
  v_done := COALESCE(array_length(NEW.completed_lesson_ids, 1), 0);
  NEW.total_lessons := v_total;
  NEW.completed_lessons := v_done;
  IF v_total > 0 AND v_done >= v_total THEN
    NEW.is_completed := true;
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  ELSE
    NEW.is_completed := false;
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sanitize_user_course_progress() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sanitize_user_course_progress_ins ON public.course_progress;
DROP TRIGGER IF EXISTS trg_sanitize_user_course_progress_upd ON public.course_progress;
CREATE TRIGGER trg_sanitize_user_course_progress_ins
BEFORE INSERT ON public.course_progress
FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_course_progress();
CREATE TRIGGER trg_sanitize_user_course_progress_upd
BEFORE UPDATE ON public.course_progress
FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_course_progress();
