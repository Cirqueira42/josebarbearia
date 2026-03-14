
-- Tabela de fidelidade por telefone do cliente
CREATE TABLE public.loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  total_services INTEGER NOT NULL DEFAULT 0,
  free_services_earned INTEGER NOT NULL DEFAULT 0,
  free_services_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_phone)
);

ALTER TABLE public.loyalty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view loyalty" ON loyalty AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage loyalty" ON loyalty AS PERMISSIVE FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view own loyalty" ON loyalty AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

-- Adicionar numeração sequencial aos agendamentos
CREATE SEQUENCE IF NOT EXISTS appointment_number_seq START 1;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_number INTEGER DEFAULT nextval('appointment_number_seq');

-- Adicionar coluna de lembrete enviado
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- Enable realtime para loyalty
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty;

-- Enable pg_cron e pg_net para lembretes agendados
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
