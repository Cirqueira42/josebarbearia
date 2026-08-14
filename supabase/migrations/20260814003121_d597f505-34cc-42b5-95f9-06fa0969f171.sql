
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 2;

CREATE TABLE IF NOT EXISTS public.product_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  brand text,
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sale_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  cash_entry_id uuid REFERENCES public.cash_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sales TO authenticated;
GRANT ALL ON public.product_sales TO service_role;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage product sales" ON public.product_sales;
CREATE POLICY "Admins can manage product sales" ON public.product_sales
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.monthly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL,
  gross_total numeric NOT NULL DEFAULT 0,
  services_total numeric NOT NULL DEFAULT 0,
  products_total numeric NOT NULL DEFAULT 0,
  out_total numeric NOT NULL DEFAULT 0,
  appointments_count integer NOT NULL DEFAULT 0,
  manual_count integer NOT NULL DEFAULT 0,
  products_qty integer NOT NULL DEFAULT 0,
  unique_clients integer NOT NULL DEFAULT 0,
  visits integer NOT NULL DEFAULT 0,
  ticket_avg numeric NOT NULL DEFAULT 0,
  top_service text,
  top_product text,
  goal numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_summaries TO authenticated;
GRANT ALL ON public.monthly_summaries TO service_role;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage monthly summaries" ON public.monthly_summaries;
CREATE POLICY "Admins can manage monthly summaries" ON public.monthly_summaries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
