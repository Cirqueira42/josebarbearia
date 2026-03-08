
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view appointments" ON appointments;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can view appointments"
ON appointments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also allow the barber view to see their own appointments
CREATE POLICY "Barbers can view own appointments"
ON appointments
FOR SELECT
TO authenticated
USING (
  barber_id IN (
    SELECT id FROM barbers WHERE id = appointments.barber_id
  )
  AND public.has_role(auth.uid(), 'admin') = false
);
