
-- Add instructor_id to courses table
ALTER TABLE public.courses ADD COLUMN instructor_id uuid;

-- Drop old instructor RLS policies for courses
DROP POLICY IF EXISTS "Instructors can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can update courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can delete courses" ON public.courses;

-- Instructors can only INSERT their own courses
CREATE POLICY "Instructors can insert own courses"
ON public.courses FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_id = auth.uid()
);

-- Instructors can only UPDATE their own courses
CREATE POLICY "Instructors can update own courses"
ON public.courses FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_id = auth.uid()
);

-- Instructors can only DELETE their own courses
CREATE POLICY "Instructors can delete own courses"
ON public.courses FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_id = auth.uid()
);

-- Drop old instructor RLS policies for lessons
DROP POLICY IF EXISTS "Instructors can insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can delete lessons" ON public.lessons;
DROP POLICY IF EXISTS "Instructors can view all lessons" ON public.lessons;

-- Instructors can only manage lessons of their own courses
CREATE POLICY "Instructors can insert own course lessons"
ON public.lessons FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'instructor'::app_role)
  AND course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
);

CREATE POLICY "Instructors can update own course lessons"
ON public.lessons FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
);

CREATE POLICY "Instructors can delete own course lessons"
ON public.lessons FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
);

CREATE POLICY "Instructors can view own course lessons"
ON public.lessons FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
);

-- Drop old instructor RLS policies for course_materials
DROP POLICY IF EXISTS "Instructors can manage course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Instructors can update course materials" ON public.course_materials;
DROP POLICY IF EXISTS "Instructors can delete course materials" ON public.course_materials;

-- Instructors can only manage materials of their own courses
CREATE POLICY "Instructors can insert own course materials"
ON public.course_materials FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'instructor'::app_role)
  AND course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
);

CREATE POLICY "Instructors can update own course materials"
ON public.course_materials FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
);

CREATE POLICY "Instructors can delete own course materials"
ON public.course_materials FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
);

-- Drop old instructor enrollment policy and create scoped one
DROP POLICY IF EXISTS "Instructors can view all enrollments" ON public.enrollments;

CREATE POLICY "Instructors can view own course enrollments"
ON public.enrollments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  AND deleted_at IS NULL
);

-- Also update the combined admin+instructor policy
DROP POLICY IF EXISTS "Admins and instructors can view all enrollments" ON public.enrollments;
