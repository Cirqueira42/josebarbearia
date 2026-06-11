CREATE OR REPLACE FUNCTION public.get_loyalty_progress(_phone text)
RETURNS TABLE(total_services int, free_services_earned int, free_services_redeemed int, available int, progress int, goal int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(l.total_services, 0)::int AS total_services,
    COALESCE(l.free_services_earned, 0)::int AS free_services_earned,
    COALESCE(l.free_services_redeemed, 0)::int AS free_services_redeemed,
    GREATEST(COALESCE(l.free_services_earned, 0) - COALESCE(l.free_services_redeemed, 0), 0)::int AS available,
    (COALESCE(l.total_services, 0) % 10)::int AS progress,
    10 AS goal
  FROM (SELECT regexp_replace(_phone, '\D', '', 'g') AS p) q
  LEFT JOIN public.loyalty l ON l.customer_phone = q.p;
$$;

GRANT EXECUTE ON FUNCTION public.get_loyalty_progress(text) TO anon, authenticated;