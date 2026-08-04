-- =====================================================
-- 1. CLIENTES (cadastro inteligente)
-- =====================================================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text NOT NULL,
  email text,
  total_appointments integer NOT NULL DEFAULT 0,
  last_appointment_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_customers_phone ON public.customers (phone);

-- Cadastro/atualização automática do cliente (chamado pelo formulário público)
CREATE OR REPLACE FUNCTION public.upsert_customer(_phone text, _name text, _email text DEFAULT NULL, _date date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p text;
BEGIN
  p := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
  IF p !~ '^[0-9]{10,11}$' THEN RETURN; END IF;
  IF _name IS NULL OR char_length(trim(_name)) < 2 OR char_length(_name) > 100 THEN RETURN; END IF;

  INSERT INTO public.customers (phone, name, email, total_appointments, last_appointment_date)
  VALUES (p, trim(_name), nullif(trim(coalesce(_email,'')),''), 1, coalesce(_date, (now() AT TIME ZONE 'America/Sao_Paulo')::date))
  ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, public.customers.email),
    total_appointments = public.customers.total_appointments + 1,
    last_appointment_date = EXCLUDED.last_appointment_date,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_customer(text, text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_customer(text, text, text, date) TO anon, authenticated;

-- Busca por telefone: agora prioriza a tabela de clientes
CREATE OR REPLACE FUNCTION public.lookup_customer_by_phone(_phone text)
RETURNS TABLE(customer_name text, customer_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.name, c.email
  FROM public.customers c
  WHERE c.phone = regexp_replace(_phone, '\D', '', 'g')
  UNION ALL
  SELECT a.customer_name, a.customer_email
  FROM public.appointments a
  WHERE a.customer_phone = regexp_replace(_phone, '\D', '', 'g')
    AND NOT EXISTS (SELECT 1 FROM public.customers c2 WHERE c2.phone = regexp_replace(_phone, '\D', '', 'g'))
  ORDER BY 1
  LIMIT 1;
$$;

-- =====================================================
-- 2. FIDELIDADE — códigos exclusivos
-- =====================================================
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  customer_name text,
  code text NOT NULL UNIQUE,
  discount_amount numeric NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'active',
  milestone integer NOT NULL DEFAULT 0,
  used_at timestamptz,
  used_appointment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_rewards_status_check CHECK (status IN ('active','used'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_rewards TO authenticated;
GRANT ALL ON public.loyalty_rewards TO service_role;

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loyalty rewards"
  ON public.loyalty_rewards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_loyalty_rewards_phone ON public.loyalty_rewards (customer_phone);

-- Gera códigos que faltam para um cliente (1 código a cada 10 atendimentos concluídos)
CREATE OR REPLACE FUNCTION public.issue_loyalty_rewards(_phone text, _name text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text;
  total int;
  earned int;
  existing int;
  i int;
  new_code text;
BEGIN
  p := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
  IF p = '' THEN RETURN 0; END IF;

  SELECT coalesce(total_services,0) INTO total FROM public.loyalty WHERE customer_phone = p;
  IF total IS NULL THEN RETURN 0; END IF;

  earned := floor(total / 10);
  SELECT count(*) INTO existing FROM public.loyalty_rewards WHERE customer_phone = p;

  i := existing;
  WHILE i < earned LOOP
    i := i + 1;
    LOOP
      new_code := 'JB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.loyalty_rewards WHERE code = new_code);
    END LOOP;
    INSERT INTO public.loyalty_rewards (customer_phone, customer_name, code, milestone)
    VALUES (p, _name, new_code, i * 10);
  END LOOP;

  RETURN earned - existing;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_loyalty_rewards(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_loyalty_rewards(text, text) TO authenticated;

-- Progresso do cliente: nunca expõe o código nem o valor
DROP FUNCTION IF EXISTS public.get_loyalty_progress(text);
CREATE OR REPLACE FUNCTION public.get_loyalty_progress(_phone text)
RETURNS TABLE(
  total_services integer,
  free_services_earned integer,
  free_services_redeemed integer,
  available integer,
  progress integer,
  goal integer,
  has_reward boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(l.total_services, 0)::int,
    COALESCE(l.free_services_earned, 0)::int,
    COALESCE(l.free_services_redeemed, 0)::int,
    GREATEST(COALESCE(l.free_services_earned, 0) - COALESCE(l.free_services_redeemed, 0), 0)::int,
    (COALESCE(l.total_services, 0) % 10)::int,
    10,
    EXISTS (
      SELECT 1 FROM public.loyalty_rewards r
      WHERE r.customer_phone = q.p AND r.status = 'active'
    )
  FROM (SELECT regexp_replace(_phone, '\D', '', 'g') AS p) q
  LEFT JOIN public.loyalty l ON l.customer_phone = q.p;
$$;

-- Resgate do código: valida e bloqueia definitivamente
CREATE OR REPLACE FUNCTION public.redeem_loyalty_code(_phone text, _code text)
RETURNS TABLE(valid boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text;
  r public.loyalty_rewards%ROWTYPE;
BEGIN
  p := regexp_replace(coalesce(_phone,''), '\D', '', 'g');
  SELECT * INTO r FROM public.loyalty_rewards
  WHERE upper(code) = upper(trim(coalesce(_code,''))) AND customer_phone = p;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Código inválido para este telefone'::text; RETURN;
  END IF;
  IF r.status <> 'active' THEN
    RETURN QUERY SELECT false, 'Este código já foi utilizado'::text; RETURN;
  END IF;

  UPDATE public.loyalty_rewards
  SET status = 'used', used_at = now(), updated_at = now()
  WHERE id = r.id;

  UPDATE public.loyalty
  SET free_services_redeemed = free_services_redeemed + 1, updated_at = now()
  WHERE customer_phone = p;

  RETURN QUERY SELECT true, 'Desconto exclusivo aplicado'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_code(text, text) TO anon, authenticated;

-- =====================================================
-- 3. CAIXA — lançamentos e fechamento diário
-- =====================================================
CREATE TABLE public.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  kind text NOT NULL DEFAULT 'in',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  investment_amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'atendimento',
  payment_method text,
  appointment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_entries_kind_check CHECK (kind IN ('in','out'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_entries TO authenticated;
GRANT ALL ON public.cash_entries TO service_role;

ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cash entries"
  ON public.cash_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_cash_entries_date ON public.cash_entries (entry_date);

CREATE TABLE public.daily_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_date date NOT NULL UNIQUE,
  total_in numeric NOT NULL DEFAULT 0,
  total_out numeric NOT NULL DEFAULT 0,
  investment_total numeric NOT NULL DEFAULT 0,
  net_total numeric NOT NULL DEFAULT 0,
  appointments_closed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_closures TO authenticated;
GRANT ALL ON public.daily_closures TO service_role;

ALTER TABLE public.daily_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily closures"
  ON public.daily_closures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_cash_entries_updated BEFORE UPDATE ON public.cash_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_loyalty_rewards_updated BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- 4. HORÁRIO DE FUNCIONAMENTO
-- =====================================================
INSERT INTO public.app_settings (key, value)
VALUES ('business_hours', '{"open":"08:00","lunch_start":"12:00","lunch_end":"13:00","close":"19:00","investment_rule_min":20,"investment_rule_amount":5}'::jsonb)
ON CONFLICT (key) DO NOTHING;
