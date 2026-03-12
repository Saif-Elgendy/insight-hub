
-- Add consultant to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consultant';

-- Create consultant_requests table
CREATE TABLE public.consultant_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  specialty text NOT NULL,
  bio text,
  years_experience integer DEFAULT 0,
  consultation_price integer DEFAULT 0,
  photo_url text,
  video_url text,
  certificates_urls text[] DEFAULT '{}',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultant_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for consultant_requests
CREATE POLICY "Users can create their own consultant requests"
  ON public.consultant_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own consultant requests"
  ON public.consultant_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all consultant requests"
  ON public.consultant_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update consultant requests"
  ON public.consultant_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own pending requests"
  ON public.consultant_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Add rejection_reason to consultations table for when consultant rejects
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Storage bucket for consultant documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('consultant-documents', 'consultant-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for consultant-documents
CREATE POLICY "Authenticated users can upload consultant documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'consultant-documents');

CREATE POLICY "Anyone can view consultant documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'consultant-documents');

CREATE POLICY "Users can delete own consultant documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'consultant-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Update handle_new_user to support consultant role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- If user requested consultant role, create a pending consultant request
  IF role_text = 'consultant' THEN
    INSERT INTO public.consultant_requests (user_id, status, specialty)
    VALUES (NEW.id, 'pending', COALESCE(NEW.raw_user_meta_data ->> 'specialty', 'غير محدد'));
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function to auto-reject consultations after 2 days
CREATE OR REPLACE FUNCTION public.auto_expire_consultations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark pending consultations as cancelled after 2 days with no response
  UPDATE public.consultations
  SET status = 'cancelled', rejection_reason = 'تم الرفض تلقائياً بسبب عدم الرد خلال يومين'
  WHERE status = 'pending'
    AND created_at < now() - INTERVAL '2 days';
END;
$function$;
