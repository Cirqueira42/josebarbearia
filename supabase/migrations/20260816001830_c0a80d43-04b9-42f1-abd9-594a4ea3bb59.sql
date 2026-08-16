CREATE OR REPLACE FUNCTION public.handle_loyalty_change(_appointment_id uuid, _delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appt_record record;
  normalized_phone text;
  other_eligible_count integer;
  service_price numeric;
  rewards_issued integer := 0;
BEGIN
  SELECT a.customer_phone, a.appointment_date, a.customer_name, a.status, a.service_name
  INTO appt_record
  FROM public.appointments a
  WHERE a.id = _appointment_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  normalized_phone := regexp_replace(coalesce(appt_record.customer_phone, ''), '\D', '', 'g');
  IF normalized_phone = '' THEN
    RETURN 0;
  END IF;

  SELECT coalesce(s.price, 0)
  INTO service_price
  FROM public.services s
  WHERE lower(s.name) = lower(appt_record.service_name)
  ORDER BY s.created_at DESC
  LIMIT 1;

  service_price := coalesce(service_price, 0);
  IF service_price < 30 THEN
    RETURN 0;
  END IF;

  SELECT count(*)
  INTO other_eligible_count
  FROM public.appointments a
  JOIN public.services s ON lower(s.name) = lower(a.service_name)
  WHERE regexp_replace(coalesce(a.customer_phone, ''), '\D', '', 'g') = normalized_phone
    AND a.appointment_date = appt_record.appointment_date
    AND a.status = 'completed'
    AND s.price >= 30
    AND a.id <> _appointment_id;

  IF _delta > 0 THEN
    IF appt_record.status <> 'completed' OR other_eligible_count > 0 THEN
      RETURN 0;
    END IF;

    INSERT INTO public.loyalty (customer_phone, customer_name, total_services, free_services_earned)
    VALUES (normalized_phone, appt_record.customer_name, 1, 0)
    ON CONFLICT (customer_phone) DO UPDATE SET
      total_services = public.loyalty.total_services + 1,
      free_services_earned = floor((public.loyalty.total_services + 1) / 10),
      customer_name = coalesce(appt_record.customer_name, public.loyalty.customer_name),
      updated_at = now();

    rewards_issued := public.issue_loyalty_rewards(normalized_phone, appt_record.customer_name);
    RETURN coalesce(rewards_issued, 0);
  END IF;

  IF _delta < 0 AND other_eligible_count = 0 THEN
    UPDATE public.loyalty
    SET total_services = greatest(total_services - 1, 0),
        free_services_earned = floor(greatest(total_services - 1, 0) / 10),
        updated_at = now()
    WHERE customer_phone = normalized_phone;
  END IF;

  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_loyalty_change(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_loyalty_change(uuid, integer) TO service_role;