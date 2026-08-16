CREATE OR REPLACE FUNCTION public.handle_loyalty_change(_appointment_id uuid, _delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appt_record record;
  other_count integer;
  phone text;
  c_name text;
BEGIN
  -- Get appointment details
  SELECT customer_phone, appointment_date, customer_name, status 
  INTO appt_record 
  FROM public.appointments 
  WHERE id = _appointment_id;
  
  IF NOT FOUND THEN RETURN; END IF;
  
  phone := regexp_replace(appt_record.customer_phone, '\D', '', 'g');
  c_name := appt_record.customer_name;

  -- Check for other completed appointments on the same day
  SELECT count(*) INTO other_count
  FROM public.appointments
  WHERE customer_phone = appt_record.customer_phone
    AND appointment_date = appt_record.appointment_date
    AND status = 'completed'
    AND id != _appointment_id;

  IF _delta > 0 THEN
    -- Only increment if this is the FIRST completed appointment of the day
    IF other_count = 0 THEN
      INSERT INTO public.loyalty (customer_phone, customer_name, total_services, free_services_earned)
      VALUES (phone, c_name, 1, 0)
      ON CONFLICT (customer_phone) DO UPDATE SET
        total_services = public.loyalty.total_services + 1,
        free_services_earned = floor((public.loyalty.total_services + 1) / 10),
        customer_name = coalesce(c_name, public.loyalty.customer_name),
        updated_at = now();
      
      -- Generate rewards if needed
      PERFORM public.issue_loyalty_rewards(phone, c_name);
    END IF;
  ELSIF _delta < 0 THEN
    -- Only decrement if there are NO OTHER completed appointments on that day
    -- and we are reverting a completed one (or it was just changed from completed)
    IF other_count = 0 THEN
      UPDATE public.loyalty
      SET 
        total_services = GREATEST(total_services - 1, 0),
        free_services_earned = floor(GREATEST(total_services - 1, 0) / 10),
        updated_at = now()
      WHERE customer_phone = phone;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_loyalty_change(uuid, integer) TO authenticated;
