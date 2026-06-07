
-- 1) Review moderation tamper prevention (specialist_reviews)
-- Restrict UPDATE on moderation columns at the privilege level
REVOKE UPDATE ON public.specialist_reviews FROM authenticated;
GRANT UPDATE (rating, comment, reason_details) ON public.specialist_reviews TO authenticated;

-- Also add a defensive trigger guard
CREATE OR REPLACE FUNCTION public.prevent_review_moderation_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.is_under_investigation IS DISTINCT FROM OLD.is_under_investigation
     OR NEW.investigation_result IS DISTINCT FROM OLD.investigation_result
     OR NEW.investigated_by      IS DISTINCT FROM OLD.investigated_by
     OR NEW.investigated_at      IS DISTINCT FROM OLD.investigated_at THEN
    RAISE EXCEPTION 'Not allowed to modify review moderation fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_review_moderation_tamper_trg ON public.specialist_reviews;
CREATE TRIGGER prevent_review_moderation_tamper_trg
BEFORE UPDATE ON public.specialist_reviews
FOR EACH ROW
EXECUTE FUNCTION public.prevent_review_moderation_tamper();

-- 2) Allow signed-in users to read non-moderation review fields via the public view
-- Column-level SELECT grant so only safe columns are readable through RLS
REVOKE SELECT ON public.specialist_reviews FROM authenticated;
GRANT SELECT (id, specialist_id, user_id, consultation_id, rating, comment, created_at)
  ON public.specialist_reviews TO authenticated;

DROP POLICY IF EXISTS "Authenticated can view public review fields" ON public.specialist_reviews;
CREATE POLICY "Authenticated can view public review fields"
ON public.specialist_reviews
FOR SELECT
TO authenticated
USING (true);

-- 3) Storage: course-images — restrict update/delete to file owner (uploader)
DROP POLICY IF EXISTS "Instructors can update course images" ON storage.objects;
CREATE POLICY "Instructors can update own course images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-images'
  AND private.has_role(auth.uid(), 'instructor'::app_role)
  AND owner = auth.uid()
);

DROP POLICY IF EXISTS "Instructors can delete course images" ON storage.objects;
CREATE POLICY "Instructors can delete own course images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-images'
  AND private.has_role(auth.uid(), 'instructor'::app_role)
  AND owner = auth.uid()
);

-- 4) Storage: course-materials — remove unconditional 'library/' public access
DROP POLICY IF EXISTS "Enrolled users or instructors can view course materials" ON storage.objects;
CREATE POLICY "Enrolled users or instructors can view course materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] = 'library'
      AND (
        private.has_role(auth.uid(), 'admin'::app_role)
        OR private.has_role(auth.uid(), 'instructor'::app_role)
      )
    )
    OR (
      (storage.foldername(name))[1] = 'courses'
      AND (
        EXISTS (
          SELECT 1 FROM public.courses c
          WHERE c.id = ((storage.foldername(objects.name))[2])::uuid
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.course_id = ((storage.foldername(objects.name))[2])::uuid
            AND e.user_id = auth.uid()
            AND e.status = 'active'::enrollment_status
            AND e.deleted_at IS NULL
        )
      )
    )
  )
);

-- 5) Realtime channel authorization — deny broadcast/presence by default
-- The app only uses postgres_changes (gated by underlying table RLS), so no
-- legitimate writes to realtime.messages are expected from clients.
DROP POLICY IF EXISTS "Deny realtime broadcast/presence by default" ON realtime.messages;
CREATE POLICY "Deny realtime broadcast/presence by default"
ON realtime.messages
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 6) Function search_path mutable
ALTER FUNCTION private.warn_on_new_public_function() SET search_path = public;
