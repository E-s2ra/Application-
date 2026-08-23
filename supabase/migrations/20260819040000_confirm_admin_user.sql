-- Confirm email for admin user admin@aniflix.com and ensure admin role in profiles
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'admin@aniflix.com';

INSERT INTO public.profiles (id, username, full_name, role, coins, xp, level, streak_days, is_vip, created_at, updated_at)
SELECT id, 'esra99san', 'Esra Admin', 'admin', 9999, 9999, 10, 10, true, now(), now()
FROM auth.users
WHERE email = 'admin@aniflix.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Esra Admin', is_vip = true;
