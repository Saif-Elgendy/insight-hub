
-- Allow specialists to view consultations assigned to them
CREATE POLICY "Specialists can view their consultations" 
ON public.consultations 
FOR SELECT 
USING (
  specialist_id IN (
    SELECT id FROM public.specialists WHERE user_id = auth.uid()
  )
);

-- Allow specialists to update consultations assigned to them
CREATE POLICY "Specialists can update their consultations" 
ON public.consultations 
FOR UPDATE 
USING (
  specialist_id IN (
    SELECT id FROM public.specialists WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to update time slots (for booking)
CREATE POLICY "Authenticated users can update time slots for booking"
ON public.time_slots
FOR UPDATE
TO authenticated
USING (true);
