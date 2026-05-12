DROP POLICY IF EXISTS "Service role can manage rate_limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate_limits"
ON public.rate_limits
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);