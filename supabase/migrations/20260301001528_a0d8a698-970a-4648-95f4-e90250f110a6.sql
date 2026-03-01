
-- Add duration_minutes to services for time slot blocking
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30;

-- Update existing services with estimated durations
UPDATE public.services SET duration_minutes = 30 WHERE name = 'Corte';
UPDATE public.services SET duration_minutes = 30 WHERE name = 'Barba';
UPDATE public.services SET duration_minutes = 60 WHERE name = 'Corte + Barba';
UPDATE public.services SET duration_minutes = 30 WHERE name = 'Corte Infantil';
UPDATE public.services SET duration_minutes = 15 WHERE name = 'Sobrancelha';
UPDATE public.services SET duration_minutes = 15 WHERE name = 'Pezinho';
