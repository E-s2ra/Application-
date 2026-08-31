-- =============================================================================
-- Migration: 20260831050000_add_email_to_profiles.sql
-- Purpose: Add email column to profiles table and update handle_new_user()
--          so users can log in using either Username or Email.
-- =============================================================================

-- 1. Add email column to profiles table
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill existing profiles from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Add an index for fast username/email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email)
    WHERE email IS NOT NULL;

-- 4. Update handle_new_user() trigger to save new.email to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_theme_id uuid;
  v_default_badge_id uuid;
  v_username text;
  v_role text;
BEGIN
  -- Determine default username
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

  -- Admin role is strictly restricted to the official admin email
  IF lower(coalesce(new.email, '')) = 'esra99san@gmail.com' THEN
    v_role := 'admin';
  ELSE
    v_role := 'user';
  END IF;

  -- Insert profile with mandatory default values (including email)
  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    avatar_url,
    role,
    coins,
    xp,
    level,
    streak_days,
    is_vip,
    vip_expires_at,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    lower(new.email),
    v_username,
    coalesce(new.raw_user_meta_data->>'full_name', v_username),
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    0,
    0,
    1,
    0,
    false,
    null,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = coalesce(public.profiles.email, excluded.email),
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now();

  -- Automatically grant default theme (theme-crimson)
  SELECT id INTO v_default_theme_id FROM public.themes WHERE code = 'theme-crimson' LIMIT 1;
  IF v_default_theme_id IS NOT NULL THEN
    INSERT INTO public.user_themes (user_id, theme_id, unlocked_at)
    VALUES (new.id, v_default_theme_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Automatically grant first stream novice badge (b-novice)
  SELECT id INTO v_default_badge_id FROM public.badges WHERE code = 'b-novice' LIMIT 1;
  IF v_default_badge_id IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, unlocked_at)
    VALUES (new.id, v_default_badge_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
