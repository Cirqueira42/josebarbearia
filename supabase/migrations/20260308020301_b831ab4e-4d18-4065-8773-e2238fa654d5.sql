
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Admins can view appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
DROP POLICY IF EXISTS "Only admins can update appointments" ON appointments;
DROP POLICY IF EXISTS "Only admins can delete appointments" ON appointments;
DROP POLICY IF EXISTS "Anyone can view barbers" ON barbers;
DROP POLICY IF EXISTS "Only admins can manage barbers" ON barbers;
DROP POLICY IF EXISTS "Anyone can view blocked slots" ON blocked_slots;
DROP POLICY IF EXISTS "Only admins can manage blocked slots" ON blocked_slots;
DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;
DROP POLICY IF EXISTS "Only admins can manage services" ON services;
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;

-- APPOINTMENTS
CREATE POLICY "Admins can view appointments" ON appointments AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create appointments" ON appointments AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending' AND seen_by_admin = false);
CREATE POLICY "Only admins can update appointments" ON appointments AS PERMISSIVE FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete appointments" ON appointments AS PERMISSIVE FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- BARBERS
CREATE POLICY "Anyone can view barbers" ON barbers AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Only admins can manage barbers" ON barbers AS PERMISSIVE FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BLOCKED_SLOTS
CREATE POLICY "Anyone can view blocked slots" ON blocked_slots AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Only admins can manage blocked slots" ON blocked_slots AS PERMISSIVE FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SERVICES
CREATE POLICY "Services are viewable by everyone" ON services AS PERMISSIVE FOR SELECT USING (true);
CREATE POLICY "Only admins can manage services" ON services AS PERMISSIVE FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
CREATE POLICY "Users can read own roles" ON user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
