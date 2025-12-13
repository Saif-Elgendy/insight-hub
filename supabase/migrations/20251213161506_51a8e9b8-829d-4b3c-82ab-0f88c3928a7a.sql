-- Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Anyone can view lessons
CREATE POLICY "Anyone can view lessons" 
ON public.lessons 
FOR SELECT 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX idx_lessons_order ON public.lessons(order_index);

-- Insert sample lessons for courses
INSERT INTO public.lessons (course_id, title, description, video_url, duration, order_index, is_free)
SELECT 
  c.id,
  'مقدمة في ' || c.title,
  'تعرف على أساسيات الكورس وما ستتعلمه',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  '10:00',
  1,
  true
FROM public.courses c;

INSERT INTO public.lessons (course_id, title, description, video_url, duration, order_index, is_free)
SELECT 
  c.id,
  'فهم المفاهيم الأساسية',
  'شرح تفصيلي للمفاهيم الأساسية',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  '15:00',
  2,
  false
FROM public.courses c;

INSERT INTO public.lessons (course_id, title, description, video_url, duration, order_index, is_free)
SELECT 
  c.id,
  'تمارين عملية',
  'تطبيق ما تعلمته في تمارين عملية',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  '20:00',
  3,
  false
FROM public.courses c;

INSERT INTO public.lessons (course_id, title, description, video_url, duration, order_index, is_free)
SELECT 
  c.id,
  'الختام والمراجعة',
  'مراجعة شاملة لما تعلمته',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  '12:00',
  4,
  false
FROM public.courses c;