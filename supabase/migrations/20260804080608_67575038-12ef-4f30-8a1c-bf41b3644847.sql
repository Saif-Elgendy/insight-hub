DROP POLICY IF EXISTS "Users can update their own consultant documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own consultant documents" ON storage.objects;

CREATE POLICY "Users can update their own consultant documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'consultant-documents' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'consultant-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own consultant documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'consultant-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can view available time slots" ON public.time_slots;
CREATE POLICY "Authenticated users can view available time slots"
ON public.time_slots FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Doctors can insert their time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Doctors can update their time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Doctors can delete their time slots" ON public.time_slots;

CREATE POLICY "Doctors can insert their time slots"
ON public.time_slots FOR INSERT TO authenticated
WITH CHECK (specialist_id IN (SELECT id FROM public.specialists WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can update their time slots"
ON public.time_slots FOR UPDATE TO authenticated
USING (specialist_id IN (SELECT id FROM public.specialists WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can delete their time slots"
ON public.time_slots FOR DELETE TO authenticated
USING (specialist_id IN (SELECT id FROM public.specialists WHERE user_id = auth.uid()));

REVOKE SELECT ON public.time_slots FROM anon;