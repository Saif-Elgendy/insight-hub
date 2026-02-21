
-- Update book_consultation function to accept patient_phone and communication_platform
CREATE OR REPLACE FUNCTION public.book_consultation(
  p_time_slot_id uuid, 
  p_specialist_id uuid, 
  p_consultation_type consultation_type, 
  p_price integer, 
  p_notes text DEFAULT NULL::text,
  p_patient_phone text DEFAULT NULL::text,
  p_communication_platform text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_consultation_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check slot is available and belongs to the specified specialist (with row lock to prevent race conditions)
  IF NOT EXISTS (
    SELECT 1 FROM time_slots
    WHERE id = p_time_slot_id
    AND specialist_id = p_specialist_id
    AND is_booked = false
    FOR UPDATE NOWAIT
  ) THEN
    RAISE EXCEPTION 'Time slot not available or does not belong to the specified specialist';
  END IF;
  
  -- Create consultation record
  INSERT INTO consultations (
    user_id,
    specialist_id,
    time_slot_id,
    consultation_type,
    price,
    notes,
    status,
    patient_phone,
    communication_platform
  )
  VALUES (
    v_user_id,
    p_specialist_id,
    p_time_slot_id,
    p_consultation_type,
    p_price,
    p_notes,
    'pending'::consultation_status,
    p_patient_phone,
    p_communication_platform
  )
  RETURNING id INTO v_consultation_id;
  
  -- Mark time slot as booked
  UPDATE time_slots
  SET is_booked = true
  WHERE id = p_time_slot_id;
  
  RETURN v_consultation_id;
END;
$function$;
