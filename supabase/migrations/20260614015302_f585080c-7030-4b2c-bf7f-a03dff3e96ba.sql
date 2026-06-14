
-- Atualiza identidade (provider email) - a coluna email da auth.users é gerada a partir daqui
UPDATE auth.identities
SET 
  identity_data = jsonb_set(
    jsonb_set(COALESCE(identity_data,'{}'::jsonb), '{email}', '"josegilmario42@gmail.com"'),
    '{email_verified}', 'true'::jsonb
  ),
  updated_at = now()
WHERE user_id = '5e3b981b-3bb1-4c8d-9c95-e1609be9b289'
  AND provider = 'email';

-- Atualiza senha e confirma email
UPDATE auth.users
SET 
  encrypted_password = crypt('102030', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE id = '5e3b981b-3bb1-4c8d-9c95-e1609be9b289';

-- Atualiza o trigger de auto-admin para reconhecer o novo email
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('josegilmario42@gmail.com', 'admin@josebarbearia.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
