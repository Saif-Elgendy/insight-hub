-- Create specialists table
CREATE TABLE public.specialists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  years_experience INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 5.0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consultation types enum
CREATE TYPE public.consultation_type AS ENUM ('video', 'audio', 'chat');

-- Create consultation status enum
CREATE TYPE public.consultation_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create time slots table
CREATE TABLE public.time_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(specialist_id, slot_date, slot_time)
);

-- Create consultations/bookings table
CREATE TABLE public.consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  consultation_type consultation_type NOT NULL,
  status consultation_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Specialists policies (public read)
CREATE POLICY "Anyone can view specialists"
ON public.specialists FOR SELECT
USING (true);

-- Time slots policies (public read, system update)
CREATE POLICY "Anyone can view available time slots"
ON public.time_slots FOR SELECT
USING (true);

-- Consultations policies
CREATE POLICY "Users can view their own consultations"
ON public.consultations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own consultations"
ON public.consultations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consultations"
ON public.consultations FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_consultations_updated_at
BEFORE UPDATE ON public.consultations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample specialists
INSERT INTO public.specialists (full_name, title, specialty, bio, years_experience, rating) VALUES
('د. سارة أحمد', 'أخصائية نفسية', 'القلق والاكتئاب', 'متخصصة في علاج اضطرابات القلق والاكتئاب مع خبرة واسعة في العلاج المعرفي السلوكي', 8, 4.9),
('د. محمد علي', 'معالج نفسي', 'العلاقات الأسرية', 'خبير في الإرشاد الأسري والعلاقات الزوجية مع نهج متكامل للعلاج', 12, 4.8),
('د. فاطمة حسن', 'أخصائية نفسية', 'الصدمات النفسية', 'متخصصة في علاج الصدمات واضطراب ما بعد الصدمة', 6, 4.7),
('د. أحمد خالد', 'طبيب نفسي', 'اضطرابات النوم', 'متخصص في علاج اضطرابات النوم والأرق المزمن', 10, 4.9);

-- Insert sample time slots for next 7 days
INSERT INTO public.time_slots (specialist_id, slot_date, slot_time)
SELECT 
  s.id,
  current_date + (d || ' days')::interval,
  t::time
FROM public.specialists s
CROSS JOIN generate_series(1, 7) AS d
CROSS JOIN (VALUES ('09:00'), ('10:00'), ('11:00'), ('14:00'), ('15:00'), ('16:00'), ('17:00')) AS times(t)
WHERE s.is_available = true;