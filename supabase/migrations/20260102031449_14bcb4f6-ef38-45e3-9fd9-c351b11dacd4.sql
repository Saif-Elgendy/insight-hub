-- Step 1: Drop all dependent policies first
DROP POLICY IF EXISTS "Doctors can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Doctors can update courses" ON public.courses;
DROP POLICY IF EXISTS "Doctors can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Doctors can insert lessons" ON public.lessons;
DROP POLICY IF EXISTS "Doctors can update lessons" ON public.lessons;
DROP POLICY IF EXISTS "Doctors can delete lessons" ON public.lessons;

-- Drop storage policies
DROP POLICY IF EXISTS "Doctors can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can delete course images" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can upload lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can update lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can delete lesson videos" ON storage.objects;

-- Step 2: Drop dependent functions
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Step 3: Drop old column with old type from user_roles
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS role;

-- Step 4: Drop old enum type
DROP TYPE IF EXISTS public.user_role;

-- Step 5: Create new enum with three explicit roles
CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'student');

-- Step 6: Add new role column
ALTER TABLE public.user_roles ADD COLUMN role app_role NOT NULL DEFAULT 'student'::app_role;

-- Step 7: Create security definer functions for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Step 8: Create function to check if user can manage courses (admin or instructor)
CREATE OR REPLACE FUNCTION public.can_manage_courses(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'instructor'::app_role)
  )
$$;

-- Step 9: Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value app_role;
  role_text text;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Get role from metadata
  role_text := NEW.raw_user_meta_data ->> 'role';
  
  -- Map role text to enum (support both old and new naming)
  CASE role_text
    WHEN 'admin' THEN user_role_value := 'admin'::app_role;
    WHEN 'instructor' THEN user_role_value := 'instructor'::app_role;
    WHEN 'doctor' THEN user_role_value := 'instructor'::app_role; -- backward compatibility
    WHEN 'student' THEN user_role_value := 'student'::app_role;
    ELSE user_role_value := 'student'::app_role;
  END CASE;
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role_value);
  
  RETURN NEW;
END;
$$;

-- Step 10: Create explicit RLS policies for courses
-- Admin: Full access
CREATE POLICY "Admins can insert courses"
ON public.courses FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update courses"
ON public.courses FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete courses"
ON public.courses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Instructor: Can create, update, delete courses
CREATE POLICY "Instructors can insert courses"
ON public.courses FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Instructors can update courses"
ON public.courses FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Instructors can delete courses"
ON public.courses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'instructor'::app_role));

-- Step 11: Create explicit RLS policies for lessons
-- Admin: Full access
CREATE POLICY "Admins can insert lessons"
ON public.lessons FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update lessons"
ON public.lessons FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete lessons"
ON public.lessons FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Instructor: Full access to lessons
CREATE POLICY "Instructors can insert lessons"
ON public.lessons FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Instructors can update lessons"
ON public.lessons FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Instructors can delete lessons"
ON public.lessons FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'instructor'::app_role));

-- Step 12: Create storage policies for course images
CREATE POLICY "Admins can upload course images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can upload course images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can update course images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can update course images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can delete course images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can delete course images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-images' AND public.has_role(auth.uid(), 'instructor'::app_role));

-- Step 13: Create storage policies for lesson videos
CREATE POLICY "Admins can upload lesson videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can upload lesson videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can update lesson videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can update lesson videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can delete lesson videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can delete lesson videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(), 'instructor'::app_role));