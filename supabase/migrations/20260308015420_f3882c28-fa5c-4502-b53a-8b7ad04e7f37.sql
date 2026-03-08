
-- Fix ALL policies to be PERMISSIVE instead of RESTRICTIVE

-- APPOINTMENTS
DROP POLICY IF EXISTS "Admins can view appointments" ON appointments;
CREATE POLICY "Admins can view appointments" ON appointments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can create appointments" ON appointments;
CREATE POLICY "Anyone can create appointments" ON appointments FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending' AND seen_by_admin = false);

DROP POLICY IF EXISTS "Only admins can update appointments" ON appointments;
CREATE POLICY "Only admins can update appointments" ON appointments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can delete appointments" ON appointments;
CREATE POLICY "Only admins can delete appointments" ON appointments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- BARBERS
DROP POLICY IF EXISTS "Anyone can view barbers" ON barbers;
CREATE POLICY "Anyone can view barbers" ON barbers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage barbers" ON barbers;
CREATE POLICY "Only admins can manage barbers" ON barbers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BLOCKED_SLOTS
DROP POLICY IF EXISTS "Anyone can view blocked slots" ON blocked_slots;
CREATE POLICY "Anyone can view blocked slots" ON blocked_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage blocked slots" ON blocked_slots;
CREATE POLICY "Only admins can manage blocked slots" ON blocked_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SERVICES
DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;
CREATE POLICY "Services are viewable by everyone" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage services" ON services;
CREATE POLICY "Only admins can manage services" ON services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
DROP POLICY IF EXISTS "Users can read own roles" ON user_roles;
CREATE POLICY "Users can read own roles" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
