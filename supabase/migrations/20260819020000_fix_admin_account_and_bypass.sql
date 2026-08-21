-- Security: Admin account setup should be done via Supabase Dashboard or Management API
-- IMPORTANT: Do NOT commit passwords to version control
-- To set up an admin account:
-- 1. Create user in Supabase Dashboard with secure password
-- 2. Manually update their profile role to 'admin' in the Supabase Dashboard
-- 3. Never hardcode credentials in migrations

-- This migration now only ensures admin profiles exist with proper structure
-- Actual user creation and role assignment must be done securely via backend

-- Ensure the profiles table enforces admin role constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT check_role_values CHECK (role IN ('user', 'admin'));

-- Allow anime to be viewed without requiring authentication
GRANT SELECT ON public.anime TO anon, authenticated;

-- Clear any broken anime policies and reset them properly
DROP POLICY IF EXISTS "anime_read_all" ON public.anime;
DROP POLICY IF EXISTS "anime_read_authenticated" ON public.anime;
DROP POLICY IF EXISTS "Admins can insert anime" ON public.anime;
DROP POLICY IF EXISTS "Admins can update anime" ON public.anime;
DROP POLICY IF EXISTS "Admins can delete anime" ON public.anime;
