CREATE OR REPLACE FUNCTION public.create_appointment(
  _service_id uuid,
  _service_name text,
  _customer_name text,
  _customer_phone text,
  _appointment_date date,
  _appointment_time text,
  _barber_id uuid DEFAULT NULL,
  _barber_name text DEFAULT NULL,
  _customer_email text DEFAULT NULL
)
RETURNS TABLE(appointment_id uuid, appointment_number integer, barber_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text;
  rec public.appointments%ROWTYPE;
BEGIN
  p := regexp_replace(coalesce(_customer_phone,''), '\D', '', 'g');

  IF public.is_phone_blocked(p) THEN
    RAISE EXCEPTION 'blocked_customer';
  END IF;

  INSERT INTO public.appointments (
    service_id, service_name, customer_name, customer_email, customer_phone,
    appointment_date, appointment_time, barber_id, barber_name, status, seen_by_admin
  ) VALUES (
    _service_id, _service_name, trim(_customer_name),
    nullif(trim(coalesce(_customer_email,'')),''), p,
    _appointment_date, _appointment_time, _barber_id,
    nullif(trim(coalesce(_barber_name,'')),''), 'pending', false
  )
  RETURNING * INTO rec;

  RETURN QUERY SELECT rec.id, rec.appointment_number, rec.barber_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_appointment(uuid, text, text, text, date, text, uuid, text, text) TO anon, authenticated;