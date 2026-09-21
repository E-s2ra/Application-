-- =============================================================================
-- Secure coin entitlements and verified rewarded-ad credits
-- =============================================================================
-- This migration introduces server-owned media entitlements and rewarded-ad
-- verification state. It also closes legacy client-write paths into the coin
-- economy without modifying prior migrations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Media entitlements: server-owned, user-readable, 7-day expiry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anime_id uuid NOT NULL REFERENCES public.anime(id) ON DELETE CASCADE,
  episode integer,
  unlock_key text NOT NULL,
  cost_coins integer NOT NULL CHECK (cost_coins > 0),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_entitlements_episode_positive CHECK (episode IS NULL OR episode > 0),
  CONSTRAINT media_entitlements_user_unlock_unique UNIQUE (user_id, unlock_key)
);

CREATE INDEX IF NOT EXISTS idx_media_entitlements_user_expires
  ON public.media_entitlements (user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_entitlements_media
  ON public.media_entitlements (anime_id, episode);

ALTER TABLE public.media_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_entitlements_select_own" ON public.media_entitlements;
CREATE POLICY "media_entitlements_select_own"
  ON public.media_entitlements
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.media_entitlements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.media_entitlements TO authenticated;
GRANT ALL ON TABLE public.media_entitlements TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Strict server-derived media unlock
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_media_with_coins_v2(
  p_media_id uuid,
  p_episode integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_category text;
  v_episode_count integer;
  v_registry_category text;
  v_cost integer;
  v_unlock_key text;
  v_current_coins integer;
  v_remaining_coins integer;
  v_existing_expires timestamptz;
  v_existing_unlocked_at timestamptz;
  v_expires_at timestamptz;
  v_is_movie boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT category, episodes
  INTO v_category, v_episode_count
  FROM public.anime
  WHERE id = p_media_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media not found';
  END IF;

  v_episode_count := GREATEST(COALESCE(v_episode_count, 1), 1);
  v_is_movie := v_category IN ('Movies', 'Anime Movies');

  IF v_is_movie THEN
    IF p_episode IS NOT NULL THEN
      RAISE EXCEPTION 'Movies do not accept an episode number';
    END IF;
    v_unlock_key := p_media_id::text;
  ELSE
    IF p_episode IS NULL THEN
      RAISE EXCEPTION 'Episode number is required for episodic media';
    END IF;
    IF p_episode < 1 OR p_episode > v_episode_count THEN
      RAISE EXCEPTION 'Episode % is outside the valid range 1-%', p_episode, v_episode_count;
    END IF;
    v_unlock_key := p_media_id::text || '_ep_' || p_episode::text;
  END IF;

  -- Normalize only from the catalog value. The client never supplies category.
  v_registry_category := CASE
    WHEN v_category = 'Anime Movies' THEN 'Anime Movies'
    WHEN v_category = 'Movies' THEN 'Movies'
    WHEN v_category IN ('K-Drama', 'Drama') THEN v_category
    WHEN v_category IN ('Anime', 'Anime Series') THEN 'Anime'
    ELSE NULL
  END;

  IF v_registry_category IS NULL THEN
    RAISE EXCEPTION 'Unsupported media category: %', v_category;
  END IF;

  SELECT cost_coins
  INTO v_cost
  FROM public.content_cost_registry
  WHERE category = v_registry_category;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'No valid server price is configured for category %', v_registry_category;
  END IF;

  -- Serialize all spend operations for this user before entitlement/balance checks.
  SELECT coins
  INTO v_current_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT expires_at, unlocked_at
  INTO v_existing_expires, v_existing_unlocked_at
  FROM public.media_entitlements
  WHERE user_id = v_user_id
    AND unlock_key = v_unlock_key
  FOR UPDATE;

  IF v_existing_expires IS NOT NULL AND v_existing_expires > now() THEN
    RETURN json_build_object(
      'success', true,
      'already_unlocked', true,
      'unlock_key', v_unlock_key,
      'cost', 0,
      'balance', v_current_coins,
      'remaining_coins', v_current_coins,
      'unlocked_at', v_existing_unlocked_at,
      'expires_at', v_existing_expires
    );
  END IF;

  IF v_current_coins < v_cost THEN
    RAISE EXCEPTION 'Insufficient coins (have: %, need: %)', v_current_coins, v_cost;
  END IF;

  v_expires_at := now() + interval '7 days';

  UPDATE public.profiles
  SET coins = coins - v_cost,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_remaining_coins;

  INSERT INTO public.media_entitlements (
    user_id,
    anime_id,
    episode,
    unlock_key,
    cost_coins,
    unlocked_at,
    expires_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_media_id,
    p_episode,
    v_unlock_key,
    v_cost,
    now(),
    v_expires_at,
    now(),
    now()
  )
  ON CONFLICT (user_id, unlock_key)
  DO UPDATE SET
    anime_id = EXCLUDED.anime_id,
    episode = EXCLUDED.episode,
    cost_coins = EXCLUDED.cost_coins,
    unlocked_at = EXCLUDED.unlocked_at,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();

  RETURN json_build_object(
    'success', true,
    'already_unlocked', false,
    'unlock_key', v_unlock_key,
    'cost', v_cost,
    'balance', v_remaining_coins,
    'remaining_coins', v_remaining_coins,
    'unlocked_at', now(),
    'expires_at', v_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_media_with_coins_v2(uuid, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_media_with_coins_v2(uuid, integer)
  TO authenticated, service_role;

-- Disable both legacy unlock signatures for untrusted clients.
REVOKE ALL ON FUNCTION public.unlock_media_with_coins(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unlock_media_with_coins(text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_media_with_coins(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlock_media_with_coins(text, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Rewarded-ad verification sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rewarded_ad_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_unit_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'credited', 'expired', 'rejected')),
  verified_transaction_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  credited_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewarded_ad_sessions_user_status
  ON public.rewarded_ad_sessions (user_id, status, expires_at DESC);

ALTER TABLE public.rewarded_ad_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rewarded_ad_sessions_select_own" ON public.rewarded_ad_sessions;
CREATE POLICY "rewarded_ad_sessions_select_own"
  ON public.rewarded_ad_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.rewarded_ad_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.rewarded_ad_sessions TO authenticated;
GRANT ALL ON TABLE public.rewarded_ad_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.create_rewarded_ad_session(p_ad_unit_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_vip boolean;
  v_vip_expires_at timestamptz;
  v_pending_count integer;
  v_session_id uuid;
  v_expires_at timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_ad_unit_id IS NULL OR length(btrim(p_ad_unit_id)) < 3 OR length(p_ad_unit_id) > 200 THEN
    RAISE EXCEPTION 'Invalid ad unit id';
  END IF;

  SELECT is_vip, vip_expires_at
  INTO v_is_vip, v_vip_expires_at
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF COALESCE(v_is_vip, false)
     AND (v_vip_expires_at IS NULL OR v_vip_expires_at > now()) THEN
    RAISE EXCEPTION 'Active VIP accounts are not eligible for rewarded-ad coins';
  END IF;

  UPDATE public.rewarded_ad_sessions
  SET status = 'expired',
      updated_at = now()
  WHERE user_id = v_user_id
    AND status = 'pending'
    AND expires_at <= now();

  SELECT count(*)
  INTO v_pending_count
  FROM public.rewarded_ad_sessions
  WHERE user_id = v_user_id
    AND status = 'pending'
    AND expires_at > now();

  IF v_pending_count >= 3 THEN
    RAISE EXCEPTION 'Too many pending rewarded-ad sessions';
  END IF;

  v_session_id := gen_random_uuid();
  v_expires_at := now() + interval '15 minutes';

  INSERT INTO public.rewarded_ad_sessions (
    id, user_id, ad_unit_id, status, created_at, expires_at, updated_at
  )
  VALUES (
    v_session_id, v_user_id, btrim(p_ad_unit_id), 'pending', now(), v_expires_at, now()
  );

  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'session_token', v_session_id,
    'expires_at', v_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_rewarded_ad_session(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_rewarded_ad_session(text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.credit_verified_rewarded_ad(
  p_session_id uuid,
  p_transaction_id text,
  p_ad_unit_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.rewarded_ad_sessions%ROWTYPE;
  v_existing_session public.rewarded_ad_sessions%ROWTYPE;
  v_reward_coins integer := 12;
  v_reward_xp integer := 50;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  -- Defense in depth in addition to EXECUTE privileges.
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  IF p_transaction_id IS NULL
     OR length(btrim(p_transaction_id)) < 6
     OR length(p_transaction_id) > 255 THEN
    RAISE EXCEPTION 'Invalid rewarded-ad transaction id';
  END IF;

  SELECT *
  INTO v_session
  FROM public.rewarded_ad_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rewarded-ad session not found';
  END IF;

  IF v_session.status = 'credited' THEN
    IF v_session.verified_transaction_id = btrim(p_transaction_id) THEN
      SELECT coins, xp, level
      INTO v_new_coins, v_new_xp, v_new_level
      FROM public.profiles
      WHERE id = v_session.user_id;

      RETURN json_build_object(
        'success', true,
        'idempotent', true,
        'session_id', v_session.id,
        'transaction_id', v_session.verified_transaction_id,
        'reward_coins', v_reward_coins,
        'reward_xp', v_reward_xp,
        'new_coins', v_new_coins,
        'new_xp', v_new_xp,
        'new_level', v_new_level
      );
    END IF;
    RAISE EXCEPTION 'Rewarded-ad session was already credited';
  END IF;

  IF v_session.status <> 'pending' THEN
    RAISE EXCEPTION 'Rewarded-ad session is not pending';
  END IF;

  IF v_session.expires_at <= now() THEN
    UPDATE public.rewarded_ad_sessions
    SET status = 'expired',
        updated_at = now()
    WHERE id = v_session.id;
    RETURN json_build_object(
      'success', false,
      'reason', 'session_expired',
      'session_id', v_session.id
    );
  END IF;

  IF p_ad_unit_id IS NOT NULL
     AND btrim(p_ad_unit_id) <> v_session.ad_unit_id
     AND btrim(p_ad_unit_id) <> split_part(v_session.ad_unit_id, '/', 2) THEN
    RAISE EXCEPTION 'Ad unit does not match session';
  END IF;

  SELECT *
  INTO v_existing_session
  FROM public.rewarded_ad_sessions
  WHERE verified_transaction_id = btrim(p_transaction_id)
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_session.id = v_session.id
       AND v_existing_session.status = 'credited' THEN
      SELECT coins, xp, level
      INTO v_new_coins, v_new_xp, v_new_level
      FROM public.profiles
      WHERE id = v_session.user_id;

      RETURN json_build_object(
        'success', true,
        'idempotent', true,
        'session_id', v_session.id,
        'transaction_id', v_existing_session.verified_transaction_id,
        'reward_coins', v_reward_coins,
        'reward_xp', v_reward_xp,
        'new_coins', v_new_coins,
        'new_xp', v_new_xp,
        'new_level', v_new_level
      );
    END IF;
    RAISE EXCEPTION 'Rewarded-ad transaction was already consumed';
  END IF;

  -- Lock the profile after locking the session so concurrent verified callbacks
  -- for the same user serialize balance mutations.
  PERFORM 1
  FROM public.profiles
  WHERE id = v_session.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Re-check VIP at credit time as eligibility may have changed since creation.
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_session.user_id
      AND is_vip = true
      AND (vip_expires_at IS NULL OR vip_expires_at > now())
  ) THEN
    UPDATE public.rewarded_ad_sessions
    SET status = 'rejected',
        updated_at = now()
    WHERE id = v_session.id;
    RETURN json_build_object(
      'success', false,
      'reason', 'active_vip',
      'session_id', v_session.id
    );
  END IF;

  UPDATE public.profiles
  SET coins = coins + v_reward_coins,
      xp = xp + v_reward_xp,
      level = ((xp + v_reward_xp) / 300) + 1,
      updated_at = now()
  WHERE id = v_session.user_id
  RETURNING coins, xp, level
  INTO v_new_coins, v_new_xp, v_new_level;

  INSERT INTO public.rewarded_ads (
    user_id, ad_unit_id, reward_type, reward_coins, watched_at
  )
  VALUES (
    v_session.user_id, v_session.ad_unit_id, 'coins', v_reward_coins, now()
  );

  UPDATE public.rewarded_ad_sessions
  SET status = 'credited',
      verified_transaction_id = btrim(p_transaction_id),
      credited_at = now(),
      updated_at = now()
  WHERE id = v_session.id;

  RETURN json_build_object(
    'success', true,
    'idempotent', false,
    'session_id', v_session.id,
    'transaction_id', btrim(p_transaction_id),
    'reward_coins', v_reward_coins,
    'reward_xp', v_reward_xp,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp,
    'new_level', v_new_level
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_verified_rewarded_ad(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_verified_rewarded_ad(uuid, text, text)
  TO service_role;

-- Legacy unverified rewarded-ad credit path is no longer client-callable.
REVOKE ALL ON FUNCTION public.claim_rewarded_ad(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rewarded_ad(text, text, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Remove direct client writes to economy evidence tables; keep own SELECT.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rewarded_ads_insert_own" ON public.rewarded_ads;
DROP POLICY IF EXISTS "spins_insert_own" ON public.spins;
DROP POLICY IF EXISTS "user_missions_insert_own" ON public.user_missions;
DROP POLICY IF EXISTS "user_missions_update_own" ON public.user_missions;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.rewarded_ads FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.spins FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_missions FROM authenticated, anon;

GRANT SELECT ON TABLE public.rewarded_ads TO authenticated;
GRANT SELECT ON TABLE public.spins TO authenticated;
GRANT SELECT ON TABLE public.user_missions TO authenticated;

GRANT ALL ON TABLE public.rewarded_ads TO service_role;
GRANT ALL ON TABLE public.spins TO service_role;
GRANT ALL ON TABLE public.user_missions TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Harden mission claims. m-daily-3 derives progress from today's favorites.
--    Other missions continue to consume server-owned user_missions progress.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_mission_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_mission_id uuid;
  v_reward_coins integer;
  v_reward_xp integer;
  v_target integer;
  v_progress integer;
  v_already_claimed boolean;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim mission reward';
  END IF;

  SELECT id, reward_coins, reward_xp, target
  INTO v_mission_id, v_reward_coins, v_reward_xp, v_target
  FROM public.missions
  WHERE code = p_mission_code;

  IF v_mission_id IS NULL THEN
    RAISE EXCEPTION 'Mission not found: %', p_mission_code;
  END IF;

  -- Serialize mission claiming with all balance mutations for this user.
  PERFORM 1
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT claimed
  INTO v_already_claimed
  FROM public.user_missions
  WHERE user_id = v_user_id
    AND mission_id = v_mission_id
  FOR UPDATE;

  IF COALESCE(v_already_claimed, false) THEN
    SELECT coins, xp, level
    INTO v_new_coins, v_new_xp, v_new_level
    FROM public.profiles
    WHERE id = v_user_id;

    RETURN json_build_object(
      'success', false,
      'reason', 'already_claimed',
      'new_coins', v_new_coins,
      'new_xp', v_new_xp,
      'new_level', v_new_level
    );
  END IF;

  IF p_mission_code = 'm-daily-3' THEN
    SELECT count(*)::integer
    INTO v_progress
    FROM public.favorites
    WHERE user_id = v_user_id
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day';

    INSERT INTO public.user_missions (
      user_id, mission_id, progress, completed, claimed, completed_at, created_at, updated_at
    )
    VALUES (
      v_user_id,
      v_mission_id,
      v_progress,
      v_progress >= v_target,
      false,
      CASE WHEN v_progress >= v_target THEN now() ELSE NULL END,
      now(),
      now()
    )
    ON CONFLICT (user_id, mission_id)
    DO UPDATE SET
      progress = EXCLUDED.progress,
      completed = EXCLUDED.completed,
      completed_at = CASE
        WHEN EXCLUDED.completed THEN COALESCE(public.user_missions.completed_at, now())
        ELSE public.user_missions.completed_at
      END,
      updated_at = now()
    WHERE public.user_missions.claimed = false;
  ELSE
    SELECT progress
    INTO v_progress
    FROM public.user_missions
    WHERE user_id = v_user_id
      AND mission_id = v_mission_id;
  END IF;

  IF v_progress IS NULL THEN
    RAISE EXCEPTION 'Mission progress is not recorded';
  END IF;

  IF v_progress < v_target THEN
    RAISE EXCEPTION 'Mission not completed (progress: %/%). Cannot claim reward.', v_progress, v_target;
  END IF;

  UPDATE public.user_missions
  SET claimed = true,
      completed = true,
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE user_id = v_user_id
    AND mission_id = v_mission_id
    AND claimed = false;

  IF NOT FOUND THEN
    SELECT coins, xp, level
    INTO v_new_coins, v_new_xp, v_new_level
    FROM public.profiles
    WHERE id = v_user_id;

    RETURN json_build_object(
      'success', false,
      'reason', 'already_claimed',
      'new_coins', v_new_coins,
      'new_xp', v_new_xp,
      'new_level', v_new_level
    );
  END IF;

  UPDATE public.profiles
  SET coins = coins + v_reward_coins,
      xp = xp + v_reward_xp,
      level = ((xp + v_reward_xp) / 300) + 1,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level
  INTO v_new_coins, v_new_xp, v_new_level;

  RETURN json_build_object(
    'success', true,
    'mission_code', p_mission_code,
    'coins_awarded', v_reward_coins,
    'xp_awarded', v_reward_xp,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp,
    'new_level', v_new_level
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_mission_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_mission_reward(text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Stream identifiers remain server/admin-only.
-- ---------------------------------------------------------------------------
REVOKE SELECT (video_asset_key, video_url) ON TABLE public.anime
  FROM authenticated, anon;

-- Preserve service-role access explicitly.
GRANT SELECT (video_asset_key, video_url) ON TABLE public.anime
  TO service_role;
