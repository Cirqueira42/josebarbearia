
-- Tabela para bloquear dias inteiros ou horários específicos
CREATE TABLE public.blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  blocked_time TEXT, -- NULL = dia inteiro bloqueado, valor = horário específico
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked slots"
ON public.blocked_slots FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage blocked slots"
ON public.blocked_slots FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
