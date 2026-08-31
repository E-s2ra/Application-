-- =============================================================================
-- Phase 1: Database & Backend Stabilization
-- =============================================================================
-- Migration: 20260831010000_phase1_database_stabilization.sql
--
-- 1. Fix handle_new_user() trigger:
--    Remove insecure role assignment based on username matching '%admin%' or '%esra%'.
--    Only set role = 'admin' if lower(new.email) = 'esra99san@gmail.com'.
--
-- 2. Consolidate is_admin() function definition:
--    Strict security check requiring both profile role = 'admin' AND approved admin email.
-- =============================================================================

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

  -- Insert profile with mandatory default values
  INSERT INTO public.profiles (
    id,
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

-- Consolidate is_admin() function definition across all policies & RPCs
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    JOIN auth.users ON auth.users.id = profiles.id
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND lower(auth.users.email) = 'esra99san@gmail.com'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
