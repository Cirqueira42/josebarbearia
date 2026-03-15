CREATE POLICY "Anyone can view appointment times for availability"
ON public.appointments
FOR SELECT
TO anon, authenticated
USING (status IN ('pending', 'confirmed'));