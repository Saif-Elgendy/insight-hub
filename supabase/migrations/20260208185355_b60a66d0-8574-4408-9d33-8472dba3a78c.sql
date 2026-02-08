
-- Create a trigger to prevent changing super admin's role
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Protect super admin (super_admin@app.com)
  IF OLD.user_id = '9a48cfb7-03ed-4df4-afc9-67a06d014d77' AND NEW.role != OLD.role THEN
    RAISE EXCEPTION 'Cannot change the super admin role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_super_admin_role_trigger
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_super_admin_role();

-- Also prevent deleting super admin's role
CREATE OR REPLACE FUNCTION public.prevent_super_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.user_id = '9a48cfb7-03ed-4df4-afc9-67a06d014d77' THEN
    RAISE EXCEPTION 'Cannot delete the super admin role';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_super_admin_delete_trigger
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_super_admin_delete();
