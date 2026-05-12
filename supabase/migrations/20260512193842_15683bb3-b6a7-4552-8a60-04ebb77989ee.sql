
-- 1) user_roles: prevent privilege escalation via self-insert
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;
CREATE POLICY "Users can insert their own student role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'student'::app_role);

-- 2) notifications: only service role can insert (triggers use SECURITY DEFINER and bypass RLS)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3) violations: only service role can insert
DROP POLICY IF EXISTS "System can insert violations" ON public.violations;
CREATE POLICY "Service role can insert violations"
ON public.violations
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4) chat-attachments storage: restrict to consultation participants (path: {consultation_id}/...)
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;

CREATE POLICY "Participants can view chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.is_consultation_participant(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);

CREATE POLICY "Participants can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.is_consultation_participant(
    auth.uid(),
    ((storage.foldername(name))[1])::uuid
  )
);
