
-- Create violations table
CREATE TABLE public.violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consultation_id uuid REFERENCES public.consultations(id),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Users can view their own violations
CREATE POLICY "Users can view own violations"
ON public.violations FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all violations
CREATE POLICY "Admins can view all violations"
ON public.violations FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System can insert violations
CREATE POLICY "System can insert violations"
ON public.violations FOR INSERT
WITH CHECK (true);

-- Add is_banned to profiles
ALTER TABLE public.profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;

-- Function to count violations and ban if >= 2
CREATE OR REPLACE FUNCTION public.check_and_ban_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  violation_count integer;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM public.violations
  WHERE user_id = NEW.user_id;

  IF violation_count >= 2 THEN
    UPDATE public.profiles SET is_banned = true WHERE user_id = NEW.user_id;
    
    -- Also mark specialist as unavailable if they are one
    UPDATE public.specialists SET is_available = false WHERE user_id = NEW.user_id;
  END IF;

  -- Send warning notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.user_id,
    CASE WHEN violation_count >= 2 THEN 'تم إيقاف حسابك!' ELSE 'تحذير: مخالفة جديدة' END,
    CASE WHEN violation_count >= 2 
      THEN 'تم إيقاف حسابك بسبب تجاوز الحد الأقصى للمخالفات (2). لا يمكنك استخدام خدمات الاستشارات.'
      ELSE 'لديك مخالفة جديدة بسبب: ' || NEW.reason || '. تحذير: عند وصولك لمخالفتين سيتم إيقاف حسابك.'
    END,
    'violation'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_violation
AFTER INSERT ON public.violations
FOR EACH ROW
EXECUTE FUNCTION public.check_and_ban_user();
