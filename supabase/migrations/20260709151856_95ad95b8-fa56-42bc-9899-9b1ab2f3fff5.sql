
CREATE OR REPLACE FUNCTION public.enforce_consultant_required_documents()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_missing text[] := ARRAY[]::text[];
  v_reason text;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    IF NEW.photo_url IS NULL OR length(trim(NEW.photo_url)) = 0 THEN
      v_missing := array_append(v_missing, 'الصورة الشخصية');
    END IF;
    IF NEW.id_card_url IS NULL OR length(trim(NEW.id_card_url)) = 0 THEN
      v_missing := array_append(v_missing, 'بطاقة الهوية');
    END IF;
    IF NEW.license_url IS NULL OR length(trim(NEW.license_url)) = 0 THEN
      v_missing := array_append(v_missing, 'ترخيص مزاولة المهنة');
    END IF;
    IF NEW.certificates_urls IS NULL
       OR array_length(NEW.certificates_urls, 1) IS NULL
       OR array_length(NEW.certificates_urls, 1) = 0 THEN
      v_missing := array_append(v_missing, 'الشهادات العلمية');
    END IF;

    IF array_length(v_missing, 1) IS NOT NULL THEN
      -- Record missing docs as a soft note; DO NOT block the save.
      v_reason := 'المستندات الناقصة: ' || array_to_string(v_missing, '، ');
      NEW.last_save_error := v_reason;
      NEW.last_save_error_at := now();
    ELSE
      NEW.last_save_error := NULL;
      NEW.last_save_error_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
