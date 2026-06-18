
-- Only super admin can unban (revert is_banned from true to false)
CREATE OR REPLACE FUNCTION public.enforce_super_admin_unban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid := '9a48cfb7-03ed-4df4-afc9-67a06d014d77';
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;

  -- profiles.is_banned: true -> false requires super admin
  IF TG_TABLE_NAME = 'profiles' THEN
    IF OLD.is_banned IS TRUE AND COALESCE(NEW.is_banned, false) = false THEN
      IF auth.uid() IS DISTINCT FROM v_super_admin_id THEN
        RAISE EXCEPTION 'فك الحظر عن الحساب المُوقف بسبب المخالفات حصراً للمسؤول الأعلى';
      END IF;
    END IF;
  END IF;

  -- specialists: lifting permanent ban or reactivating a banned/suspended specialist
  IF TG_TABLE_NAME = 'specialists' THEN
    IF (OLD.is_permanently_banned IS TRUE AND COALESCE(NEW.is_permanently_banned, false) = false)
       OR (OLD.is_permanently_banned IS TRUE AND OLD.is_available = false AND NEW.is_available = true)
       OR (OLD.suspended_until IS NOT NULL AND OLD.suspended_until > now()
           AND (NEW.suspended_until IS NULL OR NEW.suspended_until <= now() OR NEW.is_available = true)) THEN
      IF auth.uid() IS DISTINCT FROM v_super_admin_id THEN
        RAISE EXCEPTION 'إعادة تفعيل المختص المُوقف بسبب المخالفات حصراً للمسؤول الأعلى';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_unban() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_super_admin_unban_profiles ON public.profiles;
CREATE TRIGGER trg_enforce_super_admin_unban_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_unban();

DROP TRIGGER IF EXISTS trg_enforce_super_admin_unban_specialists ON public.specialists;
CREATE TRIGGER trg_enforce_super_admin_unban_specialists
BEFORE UPDATE ON public.specialists
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_unban();
