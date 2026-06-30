-- 1) enrollments_user_can_self_activate
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.enrollments;

CREATE POLICY "Users can update their own enrollments"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = 'pending'::enrollment_status
  AND deleted_at IS NULL
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'::enrollment_status
  AND paid_at IS NULL
  AND deleted_at IS NULL
  AND deleted_by IS NULL
);

CREATE OR REPLACE FUNCTION private.prevent_enrollment_self_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = auth.uid() THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Users cannot change enrollment status';
    END IF;
    IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
      RAISE EXCEPTION 'Users cannot change payment fields on enrollment';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION private.prevent_enrollment_self_activation() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_enrollment_self_activation ON public.enrollments;
CREATE TRIGGER trg_prevent_enrollment_self_activation
BEFORE UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION private.prevent_enrollment_self_activation();

-- 2) consultant_requests_sensitive_admin_fields_readable
REVOKE SELECT (admin_reviewed_by, super_admin_approved_by, reviewed_by, super_admin_approved_at, admin_reviewed_at, last_save_error, last_save_error_at)
  ON public.consultant_requests
  FROM authenticated, anon;

GRANT SELECT (admin_reviewed_by, super_admin_approved_by, reviewed_by, super_admin_approved_at, admin_reviewed_at, last_save_error, last_save_error_at)
  ON public.consultant_requests
  TO service_role;

-- 3) consultations_patient_phone_exposure
REVOKE SELECT (patient_phone) ON public.consultations FROM authenticated, anon;
GRANT  SELECT (patient_phone) ON public.consultations TO service_role;

CREATE OR REPLACE FUNCTION public.get_consultation_patient_phone(p_consultation_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_phone text;
  v_user_id uuid;
  v_specialist_user_id uuid;
  v_status consultation_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.patient_phone, c.user_id, s.user_id, c.status
    INTO v_phone, v_user_id, v_specialist_user_id, v_status
  FROM public.consultations c
  JOIN public.specialists s ON s.id = c.specialist_id
  WHERE c.id = p_consultation_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_user_id = auth.uid() THEN
    RETURN v_phone;
  END IF;

  IF private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN v_phone;
  END IF;

  IF v_specialist_user_id = auth.uid()
     AND v_status IN ('confirmed'::consultation_status,
                      'in_progress'::consultation_status,
                      'completed'::consultation_status) THEN
    RETURN v_phone;
  END IF;

  RAISE EXCEPTION 'Not authorized to view patient phone';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_consultation_patient_phone(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_consultation_patient_phone(uuid) TO authenticated;

DO $$
BEGIN
  IF to_regclass('private.callable_rpc_allowlist') IS NOT NULL THEN
    BEGIN
      INSERT INTO private.callable_rpc_allowlist (function_name)
      VALUES ('get_consultation_patient_phone')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END$$;

-- 4) specialist_reviews_moderation_columns_readable
DROP POLICY IF EXISTS "Authenticated can view public review fields" ON public.specialist_reviews;

GRANT SELECT ON public.specialist_reviews_public TO authenticated, anon;

COMMENT ON VIEW public.specialist_reviews_public IS
  'Canonical public surface of specialist_reviews; excludes moderation columns. Use this instead of the base table for non-admin reads.';
