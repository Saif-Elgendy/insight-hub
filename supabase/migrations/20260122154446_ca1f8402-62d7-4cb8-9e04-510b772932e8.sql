-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Anyone can view available time slots" ON public.time_slots;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view available time slots" 
ON public.time_slots 
FOR SELECT 
USING (auth.role() = 'authenticated');