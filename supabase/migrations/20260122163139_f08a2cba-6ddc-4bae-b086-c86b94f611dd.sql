-- Keep courses publicly viewable for marketing (no change needed)
-- But restrict lessons based on enrollment status

-- Drop the overly permissive lessons policy
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;

-- Create policy for free lessons (anyone can view)
CREATE POLICY "Anyone can view free lessons" 
ON public.lessons 
FOR SELECT 
USING (is_free = true);

-- Create policy for paid lessons (only enrolled users with active status)
CREATE POLICY "Enrolled users can view paid lessons" 
ON public.lessons 
FOR SELECT 
USING (
  is_free = false 
  AND EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.course_id = lessons.course_id
    AND enrollments.user_id = auth.uid()
    AND enrollments.status = 'active'
    AND enrollments.deleted_at IS NULL
  )
);

-- Admins and instructors can always view all lessons (for management)
CREATE POLICY "Admins can view all lessons" 
ON public.lessons 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can view all lessons" 
ON public.lessons 
FOR SELECT 
USING (has_role(auth.uid(), 'instructor'::app_role));