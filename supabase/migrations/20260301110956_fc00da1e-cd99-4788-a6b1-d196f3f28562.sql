
-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check if user is part of a consultation
CREATE OR REPLACE FUNCTION public.is_consultation_participant(_user_id uuid, _consultation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = _consultation_id
    AND (
      c.user_id = _user_id
      OR c.specialist_id IN (
        SELECT s.id FROM public.specialists s WHERE s.user_id = _user_id
      )
    )
  )
$$;

-- RLS: participants can view messages
CREATE POLICY "Participants can view chat messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (public.is_consultation_participant(auth.uid(), consultation_id));

-- RLS: participants can send messages
CREATE POLICY "Participants can send chat messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_consultation_participant(auth.uid(), consultation_id)
);

-- RLS: participants can update (mark as read)
CREATE POLICY "Participants can update chat messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (public.is_consultation_participant(auth.uid(), consultation_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create chat-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Storage RLS: consultation participants can view
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

-- Index for fast message lookup
CREATE INDEX idx_chat_messages_consultation_id ON public.chat_messages(consultation_id, created_at);
