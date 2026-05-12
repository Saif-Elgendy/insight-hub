
-- 1. resource_library: restrict instructor update/delete to own rows
DROP POLICY IF EXISTS "Instructors can delete resources" ON public.resource_library;
DROP POLICY IF EXISTS "Instructors can update resources" ON public.resource_library;

CREATE POLICY "Instructors can delete own resources"
ON public.resource_library FOR DELETE
USING (has_role(auth.uid(), 'instructor'::app_role) AND uploaded_by = auth.uid());

CREATE POLICY "Instructors can update own resources"
ON public.resource_library FOR UPDATE
USING (has_role(auth.uid(), 'instructor'::app_role) AND uploaded_by = auth.uid());

-- 2. specialist_reviews: hide internal moderation fields from non-admins via column-level grants
-- Keep existing broad SELECT policy but revoke direct column access to investigation fields.
REVOKE SELECT (is_under_investigation, investigation_result, investigated_by, investigated_at, reason_details)
ON public.specialist_reviews FROM anon, authenticated;

CREATE OR REPLACE VIEW public.specialist_reviews_public
WITH (security_invoker = true)
AS
SELECT id, specialist_id, user_id, consultation_id, rating, comment, created_at
FROM public.specialist_reviews;

GRANT SELECT ON public.specialist_reviews_public TO anon, authenticated;

-- 3. Storage: restrict instructor delete/update on lesson-videos & course-materials to file owner
DROP POLICY IF EXISTS "Instructors can update lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course materials files" ON storage.objects;

CREATE POLICY "Instructors can update own lesson videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-videos' AND has_role(auth.uid(), 'instructor'::app_role) AND owner = auth.uid());

CREATE POLICY "Instructors can delete own lesson videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-videos' AND has_role(auth.uid(), 'instructor'::app_role) AND owner = auth.uid());

CREATE POLICY "Instructors can delete own course materials files"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-materials' AND has_role(auth.uid(), 'instructor'::app_role) AND owner = auth.uid());

-- 4. Public bucket listing: drop broad SELECT on avatars/course-images (public URLs still work)
DROP POLICY IF EXISTS "Anyone can view course images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- 5. Tighten INSERT policies on log tables to service_role only
DROP POLICY IF EXISTS "Service role can insert activity_logs" ON public.activity_logs;
CREATE POLICY "Service role can insert activity_logs"
ON public.activity_logs FOR INSERT TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert error_logs" ON public.error_logs;
CREATE POLICY "Service role can insert error_logs"
ON public.error_logs FOR INSERT TO service_role
WITH CHECK (true);

-- 6. Lock down EXECUTE on SECURITY DEFINER trigger/service functions
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_expire_consultations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_specialist_on_new_consultation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_on_new_enrollment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_student_on_enrollment_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_student_on_consultation_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_students_on_new_course() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_review_details() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_specialist_completed_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_specialist_reviews_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_specialist_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_course_progress_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_specialist_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_consultant_approval_flow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_consultant_required_documents() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_super_admin_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_super_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_ban_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 7. Move pg_net out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
