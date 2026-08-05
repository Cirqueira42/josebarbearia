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
    GREATEST(COALESCE(l.free_services_earned, 0) - COALESCE(l.free_services_redeemed, 0), 0)::int,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.loyalty_rewards r WHERE r.customer_phone = q.p AND r.status = 'active')
        THEN 10
      ELSE (COALESCE(l.total_services, 0) % 10)::int
    END,
    10,
    EXISTS (
      SELECT 1 FROM public.loyalty_rewards r
      WHERE r.customer_phone = q.p AND r.status = 'active'
    )
  FROM (SELECT regexp_replace(_phone, '\D', '', 'g') AS p) q
  LEFT JOIN public.loyalty l ON l.customer_phone = q.p;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_reward(_phone text)
 RETURNS TABLE(code text, discount_amount numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT r.code, r.discount_amount
  FROM public.loyalty_rewards r
  WHERE r.customer_phone = regexp_replace(_phone, '\D', '', 'g')
    AND r.status = 'active'
  ORDER BY r.created_at ASC
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_active_reward(text) TO anon, authenticated;