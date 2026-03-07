-- Add validation triggers for appointments table
CREATE OR REPLACE FUNCTION public.validate_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF char_length(NEW.customer_name) > 100 THEN
    RAISE EXCEPTION 'customer_name must be 100 characters or less';
  END IF;
  IF char_length(NEW.customer_name) < 2 THEN
    RAISE EXCEPTION 'customer_name must be at least 2 characters';
  END IF;
  IF NEW.customer_phone !~ '^[0-9]{10,11}$' THEN
    RAISE EXCEPTION 'customer_phone must be 10-11 digits';
  END IF;
  IF NEW.customer_email IS NOT NULL AND NEW.customer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'customer_email must be a valid email address';
  END IF;
  IF NEW.customer_email IS NOT NULL AND char_length(NEW.customer_email) > 255 THEN
    RAISE EXCEPTION 'customer_email must be 255 characters or less';
  END IF;
  IF char_length(NEW.service_name) > 200 THEN
    RAISE EXCEPTION 'service_name must be 200 characters or less';
  END IF;
  IF NEW.barber_name IS NOT NULL AND char_length(NEW.barber_name) > 100 THEN
    RAISE EXCEPTION 'barber_name must be 100 characters or less';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_appointment_trigger
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment();