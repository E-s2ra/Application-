-- =============================================================================
-- Final security hardening for profiles, privileged RPCs, evidence tables,
-- watch rewards, VIP transaction history, and the private video bucket.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Reassert privileged VIP grant RPCs with server-side authorization.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_grant_vip(
  p_target_user_id uuid,
  p_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_expiry timestamptz;
  v_expiry timestamptz;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required (code: VIP_GRANT_UNAUTHORIZED)';
  END IF;

  IF p_target_user_id IS NULL OR p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN
    RAISE EXCEPTION 'Invalid VIP grant parameters';
  END IF;

  SELECT vip_expires_at
  INTO v_current_expiry
  FROM public.profiles
  WHERE id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile was not found';
  END IF;

  v_expiry := greatest(coalesce(v_current_expiry, now()), now())
    + make_interval(days => p_days);

  UPDATE public.profiles
  SET is_vip = true,
      vip_expires_at = v_expiry,
      updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'user_id', p_target_user_id,
    'is_vip', true,
    'vip_expires_at', v_expiry,
    'duration_days', p_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_vip(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid, integer)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_grant_vip_by_identifier(
  p_target text,
  p_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_user_id uuid;
  v_current_expiry timestamptz;
  v_expiry timestamptz;
  v_target_clean text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required (code: VIP_GRANT_UNAUTHORIZED)';
  END IF;

  IF p_target IS NULL OR p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN
    RAISE EXCEPTION 'Invalid VIP grant parameters';
  END IF;

  v_target_clean := lower(trim(p_target));
  IF v_target_clean = '' THEN
    RAISE EXCEPTION 'Invalid VIP grant target';
  END IF;

  SELECT id
  INTO v_target_user_id
  FROM public.profiles
  WHERE lower(coalesce(email, '')) = v_target_clean
     OR lower(coalesce(username, '')) = v_target_clean
     OR id::text = v_target_clean
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    SELECT u.id
    INTO v_target_user_id
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(coalesce(u.email, '')) = v_target_clean
       OR u.id::text = v_target_clean
    LIMIT 1;
  END IF;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target profile was not found';
  END IF;

  SELECT vip_expires_at
  INTO v_current_expiry
  FROM public.profiles
  WHERE id = v_target_user_id
  FOR UPDATE;

  v_expiry := greatest(coalesce(v_current_expiry, now()), now())
    + make_interval(days => p_days);

  UPDATE public.profiles
  SET is_vip = true,
      vip_expires_at = v_expiry,
      updated_at = now()
  WHERE id = v_target_user_id;

  RETURN jsonb_build_object(
    'user_id', v_target_user_id,
    'is_vip', true,
    'vip_expires_at', v_expiry,
    'duration_days', p_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_vip_by_identifier(text, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip_by_identifier(text, integer)
  TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Profiles: anonymous users only see public identity fields. Authenticated
--    users see their own full row; approved admins may read all rows.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public_minimal" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_restricted" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update_any" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

CREATE POLICY "profiles_select_public_minimal"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own_restricted"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, username, full_name, avatar_url)
  ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (username, full_name, avatar_url, updated_at)
  ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- -----------------------------------------------------------------------------
-- 3. New signups always receive role='user'. Admin promotion is a separate,
--    privileged operation after the account/profile exists.
-- -----------------------------------------------------------------------------
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
BEGIN
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

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
    'user',
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

  SELECT id
  INTO v_default_theme_id
  FROM public.themes
  WHERE code = 'theme-crimson'
  LIMIT 1;

  IF v_default_theme_id IS NOT NULL THEN
    INSERT INTO public.user_themes (user_id, theme_id, unlocked_at)
    VALUES (new.id, v_default_theme_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id
  INTO v_default_badge_id
  FROM public.badges
  WHERE code = 'b-novice'
  LIMIT 1;

  IF v_default_badge_id IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, unlocked_at)
    VALUES (new.id, v_default_badge_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Watch-time XP is disabled for untrusted clients until trusted playback
--    telemetry owns the accounting.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.record_watch_time_reward(integer)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Evidence/entitlement history is read-only to clients. SECURITY DEFINER
--    functions, triggers, and service-role backends remain the only writers.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "daily_logins_insert_own" ON public.daily_logins;
DROP POLICY IF EXISTS "user_themes_insert_own" ON public.user_themes;
DROP POLICY IF EXISTS "user_badges_insert_own" ON public.user_badges;
DROP POLICY IF EXISTS "vip_transactions_insert_own" ON public.vip_transactions;

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.daily_logins, public.user_themes, public.user_badges, public.vip_transactions
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.daily_logins, public.user_themes, public.user_badges, public.vip_transactions
  TO authenticated;
GRANT ALL ON TABLE public.daily_logins, public.user_themes, public.user_badges, public.vip_transactions
  TO service_role;

-- Keep admin VIP history representable. The Edge Function writes this value.
ALTER TABLE public.vip_transactions
  DROP CONSTRAINT IF EXISTS vip_transactions_type_check;
ALTER TABLE public.vip_transactions
  ADD CONSTRAINT vip_transactions_type_check
  CHECK (type IN ('ad_reward', 'coins_purchase', 'spin_reward', 'event_bonus', 'subscription', 'admin_grant'));

-- -----------------------------------------------------------------------------
-- 6. Reassert the coin VIP purchase function so the transaction type matches
--    the table constraint on every deployment.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_vip_with_coins(
  p_days integer,
  p_coin_cost integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_coins integer;
  v_remaining integer;
  v_new_expires timestamptz;
  v_vip_days integer;
  v_actual_cost integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_days <= 0 OR p_days > 365 THEN
    RAISE EXCEPTION 'VIP duration must be between 1 and 365 days';
  END IF;

  v_actual_cost := p_days * 50;

  SELECT coins
  INTO v_current_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_current_coins < v_actual_cost THEN
    RAISE EXCEPTION 'Insufficient coins for VIP activation. Required: %', v_actual_cost;
  END IF;

  UPDATE public.profiles
  SET coins = coins - v_actual_cost,
      is_vip = true,
      vip_expires_at = greatest(coalesce(vip_expires_at, now()), now()) + make_interval(days => p_days),
      updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, vip_expires_at INTO v_remaining, v_new_expires;

  v_vip_days := greatest(0, ceil(extract(epoch FROM (v_new_expires - now())) / 86400.0)::integer);

  INSERT INTO public.vip_transactions (user_id, type, duration, created_at)
  VALUES (v_user_id, 'coins_purchase', p_days, now());

  RETURN json_build_object(
    'success', true,
    'vip_days', v_vip_days,
    'vip_expires_at', v_new_expires,
    'remaining_coins', v_remaining,
    'cost', v_actual_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_vip_with_coins(integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.activate_vip_with_coins(integer, integer)
  TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. Correct the private video bucket in a new migration. Keep it private,
--    cap objects at 50 MiB, and remove direct authenticated write policies so
--    only trusted backend/service-role storage paths can mutate it.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    ) VALUES (
      'videos-private',
      'videos-private',
      false,
      52428800,
      ARRAY['video/mp4', 'application/x-mpegURL', 'application/vnd.apple.mpegurl', 'video/MP2T']
    )
    ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

    DROP POLICY IF EXISTS "video_admin_upload" ON storage.objects;
    DROP POLICY IF EXISTS "video_admin_update" ON storage.objects;
    DROP POLICY IF EXISTS "video_admin_delete" ON storage.objects;
  END IF;
END;
$$;
