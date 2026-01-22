-- Drop the public SELECT policy for specialists
DROP POLICY IF EXISTS "Anyone can view specialists" ON public.specialists;

-- Create new policy requiring authentication to view specialists
CREATE POLICY "Authenticated users can view specialists" 
ON public.specialists 
FOR SELECT 
USING (auth.role() = 'authenticated');