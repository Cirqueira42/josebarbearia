
-- Products table for shop catalog managed via admin
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_path TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  highlight TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
ON public.products FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Only admins can manage products"
ON public.products FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add image column to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_path TEXT;

-- Storage bucket for products
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for service images
INSERT INTO storage.buckets (id, name, public) VALUES ('services', 'services', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for products bucket
CREATE POLICY "Public read products bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Admins manage products bucket"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'products' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'products' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for services bucket
CREATE POLICY "Public read services bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'services');

CREATE POLICY "Admins manage services bucket"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'services' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'services' AND has_role(auth.uid(), 'admin'::app_role));

-- Seed initial products from current hardcoded catalog
INSERT INTO public.products (brand, name, description, price, in_stock, highlight, display_order) VALUES
('Vision Barber Shop', 'Cera Extra Forte', 'Estilizadora de fixação máxima — 250g', 17.99, true, 'Mais Vendida', 1),
('Vision Barber Shop', 'Cera Black', 'Estilizadora preta — 130g', 17.99, true, NULL, 2),
('Vision Barber Shop', 'Cera Matte', 'Acabamento fosco natural — 70g', 11.99, true, NULL, 3),
('Vision Barber Shop', 'Cera Efeito Teia', 'Efeito teia / textura — 70g', 11.99, true, NULL, 4),
('Puro Fio', 'Shampoo Anticaspa', 'Frescor e equilíbrio — 250ml', 19.99, true, NULL, 5),
('DonVitor', 'Óleo para Barba Adrenaline', 'Premium Edition — barba, cabelo e bigode — 30ml', 14.99, true, NULL, 6);
