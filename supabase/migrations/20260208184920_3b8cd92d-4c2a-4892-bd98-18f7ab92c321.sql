
-- Create instructor_requests table
CREATE TABLE public.instructor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructor_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own instructor requests"
ON public.instructor_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create their own instructor requests"
ON public.instructor_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all instructor requests"
ON public.instructor_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests
CREATE POLICY "Admins can update instructor requests"
ON public.instructor_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Modify handle_new_user to always assign 'student' role and create instructor request if needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  role_text text;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Always assign student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  -- If user requested instructor role, create a pending request
  role_text := NEW.raw_user_meta_data ->> 'role';
  IF role_text = 'instructor' THEN
    INSERT INTO public.instructor_requests (user_id, status)
    VALUES (NEW.id, 'pending');
  END IF;
  
  RETURN NEW;
END;
$$;
