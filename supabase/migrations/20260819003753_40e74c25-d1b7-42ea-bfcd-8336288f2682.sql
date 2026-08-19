
-- 1) Trigger: sempre que a contagem de fidelidade mudar, garante que os cupons reais existam
CREATE OR REPLACE FUNCTION public.trg_issue_loyalty_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.issue_loyalty_rewards(NEW.customer_phone, NEW.customer_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS loyalty_issue_rewards ON public.loyalty;
CREATE TRIGGER loyalty_issue_rewards
AFTER INSERT OR UPDATE OF total_services, free_services_earned ON public.loyalty
FOR EACH ROW EXECUTE FUNCTION public.trg_issue_loyalty_rewards();

-- 2) Reconciliação dos dados existentes
DO $$
DECLARE
  l record;
  to_use int;
BEGIN
  FOR l IN SELECT * FROM public.loyalty LOOP
    PERFORM public.issue_loyalty_rewards(l.customer_phone, l.customer_name);

    -- marca como utilizados a quantidade já resgatada historicamente
    SELECT greatest(
      least(l.free_services_redeemed,
            (SELECT count(*) FROM public.loyalty_rewards r WHERE r.customer_phone = l.customer_phone))
      - (SELECT count(*) FROM public.loyalty_rewards r WHERE r.customer_phone = l.customer_phone AND r.status = 'used'),
      0)
    INTO to_use;

    IF to_use > 0 THEN
      UPDATE public.loyalty_rewards
      SET status = 'used', used_at = coalesce(used_at, now()), updated_at = now()
      WHERE id IN (
        SELECT id FROM public.loyalty_rewards
        WHERE customer_phone = l.customer_phone AND status = 'active'
        ORDER BY created_at ASC
        LIMIT to_use
      );
    END IF;
  END LOOP;
END $$;
