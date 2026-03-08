
-- 1. Restrict INSERT policy on appointments to enforce status=pending and seen_by_admin=false
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
CREATE POLICY "Anyone can create appointments"
ON appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pending' AND seen_by_admin = false);

-- 2. Secure has_role: revoke EXECUTE from anon and public, only authenticated can call it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
