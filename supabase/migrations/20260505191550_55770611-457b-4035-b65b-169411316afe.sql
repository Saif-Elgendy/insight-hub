-- Enforce mandatory documents at the database level for consultant_requests
CREATE OR REPLACE FUNCTION public.enforce_consultant_required_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Apply only when the request owner is the one performing the update
  -- (skip auto-creation by handle_new_user trigger and admin/super-admin actions)
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    IF NEW.photo_url IS NULL OR length(trim(NEW.photo_url)) = 0 THEN
      RAISE EXCEPTION 'يجب رفع الصورة الشخصية قبل حفظ الطلب';
    END IF;
    IF NEW.id_card_url IS NULL OR length(trim(NEW.id_card_url)) = 0 THEN
      RAISE EXCEPTION 'يجب رفع بطاقة الهوية قبل حفظ الطلب';
    END IF;
    IF NEW.license_url IS NULL OR length(trim(NEW.license_url)) = 0 THEN
      RAISE EXCEPTION 'يجب رفع ترخيص مزاولة المهنة قبل حفظ الطلب';
    END IF;
    IF NEW.certificates_urls IS NULL 
       OR array_length(NEW.certificates_urls, 1) IS NULL 
       OR array_length(NEW.certificates_urls, 1) = 0 THEN
      RAISE EXCEPTION 'يجب رفع الشهادات العلمية قبل حفظ الطلب';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_consultant_required_documents_trigger ON public.consultant_requests;

-- Only on UPDATE so the auto-created empty pending row from handle_new_user is allowed
CREATE TRIGGER enforce_consultant_required_documents_trigger
BEFORE UPDATE ON public.consultant_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_consultant_required_documents();