-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'course',
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (using service role)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to notify students when a new course is added
CREATE OR REPLACE FUNCTION public.notify_students_on_new_course()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert notification for all students
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  SELECT 
    ur.user_id,
    'كورس جديد متاح!',
    'تم إضافة كورس جديد: ' || NEW.title,
    'course',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role = 'student';
  
  RETURN NEW;
END;
$$;

-- Create trigger for new courses
CREATE TRIGGER on_new_course_notify_students
AFTER INSERT ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.notify_students_on_new_course();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;