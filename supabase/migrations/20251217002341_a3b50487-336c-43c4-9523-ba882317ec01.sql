-- Create storage bucket for lesson videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', true);

-- Allow authenticated doctors to upload videos
CREATE POLICY "Doctors can upload lesson videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-videos' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'doctor')
);

-- Allow authenticated doctors to update their videos
CREATE POLICY "Doctors can update lesson videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'lesson-videos' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'doctor')
);

-- Allow authenticated doctors to delete videos
CREATE POLICY "Doctors can delete lesson videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lesson-videos' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'doctor')
);

-- Allow anyone to view videos
CREATE POLICY "Anyone can view lesson videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos');