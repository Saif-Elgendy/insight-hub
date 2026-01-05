-- Create enrollment status enum
CREATE TYPE public.enrollment_status AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- Create enrollments table
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "Users can view their own enrollments"
ON public.enrollments
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own enrollments
CREATE POLICY "Users can create their own enrollments"
ON public.enrollments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollments (e.g., cancel)
CREATE POLICY "Users can update their own enrollments"
ON public.enrollments
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments"
ON public.enrollments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update any enrollment
CREATE POLICY "Admins can update any enrollment"
ON public.enrollments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Instructors can view all enrollments
CREATE POLICY "Instructors can view all enrollments"
ON public.enrollments
FOR SELECT
USING (has_role(auth.uid(), 'instructor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();