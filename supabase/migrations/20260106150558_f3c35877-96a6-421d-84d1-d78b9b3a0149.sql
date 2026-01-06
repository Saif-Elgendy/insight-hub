-- Create notification trigger for enrollment status changes
CREATE OR REPLACE FUNCTION public.notify_student_on_enrollment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_title text;
  status_text text;
  notification_title text;
  notification_message text;
BEGIN
  -- Get course title
  SELECT title INTO course_title
  FROM public.courses
  WHERE id = NEW.course_id;
  
  -- Only trigger on specific status changes
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    notification_title := 'تم تسجيلك في كورس جديد!';
    notification_message := 'تم تسجيلك في كورس "' || COALESCE(course_title, 'غير معروف') || '" - في انتظار تأكيد الدفع';
  ELSIF NEW.status = 'active' AND OLD.status = 'pending' THEN
    notification_title := 'تم تفعيل تسجيلك!';
    notification_message := 'تم تأكيد دفعك وتفعيل تسجيلك في كورس "' || COALESCE(course_title, 'غير معروف') || '"';
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    notification_title := 'تم إلغاء التسجيل';
    notification_message := 'تم إلغاء تسجيلك في كورس "' || COALESCE(course_title, 'غير معروف') || '"';
  ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    notification_title := 'مبروك! أكملت الكورس';
    notification_message := 'لقد أكملت بنجاح كورس "' || COALESCE(course_title, 'غير معروف') || '"';
  ELSE
    RETURN NEW;
  END IF;
  
  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (NEW.user_id, notification_title, notification_message, 'enrollment', NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_enrollment_update ON public.enrollments;

CREATE TRIGGER on_enrollment_update
  AFTER INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_student_on_enrollment_update();

-- Create trigger to notify admins/instructors on new enrollments
CREATE OR REPLACE FUNCTION public.notify_admin_on_new_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  course_title text;
  student_name text;
BEGIN
  -- Only trigger on new pending enrollments
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Get course title
  SELECT title INTO course_title
  FROM public.courses
  WHERE id = NEW.course_id;
  
  -- Get student name
  SELECT full_name INTO student_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Notify all admins
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  SELECT 
    ur.user_id,
    'تسجيل جديد في كورس!',
    'قام ' || COALESCE(student_name, 'مستخدم') || ' بالتسجيل في كورس "' || COALESCE(course_title, 'غير معروف') || '"',
    'enrollment',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'instructor');
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_new_enrollment ON public.enrollments;

CREATE TRIGGER on_new_enrollment
  AFTER INSERT ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_new_enrollment();