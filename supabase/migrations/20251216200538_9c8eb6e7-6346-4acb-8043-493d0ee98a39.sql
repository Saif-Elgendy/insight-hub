-- Create storage bucket for course images
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Doctors can upload course images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-images' AND
  has_role(auth.uid(), 'doctor'::user_role)
);

-- Allow anyone to view course images (public bucket)
CREATE POLICY "Anyone can view course images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-images');

-- Allow doctors to update their uploaded images
CREATE POLICY "Doctors can update course images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-images' AND has_role(auth.uid(), 'doctor'::user_role));

-- Allow doctors to delete course images
CREATE POLICY "Doctors can delete course images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-images' AND has_role(auth.uid(), 'doctor'::user_role));