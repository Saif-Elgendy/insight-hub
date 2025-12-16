-- Create function to notify student on consultation status change
CREATE OR REPLACE FUNCTION public.notify_student_on_consultation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  specialist_name text;
  status_text text;
  notification_title text;
BEGIN
  -- Only trigger on status change to confirmed or cancelled
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('confirmed', 'cancelled') THEN
    -- Get specialist name
    SELECT full_name INTO specialist_name
    FROM public.specialists
    WHERE id = NEW.specialist_id;
    
    -- Format status text
    CASE NEW.status
      WHEN 'confirmed' THEN 
        status_text := 'تم تأكيد';
        notification_title := 'تم تأكيد استشارتك!';
      WHEN 'cancelled' THEN 
        status_text := 'تم إلغاء';
        notification_title := 'تم إلغاء استشارتك';
    END CASE;
    
    -- Insert notification for the student
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      NEW.user_id,
      notification_title,
      status_text || ' استشارتك مع ' || COALESCE(specialist_name, 'المختص'),
      'consultation',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for consultation status updates
DROP TRIGGER IF EXISTS on_consultation_status_update ON public.consultations;
CREATE TRIGGER on_consultation_status_update
AFTER UPDATE ON public.consultations
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_on_consultation_update();