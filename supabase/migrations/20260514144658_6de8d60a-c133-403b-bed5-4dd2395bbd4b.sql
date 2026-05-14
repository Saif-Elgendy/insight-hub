
-- 1. Internal allowlist of RPCs callable by authenticated users
CREATE TABLE IF NOT EXISTS private.callable_rpc_allowlist (
  function_name text PRIMARY KEY,
  notes text,
  added_at timestamptz NOT NULL DEFAULT now()
);

-- Reset and seed allowlist
TRUNCATE private.callable_rpc_allowlist;
INSERT INTO private.callable_rpc_allowlist (function_name, notes) VALUES
  ('book_consultation', 'Booking flow RPC; SECURITY DEFINER with auth.uid() check.'),
  ('resubmit_consultant_request', 'Lets a rejected consultant re-submit their own request.');

-- 2. Revoke EXECUTE on every public.* function from PUBLIC, anon, authenticated
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.schema_name, r.func_name, r.args);
  END LOOP;
END$$;

-- 3. Re-grant EXECUTE only on the allowlisted RPCs (all overloads)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN (SELECT function_name FROM private.callable_rpc_allowlist)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
                   r.func_name, r.args);
  END LOOP;
END$$;

-- 4. Verification function: returns any public function executable by 'authenticated'
--    that is NOT in the allowlist. Empty result = compliant.
CREATE OR REPLACE FUNCTION private.audit_callable_rpcs()
RETURNS TABLE(function_name text, arguments text, violation text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_catalog
AS $$
  SELECT p.proname::text,
         pg_get_function_identity_arguments(p.oid)::text,
         'authenticated has EXECUTE but function is not in private.callable_rpc_allowlist'::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND p.proname NOT IN (SELECT function_name FROM private.callable_rpc_allowlist);
$$;

REVOKE ALL ON FUNCTION private.audit_callable_rpcs() FROM PUBLIC, anon, authenticated;

-- 5. Event trigger: warn (NOTICE) when new functions are created in public,
--    reminding maintainers to either add to allowlist or leave EXECUTE revoked.
CREATE OR REPLACE FUNCTION private.warn_on_new_public_function()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
             WHERE schema_name = 'public' AND command_tag IN ('CREATE FUNCTION')
  LOOP
    RAISE NOTICE 'New public function created (%). Ensure it is either added to private.callable_rpc_allowlist or has EXECUTE revoked from authenticated.', obj.object_identity;
  END LOOP;
END$$;

DROP EVENT TRIGGER IF EXISTS warn_on_new_public_function;
CREATE EVENT TRIGGER warn_on_new_public_function
ON ddl_command_end
WHEN TAG IN ('CREATE FUNCTION')
EXECUTE FUNCTION private.warn_on_new_public_function();
