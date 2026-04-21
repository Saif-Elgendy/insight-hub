-- 1) Trigger function: when a consultant_request is approved, ensure a specialists row exists
CREATE OR REPLACE FUNCTION public.sync_specialist_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  -- Only act when status transitions to 'approved'
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT COALESCE(full_name, 'استشاري') INTO v_full_name
    FROM public.profiles
    WHERE user_id = NEW.user_id;

    IF EXISTS (SELECT 1 FROM public.specialists WHERE user_id = NEW.user_id) THEN
      UPDATE public.specialists
      SET full_name = COALESCE(v_full_name, full_name),
          specialty = NEW.specialty,
          bio = COALESCE(NEW.bio, bio),
          years_experience = COALESCE(NEW.years_experience, years_experience),
          image_url = COALESCE(NEW.photo_url, image_url),
          is_available = true
      WHERE user_id = NEW.user_id;
    ELSE
      INSERT INTO public.specialists (
        user_id, full_name, title, specialty, bio,
        years_experience, image_url, is_available
      ) VALUES (
        NEW.user_id,
        COALESCE(v_full_name, 'استشاري'),
        'استشاري',
        NEW.specialty,
        NEW.bio,
        COALESCE(NEW.years_experience, 0),
        NEW.photo_url,
        true
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_specialist_on_approval_trigger ON public.consultant_requests;
CREATE TRIGGER sync_specialist_on_approval_trigger
AFTER INSERT OR UPDATE ON public.consultant_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_specialist_on_approval();

-- 2) Backfill: insert specialists rows for already-approved consultants that are missing
INSERT INTO public.specialists (user_id, full_name, title, specialty, bio, years_experience, image_url, is_available)
SELECT
  cr.user_id,
  COALESCE(p.full_name, 'استشاري'),
  'استشاري',
  cr.specialty,
  cr.bio,
  COALESCE(cr.years_experience, 0),
  cr.photo_url,
  true
FROM public.consultant_requests cr
LEFT JOIN public.profiles p ON p.user_id = cr.user_id
LEFT JOIN public.specialists s ON s.user_id = cr.user_id
WHERE cr.status = 'approved' AND s.id IS NULL;