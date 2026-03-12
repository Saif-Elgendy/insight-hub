
CREATE OR REPLACE FUNCTION public.book_consultation(
  p_specialist_id uuid,
  p_consultation_type consultation_type,
  p_price integer,
  p_time_slot_id uuid DEFAULT NULL,
  p_slot_date date DEFAULT NULL,
  p_slot_time time DEFAULT NULL,
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
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- If time_slot_id is provided and exists, use it directly
  IF p_time_slot_id IS NOT NULL AND p_time_slot_id::text NOT LIKE 'generated-%' THEN
    -- Check slot is available (with row lock)
    IF NOT EXISTS (
      SELECT 1 FROM time_slots
      WHERE id = p_time_slot_id
      AND specialist_id = p_specialist_id
      AND is_booked = false
      FOR UPDATE NOWAIT
    ) THEN
      RAISE EXCEPTION 'Time slot not available or does not belong to the specified specialist';
    END IF;
    v_time_slot_id := p_time_slot_id;
  ELSE
    -- Auto-create the time slot using provided date and time
    IF p_slot_date IS NULL OR p_slot_time IS NULL THEN
      RAISE EXCEPTION 'slot_date and slot_time are required when time_slot_id is not provided';
    END IF;

    -- Check if a slot already exists for this specialist/date/time
    SELECT id INTO v_time_slot_id
    FROM time_slots
    WHERE specialist_id = p_specialist_id
      AND slot_date = p_slot_date
      AND slot_time = p_slot_time
    FOR UPDATE NOWAIT;

    IF v_time_slot_id IS NOT NULL THEN
      -- Slot exists, check if booked
      IF EXISTS (SELECT 1 FROM time_slots WHERE id = v_time_slot_id AND is_booked = true) THEN
        RAISE EXCEPTION 'Time slot not available';
      END IF;
    ELSE
      -- Create new time slot
      INSERT INTO time_slots (specialist_id, slot_date, slot_time, is_booked)
      VALUES (p_specialist_id, p_slot_date, p_slot_time, false)
      RETURNING id INTO v_time_slot_id;
    END IF;
  END IF;

  -- Create consultation record
  INSERT INTO consultations (
    user_id, specialist_id, time_slot_id, consultation_type,
    price, notes, status, patient_phone, communication_platform
  )
  VALUES (
    v_user_id, p_specialist_id, v_time_slot_id, p_consultation_type,
    p_price, p_notes, 'pending'::consultation_status,
    p_patient_phone, p_communication_platform
  )
  RETURNING id INTO v_consultation_id;

  -- Mark time slot as booked
  UPDATE time_slots SET is_booked = true WHERE id = v_time_slot_id;

  RETURN v_consultation_id;
END;
$function$;
