CREATE OR REPLACE FUNCTION public.update_specialist_completed_count()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_slot_ts timestamp;
BEGIN
  IF NEW.status = 'completed'::consultation_status
     AND OLD.status = 'confirmed'::consultation_status THEN
    SELECT (slot_date + slot_time) INTO v_slot_ts FROM public.time_slots WHERE id = NEW.time_slot_id;
    IF v_slot_ts IS NOT NULL AND v_slot_ts <= (now() AT TIME ZONE 'Africa/Cairo') THEN
      UPDATE public.specialists
      SET completed_consultations_count = completed_consultations_count + 1
      WHERE id = NEW.specialist_id;
    END IF;
  ELSIF OLD.status = 'completed'::consultation_status
     AND NEW.status IS DISTINCT FROM 'completed'::consultation_status THEN
    UPDATE public.specialists
    SET completed_consultations_count = GREATEST(completed_consultations_count - 1, 0)
    WHERE id = NEW.specialist_id;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.update_specialist_completed_count() FROM PUBLIC, anon, authenticated;