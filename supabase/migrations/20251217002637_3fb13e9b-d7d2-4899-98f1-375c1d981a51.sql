-- Allow doctors to insert their own time slots
CREATE POLICY "Doctors can insert their time slots"
ON public.time_slots FOR INSERT
WITH CHECK (
  specialist_id IN (
    SELECT id FROM public.specialists WHERE user_id = auth.uid()
  )
);

-- Allow doctors to delete their own time slots
CREATE POLICY "Doctors can delete their time slots"
ON public.time_slots FOR DELETE
USING (
  specialist_id IN (
    SELECT id FROM public.specialists WHERE user_id = auth.uid()
  )
);

-- Update the UPDATE policy to be more specific
DROP POLICY IF EXISTS "Authenticated users can update time slots for booking" ON public.time_slots;

-- Allow doctors to update their own time slots
CREATE POLICY "Doctors can update their time slots"
ON public.time_slots FOR UPDATE
USING (
  specialist_id IN (
    SELECT id FROM public.specialists WHERE user_id = auth.uid()
  )
);

-- Allow users to book time slots (update is_booked only)
CREATE POLICY "Users can book available time slots"
ON public.time_slots FOR UPDATE
USING (
  auth.role() = 'authenticated' AND is_booked = false
)
WITH CHECK (
  is_booked = true
);