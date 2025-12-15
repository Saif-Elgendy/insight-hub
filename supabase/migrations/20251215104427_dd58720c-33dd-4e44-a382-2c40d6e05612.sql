
-- Add user_id column to specialists table to link with auth users
ALTER TABLE public.specialists 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create function to notify specialist on new consultation
CREATE OR REPLACE FUNCTION public.notify_specialist_on_new_consultation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  specialist_user_id uuid;
  patient_name text;
  consultation_type_text text;
BEGIN
  -- Get the specialist's user_id
  SELECT user_id INTO specialist_user_id
  FROM public.specialists
  WHERE id = NEW.specialist_id;
  
  -- Get patient name
  SELECT full_name INTO patient_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Format consultation type
  CASE NEW.consultation_type
    WHEN 'video' THEN consultation_type_text := 'فيديو';
    WHEN 'audio' THEN consultation_type_text := 'صوتية';
    WHEN 'chat' THEN consultation_type_text := 'نصية';
    ELSE consultation_type_text := NEW.consultation_type::text;
  END CASE;
  
  -- Only insert notification if specialist has a linked user account
  IF specialist_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      specialist_user_id,
      'حجز استشارة جديدة!',
      'لديك حجز استشارة ' || consultation_type_text || ' جديدة من ' || COALESCE(patient_name, 'مستخدم'),
      'consultation',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new consultations
DROP TRIGGER IF EXISTS on_new_consultation_notify_specialist ON public.consultations;
CREATE TRIGGER on_new_consultation_notify_specialist
  AFTER INSERT ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_specialist_on_new_consultation();
