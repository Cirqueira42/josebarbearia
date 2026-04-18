-- 1. Drop the broad public SELECT policy that exposes customer PII
DROP POLICY IF EXISTS "Anyone can view appointment times for availability" ON public.appointments;

-- 2. Public RPC: only returns time/date/duration info needed for slot availability
CREATE OR REPLACE FUNCTION public.get_booked_slots(_date date)
RETURNS TABLE (
  appointment_time text,
  service_name text,
  barber_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.appointment_time, a.service_name, a.barber_id
  FROM public.appointments a
  WHERE a.appointment_date = _date
    AND a.status IN ('pending', 'confirmed');
$$;

GRANT EXECUTE ON FUNCTION public.get_booked_slots(date) TO anon, authenticated;

-- 3. Public RPC: returns customer name/email only for the SPECIFIC phone supplied
CREATE OR REPLACE FUNCTION public.lookup_customer_by_phone(_phone text)
RETURNS TABLE (
  customer_name text,
  customer_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.customer_name, a.customer_email
  FROM public.appointments a
  WHERE a.customer_phone = _phone
  ORDER BY a.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_customer_by_phone(text) TO anon, authenticated;

-- 4. Lock down user_roles: only admins can mutate; explicit deny for non-admins
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Realtime: restrict channel subscriptions to admins only
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can subscribe to realtime" ON realtime.messages;
CREATE POLICY "Admins can subscribe to realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));