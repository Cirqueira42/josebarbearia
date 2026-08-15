CREATE OR REPLACE FUNCTION public.get_top_product()
RETURNS TABLE(product_id uuid, product_name text, total_qty integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.product_id, s.product_name, SUM(s.qty)::int AS total_qty
  FROM public.product_sales s
  GROUP BY s.product_id, s.product_name
  ORDER BY total_qty DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_product() TO anon, authenticated;