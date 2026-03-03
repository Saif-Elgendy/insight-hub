
-- Add public profile toggle to profiles
ALTER TABLE public.profiles ADD COLUMN is_public_profile boolean NOT NULL DEFAULT false;

-- Drop existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Instructors can view all profiles (for seeing their students)
CREATE POLICY "Instructors can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'instructor'));

-- Students can view other public profiles
CREATE POLICY "Students can view public profiles"
ON public.profiles FOR SELECT
USING (is_public_profile = true AND auth.role() = 'authenticated');
