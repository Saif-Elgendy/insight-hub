
CREATE OR REPLACE FUNCTION public.enforce_super_admin_grants_consultant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_super_admin_id uuid := '9a48cfb7-03ed-4df4-afc9-67a06d014d77';
  v_is_grant boolean := false;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'consultant'::app_role THEN
    v_is_grant := true;
  ELSIF TG_OP = 'UPDATE'
        AND NEW.role = 'consultant'::app_role
        AND OLD.role IS DISTINCT FROM 'consultant'::app_role THEN
    v_is_grant := true;
  END IF;

  IF v_is_grant THEN
    IF auth.uid() IS DISTINCT FROM v_super_admin_id THEN
      RAISE EXCEPTION 'منح دور "استشاري" مسموح للسوبر آدمن فقط';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.consultant_requests cr
      WHERE cr.user_id = NEW.user_id
        AND cr.status = 'approved'
        AND cr.super_admin_approved_at IS NOT NULL
        AND cr.super_admin_approved_by = v_super_admin_id
        AND cr.admin_reviewed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'لا يمكن منح دور الاستشاري بدون طلب معتمد نهائياً من السوبر آدمن';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_super_admin_grants_consultant_ins ON public.user_roles;
DROP TRIGGER IF EXISTS enforce_super_admin_grants_consultant_upd ON public.user_roles;

CREATE TRIGGER enforce_super_admin_grants_consultant_ins
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_grants_consultant();

CREATE TRIGGER enforce_super_admin_grants_consultant_upd
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_grants_consultant();
