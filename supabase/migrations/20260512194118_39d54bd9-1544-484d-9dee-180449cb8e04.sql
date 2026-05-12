
-- 1) Make buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('consultant-documents', 'lesson-videos', 'course-materials');

-- 2) consultant-documents SELECT policy
DROP POLICY IF EXISTS "Anyone can view consultant documents" ON storage.objects;
CREATE POLICY "Owner or admin can view consultant documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'consultant-documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 3) lesson-videos SELECT policy
DROP POLICY IF EXISTS "Anyone can view lesson videos" ON storage.objects;
CREATE POLICY "Enrolled users or instructors can view lesson videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-videos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.video_url LIKE '%/' || name
        AND l.is_free = true
    )
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.video_url LIKE '%/' || name
        AND c.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.enrollments e ON e.course_id = l.course_id
      WHERE l.video_url LIKE '%/' || name
        AND e.user_id = auth.uid()
        AND e.status = 'active'::enrollment_status
        AND e.deleted_at IS NULL
    )
  )
);

-- 4) course-materials SELECT policy
DROP POLICY IF EXISTS "Anyone can view course materials files" ON storage.objects;
CREATE POLICY "Enrolled users or instructors can view course materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-materials'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    -- Free-form library files (uploaded under library/...) for any authenticated user
    OR (storage.foldername(name))[1] = 'library'
    -- courses/{course_id}/... gated by enrollment or ownership
    OR (
      (storage.foldername(name))[1] = 'courses'
      AND (
        EXISTS (
          SELECT 1 FROM public.courses c
          WHERE c.id = ((storage.foldername(name))[2])::uuid
            AND c.instructor_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.course_id = ((storage.foldername(name))[2])::uuid
            AND e.user_id = auth.uid()
            AND e.status = 'active'::enrollment_status
            AND e.deleted_at IS NULL
        )
      )
    )
  )
);

-- 5) tighten course_materials TABLE select to enrolled/owner/admin
DROP POLICY IF EXISTS "Authenticated users can view course materials" ON public.course_materials;
CREATE POLICY "Enrolled users or instructors can view course materials"
ON public.course_materials
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = course_materials.course_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'::enrollment_status
      AND e.deleted_at IS NULL
  )
);
