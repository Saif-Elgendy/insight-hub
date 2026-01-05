-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all user roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any user role
CREATE POLICY "Admins can update any user role"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any user role
CREATE POLICY "Admins can delete any user role"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));