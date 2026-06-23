
-- 1) DESPESAS
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 200),
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  category text NOT NULL DEFAULT 'outros',
  expense_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) CLIENTES BLOQUEADOS
CREATE TABLE public.blocked_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL UNIQUE CHECK (customer_phone ~ '^[0-9]{10,11}$'),
  customer_name text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_customers TO authenticated;
GRANT ALL ON public.blocked_customers TO service_role;
ALTER TABLE public.blocked_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage blocked" ON public.blocked_customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Função pública pra verificar se um telefone está bloqueado (usada no agendamento)
CREATE OR REPLACE FUNCTION public.is_phone_blocked(_phone text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.blocked_customers
    WHERE customer_phone = regexp_replace(_phone, '\D', '', 'g')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_phone_blocked(text) TO anon, authenticated;

-- 3) CUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (char_length(code) BETWEEN 3 AND 30),
  discount_percent int NOT NULL DEFAULT 10 CHECK (discount_percent BETWEEN 1 AND 100),
  valid_until date,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Função pública pra validar cupom (sem expor a tabela toda)
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text)
RETURNS TABLE(valid boolean, discount_percent int, message text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(_code);
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Cupom não encontrado'::text; RETURN;
  END IF;
  IF NOT c.active THEN
    RETURN QUERY SELECT false, 0, 'Cupom inativo'::text; RETURN;
  END IF;
  IF c.valid_until IS NOT NULL AND c.valid_until < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RETURN QUERY SELECT false, 0, 'Cupom expirado'::text; RETURN;
  END IF;
  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
    RETURN QUERY SELECT false, 0, 'Cupom esgotado'::text; RETURN;
  END IF;
  RETURN QUERY SELECT true, c.discount_percent, 'Cupom válido'::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO anon, authenticated;

-- 4) COMISSÃO DOS BARBEIROS
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS commission_percent int NOT NULL DEFAULT 50 CHECK (commission_percent BETWEEN 0 AND 100);
