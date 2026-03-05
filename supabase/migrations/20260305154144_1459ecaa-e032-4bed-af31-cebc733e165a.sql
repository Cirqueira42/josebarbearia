
-- Create barbers table
CREATE TABLE public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

-- Everyone can view barbers
CREATE POLICY "Anyone can view barbers" ON public.barbers FOR SELECT USING (true);

-- Only admins can manage barbers
CREATE POLICY "Only admins can manage barbers" ON public.barbers FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add barber columns to appointments
ALTER TABLE public.appointments ADD COLUMN barber_id uuid REFERENCES public.barbers(id);
ALTER TABLE public.appointments ADD COLUMN barber_name text;

-- Insert the main barber (José Gilmário)
INSERT INTO public.barbers (name, enabled) VALUES ('José Gilmário', true);

-- Add notification tracking
ALTER TABLE public.appointments ADD COLUMN seen_by_admin boolean NOT NULL DEFAULT false;

-- Enable realtime for barbers
ALTER PUBLICATION supabase_realtime ADD TABLE public.barbers;
