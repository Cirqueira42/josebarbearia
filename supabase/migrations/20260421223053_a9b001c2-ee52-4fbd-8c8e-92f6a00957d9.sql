-- ===== GALERIA =====
CREATE TABLE public.gallery_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery photos"
ON public.gallery_photos FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage gallery photos"
ON public.gallery_photos FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Bucket público para fotos da galeria
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true);

CREATE POLICY "Gallery images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Only admins can upload gallery images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update gallery images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete gallery images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery' AND has_role(auth.uid(), 'admin'::app_role));

-- ===== AVALIAÇÕES =====
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating INTEGER NOT NULL,
  comment TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Validação de nota e tamanhos
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF char_length(NEW.customer_name) < 2 OR char_length(NEW.customer_name) > 100 THEN
    RAISE EXCEPTION 'customer_name must be 2-100 characters';
  END IF;
  IF NEW.comment IS NOT NULL AND char_length(NEW.comment) > 500 THEN
    RAISE EXCEPTION 'comment must be 500 characters or less';
  END IF;
  -- Reviews criadas pelo público sempre começam não-aprovadas
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.approved := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_review_trigger
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review();

CREATE POLICY "Anyone can view approved reviews"
ON public.reviews FOR SELECT
USING (approved = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can update reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));