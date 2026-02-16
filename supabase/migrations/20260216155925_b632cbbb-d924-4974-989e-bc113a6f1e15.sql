
-- Create course_materials table for PDFs and attachments linked to lessons
CREATE TABLE public.course_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'video', 'youtube', 'document', 'image'
  file_size BIGINT, -- in bytes, null for youtube links
  youtube_url TEXT, -- for YouTube video links
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resource_library table for general public resources
CREATE TABLE public.resource_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'video', 'youtube', 'document', 'image'
  file_size BIGINT,
  youtube_url TEXT,
  category TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_library ENABLE ROW LEVEL SECURITY;

-- Course materials policies
-- Anyone authenticated can view (access control is via lesson RLS)
CREATE POLICY "Authenticated users can view course materials"
ON public.course_materials FOR SELECT
USING (auth.role() = 'authenticated');

-- Admin and instructor can insert
CREATE POLICY "Admins can manage course materials"
ON public.course_materials FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can manage course materials"
ON public.course_materials FOR INSERT
WITH CHECK (has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can update course materials"
ON public.course_materials FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can update course materials"
ON public.course_materials FOR UPDATE
USING (has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can delete course materials"
ON public.course_materials FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can delete course materials"
ON public.course_materials FOR DELETE
USING (has_role(auth.uid(), 'instructor'::app_role));

-- Resource library policies
-- Anyone authenticated can view
CREATE POLICY "Authenticated users can view resources"
ON public.resource_library FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert resources"
ON public.resource_library FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can insert resources"
ON public.resource_library FOR INSERT
WITH CHECK (has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can update resources"
ON public.resource_library FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can update resources"
ON public.resource_library FOR UPDATE
USING (has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can delete resources"
ON public.resource_library FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can delete resources"
ON public.resource_library FOR DELETE
USING (has_role(auth.uid(), 'instructor'::app_role));

-- Create storage bucket for course materials (PDFs, documents)
INSERT INTO storage.buckets (id, name, public) VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-materials bucket
CREATE POLICY "Anyone can view course materials files"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

CREATE POLICY "Admins can upload course materials files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can upload course materials files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-materials' AND has_role(auth.uid(), 'instructor'::app_role));

CREATE POLICY "Admins can delete course materials files"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can delete course materials files"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-materials' AND has_role(auth.uid(), 'instructor'::app_role));
