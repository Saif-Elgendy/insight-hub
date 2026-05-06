CREATE OR REPLACE FUNCTION public.resubmit_consultant_request()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  UPDATE public.consultant_requests
  SET status = 'pending',
      rejection_reason = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL,
      admin_review_notes = NULL,
      admin_reviewed_at = NULL,
      admin_reviewed_by = NULL,
      super_admin_approved_at = NULL,
      super_admin_approved_by = NULL,
      updated_at = now()
  WHERE user_id = auth.uid()
    AND status = 'rejected'
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'لا يوجد طلب مرفوض لإعادة إرساله';
  END IF;

  RETURN v_id;
END;
$$;