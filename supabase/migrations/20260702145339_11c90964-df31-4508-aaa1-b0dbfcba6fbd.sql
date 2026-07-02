
DROP FUNCTION IF EXISTS public.book_consultation(uuid,uuid,consultation_type,integer,text);
DROP FUNCTION IF EXISTS public.book_consultation(uuid,uuid,consultation_type,integer,text,text,text);
DROP FUNCTION IF EXISTS public.book_consultation(uuid,consultation_type,integer,uuid,date,time,text,text,text);

CREATE FUNCTION public.book_consultation(
  p_specialist_id uuid,
  p_consultation_type consultation_type,
  p_price integer,
  p_time_slot_id uuid DEFAULT NULL,
  p_slot_date date DEFAULT NULL,
  p_slot_time time without time zone DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_patient_phone text DEFAULT NULL,
  p_communication_platform text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_consultation_id UUID;
  v_user_id UUID;
  v_time_slot_id UUID;
  v_price INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  v_price := CASE p_consultation_type
    WHEN 'video'::consultation_type THEN 200
    WHEN 'audio'::consultation_type THEN 150
    WHEN 'chat'::consultation_type  THEN 100
    ELSE NULL
  END;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Invalid consultation type'; END IF;

  IF p_time_slot_id IS NOT NULL AND p_time_slot_id::text NOT LIKE 'generated-%' THEN
    IF NOT EXISTS (
      SELECT 1 FROM time_slots
      WHERE id = p_time_slot_id AND specialist_id = p_specialist_id AND is_booked = false
      FOR UPDATE NOWAIT
    ) THEN
      RAISE EXCEPTION 'Time slot not available';
    END IF;
    v_time_slot_id := p_time_slot_id;
  ELSE
    IF p_slot_date IS NULL OR p_slot_time IS NULL THEN
      RAISE EXCEPTION 'slot_date and slot_time are required';
    END IF;
    SELECT id INTO v_time_slot_id FROM time_slots
    WHERE specialist_id = p_specialist_id AND slot_date = p_slot_date AND slot_time = p_slot_time
    FOR UPDATE NOWAIT;
    IF v_time_slot_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM time_slots WHERE id = v_time_slot_id AND is_booked = true) THEN
        RAISE EXCEPTION 'Time slot not available';
      END IF;
    ELSE
      INSERT INTO time_slots (specialist_id, slot_date, slot_time, is_booked)
      VALUES (p_specialist_id, p_slot_date, p_slot_time, false)
      RETURNING id INTO v_time_slot_id;
    END IF;
  END IF;

  INSERT INTO consultations (
    user_id, specialist_id, time_slot_id, consultation_type,
    price, notes, status, patient_phone, communication_platform
  ) VALUES (
    v_user_id, p_specialist_id, v_time_slot_id, p_consultation_type,
    v_price, p_notes, 'pending'::consultation_status,
    p_patient_phone, p_communication_platform
  ) RETURNING id INTO v_consultation_id;

  UPDATE time_slots SET is_booked = true WHERE id = v_time_slot_id;
  RETURN v_consultation_id;
END;
$function$;

CREATE FUNCTION public.book_consultation(
  p_time_slot_id uuid,
  p_specialist_id uuid,
  p_consultation_type consultation_type,
  p_price integer,
  p_notes text DEFAULT NULL,
  p_patient_phone text DEFAULT NULL,
  p_communication_platform text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.book_consultation(
    p_specialist_id => p_specialist_id,
    p_consultation_type => p_consultation_type,
    p_price => p_price,
    p_time_slot_id => p_time_slot_id,
    p_notes => p_notes,
    p_patient_phone => p_patient_phone,
    p_communication_platform => p_communication_platform
  );
END;
$function$;

-- Prevent patient tampering with consultation
CREATE OR REPLACE FUNCTION private.prevent_consultation_self_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','private'
AS $$
DECLARE
  v_specialist_user uuid;
BEGIN
  IF auth.role() = 'service_role' OR private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_specialist_user FROM public.specialists WHERE id = OLD.specialist_id;

  IF auth.uid() = OLD.user_id AND auth.uid() IS DISTINCT FROM v_specialist_user THEN
    IF NEW.specialist_id IS DISTINCT FROM OLD.specialist_id
       OR NEW.time_slot_id IS DISTINCT FROM OLD.time_slot_id
       OR NEW.price IS DISTINCT FROM OLD.price
       OR NEW.consultation_type IS DISTINCT FROM OLD.consultation_type
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Not allowed to modify consultation core fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status <> 'cancelled'::consultation_status THEN
      RAISE EXCEPTION 'Patients may only cancel their consultation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_consultation_self_tamper ON public.consultations;
CREATE TRIGGER trg_prevent_consultation_self_tamper
BEFORE UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION private.prevent_consultation_self_tamper();

REVOKE EXECUTE ON FUNCTION private.prevent_consultation_self_tamper() FROM PUBLIC;
