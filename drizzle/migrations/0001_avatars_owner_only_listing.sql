DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Users can view their own avatar objects" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND owner_id = (select auth.uid()::text));