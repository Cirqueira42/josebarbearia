CREATE TABLE public.hero_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_backgrounds TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_backgrounds TO authenticated;
GRANT ALL ON public.hero_backgrounds TO service_role;
ALTER TABLE public.hero_backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view hero backgrounds" ON public.hero_backgrounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Only admins can manage hero backgrounds" ON public.hero_backgrounds FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;