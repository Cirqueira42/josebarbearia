CREATE OR REPLACE FUNCTION public.get_reward_by_code(_phone text, _code text)
RETURNS TABLE(code text, discount_amount numeric, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.code, r.discount_amount, r.status
  FROM public.loyalty_rewards r
  WHERE r.customer_phone = regexp_replace(coalesce(_phone,''), '\D', '', 'g')
    AND upper(r.code) = upper(trim(coalesce(_code,'')))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.issue_loyalty_rewards(_phone text, _name text DEFAULT NULL::text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  p text;
  total int;
  earned int;
  existing int;
  i int;
  new_code text;
  val numeric;
BEGIN
  p := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
  IF p = '' THEN RETURN 0; END IF;

  SELECT coalesce(total_services,0) INTO total FROM public.loyalty WHERE customer_phone = p;
  IF total IS NULL THEN RETURN 0; END IF;

  SELECT coalesce((value #>> '{}')::numeric, 7) INTO val
  FROM public.app_settings WHERE key = 'loyalty_reward_value';
  val := coalesce(val, 7);

  earned := floor(total / 10);
  SELECT count(*) INTO existing FROM public.loyalty_rewards WHERE customer_phone = p;

  i := existing;
  WHILE i < earned LOOP
    i := i + 1;
    LOOP
      new_code := 'JB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.loyalty_rewards WHERE code = new_code);
    END LOOP;
    INSERT INTO public.loyalty_rewards (customer_phone, customer_name, code, milestone, discount_amount)
    VALUES (p, _name, new_code, i * 10, val);
  END LOOP;

  RETURN earned - existing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reward_by_code(text, text) TO anon, authenticated;