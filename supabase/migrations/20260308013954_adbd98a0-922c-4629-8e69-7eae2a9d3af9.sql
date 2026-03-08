
-- Drop the broken barber policy - barbers don't have auth user_id mapping
DROP POLICY IF EXISTS "Barbers can view own appointments" ON appointments;
