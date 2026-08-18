ALTER TABLE public.loyalty_rewards ADD COLUMN IF NOT EXISTS reserved_appointment_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_rewards_reserved_appt_uidx
  ON public.loyalty_rewards (reserved_appointment_id)
  WHERE reserved_appointment_id IS NOT NULL;

-- Progresso: novo ciclo sempre 0..9, cupom mostrado separadamente
CREATE OR REPLACE FUNCTION public.get_loyalty_progress(_phone text)
 RETURNS TABLE(total_services integer, free_services_earned integer, free_services_redeemed integer, available integer, progress integer, goal integer, has_reward boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(l.total_services, 0)::int,
    COALESCE(l.free_services_earned, 0)::int,
    COALESCE(l.free_services_redeemed, 0)::int,
    (SELECT count(*) FROM public.loyalty_rewards r WHERE r.customer_phone = q.p AND r.status = 'active')::int,
    (COALESCE(l.total_services, 0) % 10)::int,
    10,
    EXISTS (
      SELECT 1 FROM public.loyalty_rewards r
      WHERE r.customer_phone = q.p AND r.status = 'active'
    )
  FROM (SELECT regexp_replace(_phone, '\D', '', 'g') AS p) q
  LEFT JOIN public.loyalty l ON l.customer_phone = q.p;
$function$;

-- Reserva o cupom para um agendamento confirmado (não consome ainda)
CREATE OR REPLACE FUNCTION public.reserve_loyalty_reward(_phone text, _code text, _appointment_id uuid)
 RETURNS TABLE(valid boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p text;
  r public.loyalty_rewards%ROWTYPE;
BEGIN
  p := regexp_replace(coalesce(_phone,''), '\D', '', 'g');

  SELECT * INTO r FROM public.loyalty_rewards
  WHERE customer_phone = p AND upper(code) = upper(trim(coalesce(_code,'')))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Código inválido para este telefone'::text; RETURN;
  END IF;

  IF r.status = 'reserved' AND r.reserved_appointment_id = _appointment_id THEN
    RETURN QUERY SELECT true, 'Benefício já reservado para este agendamento'::text; RETURN;
  END IF;

  IF r.status <> 'active' THEN
    RETURN QUERY SELECT false, 'Este benefício não está disponível'::text; RETURN;
  END IF;

  UPDATE public.loyalty_rewards
  SET status = 'reserved', reserved_appointment_id = _appointment_id, updated_at = now()
  WHERE id = r.id;

  RETURN QUERY SELECT true, 'Benefício reservado para este agendamento'::text;
END;
$function$;

-- Consome definitivamente o cupom quando o atendimento é concluído
CREATE OR REPLACE FUNCTION public.consume_loyalty_reward(_appointment_id uuid)
 RETURNS TABLE(consumed boolean, code text, discount_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.loyalty_rewards%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.loyalty_rewards
  WHERE reserved_appointment_id = _appointment_id AND status = 'reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric; RETURN;
  END IF;

  UPDATE public.loyalty_rewards
  SET status = 'used', used_at = now(), used_appointment_id = _appointment_id, updated_at = now()
  WHERE id = r.id;

  UPDATE public.loyalty
  SET free_services_redeemed = free_services_redeemed + 1, updated_at = now()
  WHERE customer_phone = r.customer_phone;

  RETURN QUERY SELECT true, r.code, r.discount_amount;
END;
$function$;

-- Devolve o cupom se o agendamento for cancelado/excluído antes da conclusão
CREATE OR REPLACE FUNCTION public.release_loyalty_reward(_appointment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN
  UPDATE public.loyalty_rewards
  SET status = 'active', reserved_appointment_id = NULL, updated_at = now()
  WHERE reserved_appointment_id = _appointment_id AND status = 'reserved';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$function$;

-- Cupom reservado/usado em um agendamento (para exibir no painel)
CREATE OR REPLACE FUNCTION public.get_appointment_reward(_appointment_id uuid)
 RETURNS TABLE(code text, discount_amount numeric, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.code, r.discount_amount, r.status
  FROM public.loyalty_rewards r
  WHERE r.reserved_appointment_id = _appointment_id
     OR r.used_appointment_id = _appointment_id
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.reserve_loyalty_reward(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_loyalty_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_loyalty_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_reward(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_loyalty_progress(text) TO anon, authenticated;