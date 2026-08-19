-- Ultra Simple Fix: Updates password and sets Admin role
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Update password for your account to 'E20440891esra@@' and mark email confirmed
UPDATE auth.users
SET 
  encrypted_password = crypt('E20440891esra@@', gen_salt('bf', 10)),
  email_confirmed_at = now()
WHERE email ILIKE '%esra%';

-- 2. Ensure your account has the 'admin' role in profiles
INSERT INTO public.profiles (id, full_name, role)
SELECT id, 'Esra', 'admin'
FROM auth.users
WHERE email ILIKE '%esra%'
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Esra';

-- Also insert deterministic ID for mock admin
INSERT INTO public.profiles (id, full_name, role)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Esra', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Esra';

-- 3. Allow anime to be viewed without login restrictions
GRANT SELECT ON public.anime TO anon, authenticated;
DROP POLICY IF EXISTS "anime_read_all" ON public.anime;
DROP POLICY IF EXISTS "anime_read_authenticated" ON public.anime;
CREATE POLICY "anime_read_all" ON public.anime FOR SELECT TO anon, authenticated USING (true);
