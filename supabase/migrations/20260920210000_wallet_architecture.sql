-- =============================================================================
-- Production wallet/session architecture
-- =============================================================================
-- Goals:
--   * Bind privileged profile/economy mutations to the currently active auth
--     session, so an older displaced JWT cannot keep calling coin/VIP RPCs.
--   * Keep the device session table server-owned.
--   * Record every coin balance mutation in an append-only user-readable ledger.
--   * Fail closed when the approved admin identity is not explicitly configured.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bind the single-device record to the Supabase auth session id.
-- -----------------------------------------------------------------------------
ALTER TABLE public.device_sessions
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz NOT NULL DEFAULT now();

-- Existing rows predate auth-session binding and cannot be proven current. They
-- are intentionally cleared once; the next authenticated app start re-claims
-- the installed device with the current JWT session_id.
DELETE FROM public.device_sessions
WHERE session_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_device_sessions_session_id
  ON public.device_sessions (session_id)
  WHERE session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_device_session(p_device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_session_created_at timestamptz;
  v_existing_session_id uuid;
  v_existing_session_created_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_device_id IS NULL OR char_length(p_device_id) NOT BETWEEN 20 AND 200 THEN
    RAISE EXCEPTION 'Invalid device identifier';
  END IF;

  BEGIN
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_session_id := NULL;
  END;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated session identifier is unavailable';
  END IF;

  SELECT s.created_at
  INTO v_session_created_at
  FROM auth.sessions s
  WHERE s.id = v_session_id
    AND s.user_id = v_user_id;

  IF v_session_created_at IS NULL THEN
    RAISE EXCEPTION 'Authenticated session is no longer valid';
  END IF;

  -- Serialize first claim as well as replacements. A row-level lock cannot
  -- protect the "no device row exists yet" case, so lock on the user identity
  -- for the rest of this transaction before comparing session age.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  SELECT ds.session_id, s.created_at
  INTO v_existing_session_id, v_existing_session_created_at
  FROM public.device_sessions ds
  LEFT JOIN auth.sessions s ON s.id = ds.session_id
  WHERE ds.user_id = v_user_id
  FOR UPDATE OF ds;

  -- Never allow an older still-valid JWT to replace a newer login.
  IF v_existing_session_created_at IS NOT NULL
     AND v_existing_session_created_at > v_session_created_at
     AND v_existing_session_id <> v_session_id THEN
    RAISE EXCEPTION 'A newer device session is already active';
  END IF;

  INSERT INTO public.device_sessions (user_id, device_id, session_id, claimed_at, updated_at)
  VALUES (v_user_id, p_device_id, v_session_id, now(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET device_id = EXCLUDED.device_id,
      session_id = EXCLUDED.session_id,
      claimed_at = EXCLUDED.claimed_at,
      updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_device(p_device_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  BEGIN
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  IF auth.uid() IS NULL OR v_session_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.device_sessions ds
    WHERE ds.user_id = auth.uid()
      AND ds.device_id = p_device_id
      AND ds.session_id = v_session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_active_auth_session()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR auth.uid() IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_session_id := NULL;
  END;

  IF v_session_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.device_sessions ds
    WHERE ds.user_id = auth.uid()
      AND ds.session_id = v_session_id
  ) THEN
    RAISE EXCEPTION 'This account is active on another device';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_device_session(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_device(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assert_active_auth_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_device_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_device(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_active_auth_session() TO authenticated, service_role;

DROP POLICY IF EXISTS "device_sessions_insert_own" ON public.device_sessions;
DROP POLICY IF EXISTS "device_sessions_update_own" ON public.device_sessions;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.device_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.device_sessions TO authenticated;
GRANT ALL ON TABLE public.device_sessions TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Append-only wallet ledger. The profile balance remains the fast materialized
--    balance; this table is the immutable audit trail used for reconciliation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL CHECK (delta <> 0),
  balance_before integer NOT NULL CHECK (balance_before >= 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  reason text NOT NULL DEFAULT 'balance_change' CHECK (char_length(reason) BETWEEN 1 AND 80),
  actor_user_id uuid,
  transaction_id bigint NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_ledger_balance_math CHECK (balance_after = balance_before + delta)
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created
  ON public.wallet_ledger (user_id, created_at DESC, id DESC);

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_ledger_select_own" ON public.wallet_ledger;
CREATE POLICY "wallet_ledger_select_own"
  ON public.wallet_ledger
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.wallet_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.wallet_ledger TO authenticated;
GRANT ALL ON TABLE public.wallet_ledger TO service_role;

-- Seed one opening-balance row for pre-existing non-zero wallets. This gives
-- reconciliation a complete starting point without inventing historical events.
INSERT INTO public.wallet_ledger (
  user_id,
  delta,
  balance_before,
  balance_after,
  reason,
  actor_user_id,
  transaction_id,
  metadata
)
SELECT
  p.id,
  p.coins,
  0,
  p.coins,
  'opening_balance',
  NULL,
  txid_current(),
  jsonb_build_object('source', 'wallet_architecture_migration')
FROM public.profiles p
WHERE p.coins > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.wallet_ledger wl WHERE wl.user_id = p.id
  );

CREATE OR REPLACE FUNCTION public.guard_sensitive_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
    PERFORM public.assert_active_auth_session();

    IF NEW.id <> auth.uid() AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Cannot mutate another user profile';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_sensitive_profile_update ON public.profiles;
CREATE TRIGGER guard_sensitive_profile_update
  BEFORE UPDATE OF coins, xp, level, streak_days, is_vip, vip_expires_at
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_sensitive_profile_update();

CREATE OR REPLACE FUNCTION public.record_wallet_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text;
BEGIN
  IF NEW.coins IS DISTINCT FROM OLD.coins THEN
    v_reason := nullif(current_setting('aniflix.coin_reason', true), '');

    IF v_reason IS NULL THEN
      IF NEW.coins > OLD.coins AND auth.uid() IS NULL AND (NEW.coins - OLD.coins) = 12 THEN
        v_reason := 'rewarded_ad';
      ELSIF NEW.coins > OLD.coins THEN
        v_reason := 'credit';
      ELSIF NEW.is_vip IS DISTINCT FROM OLD.is_vip
         OR NEW.vip_expires_at IS DISTINCT FROM OLD.vip_expires_at THEN
        v_reason := 'vip_access';
      ELSIF EXISTS (
        SELECT 1 FROM public.content_cost_registry c
        WHERE c.cost_coins = (OLD.coins - NEW.coins)
      ) THEN
        v_reason := 'content_unlock';
      ELSIF EXISTS (
        SELECT 1 FROM public.themes t
        WHERE t.coin_cost = (OLD.coins - NEW.coins)
      ) THEN
        v_reason := 'theme_unlock';
      ELSE
        v_reason := 'debit';
      END IF;
    END IF;

    INSERT INTO public.wallet_ledger (
      user_id,
      delta,
      balance_before,
      balance_after,
      reason,
      actor_user_id,
      transaction_id
    ) VALUES (
      NEW.id,
      NEW.coins - OLD.coins,
      OLD.coins,
      NEW.coins,
      v_reason,
      auth.uid(),
      txid_current()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_wallet_ledger_entry ON public.profiles;
CREATE TRIGGER record_wallet_ledger_entry
  AFTER UPDATE OF coins ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.record_wallet_ledger_entry();

-- A single read contract keeps client wallet screens from stitching together
-- potentially stale profile/cache state and ledger history.
CREATE OR REPLACE FUNCTION public.get_wallet_snapshot(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM public.assert_active_auth_session();

  SELECT jsonb_build_object(
    'coins', p.coins,
    'xp', p.xp,
    'level', p.level,
    'streak_days', p.streak_days,
    'is_vip', p.is_vip,
    'vip_expires_at', p.vip_expires_at,
    'ledger', coalesce((
      SELECT jsonb_agg(to_jsonb(entry) ORDER BY entry.created_at DESC, entry.id DESC)
      FROM (
        SELECT wl.id, wl.delta, wl.balance_before, wl.balance_after, wl.reason, wl.created_at
        FROM public.wallet_ledger wl
        WHERE wl.user_id = v_user_id
        ORDER BY wl.created_at DESC, wl.id DESC
        LIMIT v_limit
      ) entry
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_wallet_snapshot(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_snapshot(integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. Admin authorization is role-based. New users are forced to role='user' by
--    handle_new_user(), and clients have no UPDATE privilege on profiles.role.
--    Only service-role provisioning can promote an account.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT p.role = 'admin'
    FROM public.profiles p
    WHERE p.id = auth.uid()
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_approved_admin_role ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_approved_admin_role();
DROP FUNCTION IF EXISTS public.get_admin_email();

-- -----------------------------------------------------------------------------
-- 3b. Bind rewarded-ad sessions to the active Supabase auth session. A verified
--     provider callback for a displaced session is rejected instead of crediting
--     the wallet after another device has taken over the account.
-- -----------------------------------------------------------------------------
ALTER TABLE public.rewarded_ad_sessions
  ADD COLUMN IF NOT EXISTS auth_session_id uuid;

CREATE INDEX IF NOT EXISTS idx_rewarded_ad_sessions_auth_session
  ON public.rewarded_ad_sessions (user_id, auth_session_id, status);

CREATE OR REPLACE FUNCTION public.create_rewarded_ad_session(p_ad_unit_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_auth_session_id uuid;
  v_is_vip boolean;
  v_vip_expires_at timestamptz;
  v_pending_count integer;
  v_session_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  BEGIN
    v_auth_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_auth_session_id := NULL;
  END;

  IF v_auth_session_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated session identifier is unavailable';
  END IF;

  PERFORM public.assert_active_auth_session();

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

  IF coalesce(v_is_vip, false) AND v_vip_expires_at > now() THEN
    RAISE EXCEPTION 'Active VIP accounts are not eligible for rewarded-ad coins';
  END IF;

  UPDATE public.rewarded_ad_sessions
  SET status = 'expired', updated_at = now()
  WHERE user_id = v_user_id
    AND status = 'pending'
    AND expires_at <= now();

  SELECT count(*)
  INTO v_pending_count
  FROM public.rewarded_ad_sessions
  WHERE user_id = v_user_id
    AND auth_session_id = v_auth_session_id
    AND status = 'pending'
    AND expires_at > now();

  IF v_pending_count >= 3 THEN
    RAISE EXCEPTION 'Too many pending rewarded-ad sessions';
  END IF;

  v_session_id := gen_random_uuid();
  v_expires_at := now() + interval '15 minutes';

  INSERT INTO public.rewarded_ad_sessions (
    id, user_id, auth_session_id, ad_unit_id, status, created_at, expires_at, updated_at
  ) VALUES (
    v_session_id, v_user_id, v_auth_session_id, btrim(p_ad_unit_id), 'pending', now(), v_expires_at, now()
  );

  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'session_token', v_session_id,
    'expires_at', v_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_rewarded_ad_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_rewarded_ad_session(text) TO authenticated, service_role;

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
  IF coalesce(auth.role(), '') <> 'service_role' THEN
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
    SET status = 'expired', updated_at = now()
    WHERE id = v_session.id;
    RETURN json_build_object('success', false, 'reason', 'session_expired', 'session_id', v_session.id);
  END IF;

  IF v_session.auth_session_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.device_sessions ds
    WHERE ds.user_id = v_session.user_id
      AND ds.session_id = v_session.auth_session_id
  ) THEN
    UPDATE public.rewarded_ad_sessions
    SET status = 'rejected', updated_at = now()
    WHERE id = v_session.id;
    RETURN json_build_object('success', false, 'reason', 'session_displaced', 'session_id', v_session.id);
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
    IF v_existing_session.id = v_session.id AND v_existing_session.status = 'credited' THEN
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

  PERFORM 1 FROM public.profiles WHERE id = v_session.user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_session.user_id
      AND is_vip = true
      AND vip_expires_at > now()
  ) THEN
    UPDATE public.rewarded_ad_sessions
    SET status = 'rejected', updated_at = now()
    WHERE id = v_session.id;
    RETURN json_build_object('success', false, 'reason', 'active_vip', 'session_id', v_session.id);
  END IF;

  PERFORM set_config('aniflix.coin_reason', 'rewarded_ad', true);
  UPDATE public.profiles
  SET coins = coins + v_reward_coins,
      xp = xp + v_reward_xp,
      level = ((xp + v_reward_xp) / 300) + 1,
      updated_at = now()
  WHERE id = v_session.user_id
  RETURNING coins, xp, level
  INTO v_new_coins, v_new_xp, v_new_level;

  INSERT INTO public.rewarded_ads (user_id, ad_unit_id, reward_type, reward_coins, watched_at)
  VALUES (v_session.user_id, v_session.ad_unit_id, 'coins', v_reward_coins, now());

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

-- -----------------------------------------------------------------------------
-- 3c. Reassert spend RPCs with explicit wallet reasons. Balance updates are
--     serialized on the profile row and the client never supplies a price.
-- -----------------------------------------------------------------------------
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
  v_user_id uuid := auth.uid();
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  PERFORM public.assert_active_auth_session();

  SELECT category, episodes
  INTO v_category, v_episode_count
  FROM public.anime
  WHERE id = p_media_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media not found';
  END IF;

  v_episode_count := greatest(coalesce(v_episode_count, 1), 1);
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

  SELECT cost_coins INTO v_cost
  FROM public.content_cost_registry
  WHERE category = v_registry_category;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'No valid server price is configured for category %', v_registry_category;
  END IF;

  SELECT coins INTO v_current_coins
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
  PERFORM set_config('aniflix.coin_reason', 'content_unlock', true);
  UPDATE public.profiles
  SET coins = coins - v_cost, updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_remaining_coins;

  INSERT INTO public.media_entitlements (
    user_id, anime_id, episode, unlock_key, cost_coins,
    unlocked_at, expires_at, created_at, updated_at
  ) VALUES (
    v_user_id, p_media_id, p_episode, v_unlock_key, v_cost,
    now(), v_expires_at, now(), now()
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

CREATE OR REPLACE FUNCTION public.quote_media_unlock(
  p_media_id uuid,
  p_episode integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
  v_episode_count integer;
  v_registry_category text;
  v_cost integer;
  v_is_movie boolean;
BEGIN
  SELECT category, episodes
  INTO v_category, v_episode_count
  FROM public.anime
  WHERE id = p_media_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Media not found';
  END IF;

  v_episode_count := greatest(coalesce(v_episode_count, 1), 1);
  v_is_movie := v_category IN ('Movies', 'Anime Movies');

  IF v_is_movie THEN
    IF p_episode IS NOT NULL THEN
      RAISE EXCEPTION 'Movies do not accept an episode number';
    END IF;
  ELSE
    IF p_episode IS NULL THEN
      RAISE EXCEPTION 'Episode number is required for episodic media';
    END IF;
    IF p_episode < 1 OR p_episode > v_episode_count THEN
      RAISE EXCEPTION 'Episode % is outside the valid range 1-%', p_episode, v_episode_count;
    END IF;
  END IF;

  v_registry_category := CASE
    WHEN v_category = 'Anime Movies' THEN 'Anime Movies'
    WHEN v_category = 'Movies' THEN 'Movies'
    WHEN v_category IN ('K-Drama', 'Drama') THEN v_category
    WHEN v_category IN ('Anime', 'Anime Series') THEN 'Anime'
    ELSE NULL
  END;

  IF v_registry_category IS NULL THEN
    RAISE EXCEPTION 'Unsupported media category: %', coalesce(v_category, 'unknown');
  END IF;

  SELECT cost_coins INTO v_cost
  FROM public.content_cost_registry
  WHERE category = v_registry_category;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'No valid server price is configured for category %', v_registry_category;
  END IF;

  RETURN json_build_object(
    'media_id', p_media_id,
    'episode', p_episode,
    'category', v_registry_category,
    'cost_coins', v_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.quote_media_unlock(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_media_unlock(uuid, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.unlock_theme_with_coins(p_theme_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_theme_id uuid;
  v_coin_cost integer;
  v_user_coins integer;
  v_already_unlocked boolean;
  v_remaining_coins integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  PERFORM public.assert_active_auth_session();

  SELECT id, coin_cost INTO v_theme_id, v_coin_cost
  FROM public.themes
  WHERE code = p_theme_code;

  IF v_theme_id IS NULL THEN
    RAISE EXCEPTION 'Theme not found';
  END IF;

  SELECT coins INTO v_user_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_user_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_themes
    WHERE user_id = v_user_id AND theme_id = v_theme_id
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    RETURN json_build_object('success', true, 'theme_id', v_theme_id, 'remaining_coins', v_user_coins);
  END IF;

  IF v_user_coins < v_coin_cost THEN
    RAISE EXCEPTION 'Insufficient coins to unlock this theme (Required: %, Available: %)', v_coin_cost, v_user_coins;
  END IF;

  PERFORM set_config('aniflix.coin_reason', 'theme_unlock', true);
  UPDATE public.profiles
  SET coins = coins - v_coin_cost, updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_remaining_coins;

  INSERT INTO public.user_themes (user_id, theme_id, unlocked_at)
  VALUES (v_user_id, v_theme_id, now())
  ON CONFLICT DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'theme_id', v_theme_id,
    'remaining_coins', v_remaining_coins
  );
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_theme_with_coins(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_theme_with_coins(text) TO authenticated, service_role;

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
  v_user_id uuid := auth.uid();
  v_current_coins integer;
  v_remaining integer;
  v_new_expires timestamptz;
  v_vip_days integer;
  v_actual_cost integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  PERFORM public.assert_active_auth_session();

  IF p_days <= 0 OR p_days > 365 THEN
    RAISE EXCEPTION 'VIP duration must be between 1 and 365 days';
  END IF;

  v_actual_cost := p_days * 50;
  SELECT coins INTO v_current_coins
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF v_current_coins < v_actual_cost THEN
    RAISE EXCEPTION 'Insufficient coins for VIP activation. Required: %', v_actual_cost;
  END IF;

  PERFORM set_config('aniflix.coin_reason', 'vip_access', true);
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
-- 4. Reassert the daily-login contract against the actual daily_logins schema.
--    Older migrations used renamed columns that were never added to this table.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_login_reward()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_last_claim date;
  v_current_streak integer := 0;
  v_new_streak integer := 1;
  v_reward_coins integer := 15;
  v_reward_xp integer;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim daily reward';
  END IF;

  PERFORM public.assert_active_auth_session();
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.daily_logins
    WHERE user_id = v_user_id
      AND login_date = v_today
      AND reward_claimed = true
  ) THEN
    SELECT coins, xp, level
    INTO v_new_coins, v_new_xp, v_new_level
    FROM public.profiles WHERE id = v_user_id;

    RETURN json_build_object(
      'success', false,
      'reason', 'already_claimed_today',
      'new_coins', v_new_coins,
      'new_xp', v_new_xp,
      'new_level', v_new_level
    );
  END IF;

  SELECT streak_days INTO v_current_streak
  FROM public.profiles WHERE id = v_user_id;

  SELECT max(login_date) INTO v_last_claim
  FROM public.daily_logins
  WHERE user_id = v_user_id AND reward_claimed = true;

  IF v_last_claim = v_today - 1 THEN
    v_new_streak := coalesce(v_current_streak, 0) + 1;
  END IF;

  v_reward_xp := 150 + (least(v_new_streak, 7) * 50);

  INSERT INTO public.daily_logins (
    user_id, login_date, reward_claimed, coins_awarded, xp_awarded, created_at
  ) VALUES (
    v_user_id, v_today, true, v_reward_coins, v_reward_xp, now()
  )
  ON CONFLICT (user_id, login_date) DO UPDATE
  SET reward_claimed = true,
      coins_awarded = EXCLUDED.coins_awarded,
      xp_awarded = EXCLUDED.xp_awarded;

  PERFORM set_config('aniflix.coin_reason', 'daily_login', true);
  UPDATE public.profiles
  SET streak_days = v_new_streak,
      coins = coins + v_reward_coins,
      xp = xp + v_reward_xp,
      level = ((xp + v_reward_xp) / 300) + 1,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

  RETURN json_build_object(
    'success', true,
    'coins_awarded', v_reward_coins,
    'xp_awarded', v_reward_xp,
    'streak_days', v_new_streak,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp,
    'new_level', v_new_level
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_daily_login_reward() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;

CREATE OR REPLACE FUNCTION public.tag_mission_wallet_reason()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.claimed = true AND coalesce(OLD.claimed, false) = false THEN
    PERFORM set_config('aniflix.coin_reason', 'mission_reward', true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tag_mission_wallet_reason ON public.user_missions;
CREATE TRIGGER tag_mission_wallet_reason
  BEFORE UPDATE OF claimed ON public.user_missions
  FOR EACH ROW
  EXECUTE FUNCTION public.tag_mission_wallet_reason();

-- -----------------------------------------------------------------------------
-- 5. Repair the wheel VIP extension rule. Existing unexpired VIP time is kept;
--    expired timestamps never push the new reward into the past.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spin_lucky_wheel()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_already_spun boolean;
  v_random integer;
  v_reward_id text;
  v_reward_type text;
  v_reward_value integer;
  v_reward_label text;
  v_new_coins integer;
  v_new_xp integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to spin wheel';
  END IF;

  PERFORM public.assert_active_auth_session();
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  SELECT EXISTS (
    SELECT 1 FROM public.spins
    WHERE user_id = v_user_id AND created_at::date = current_date
  ) INTO v_already_spun;

  IF v_already_spun THEN
    SELECT coins, xp INTO v_new_coins, v_new_xp FROM public.profiles WHERE id = v_user_id;
    RETURN json_build_object(
      'success', false,
      'reason', 'already_spun_today',
      'new_coins', v_new_coins,
      'new_xp', v_new_xp
    );
  END IF;

  v_random := floor(random() * 6) + 1;
  IF v_random = 1 THEN
    v_reward_id := 'slot-1'; v_reward_type := 'coins'; v_reward_value := 50; v_reward_label := '50 Coins';
  ELSIF v_random = 2 THEN
    v_reward_id := 'slot-2'; v_reward_type := 'xp'; v_reward_value := 50; v_reward_label := '50 XP';
  ELSIF v_random = 3 THEN
    v_reward_id := 'slot-3'; v_reward_type := 'vip'; v_reward_value := 1; v_reward_label := '1-Day VIP Pass';
  ELSIF v_random = 4 THEN
    v_reward_id := 'slot-4'; v_reward_type := 'coins'; v_reward_value := 50; v_reward_label := '50 Coins';
  ELSIF v_random = 5 THEN
    v_reward_id := 'slot-5'; v_reward_type := 'xp'; v_reward_value := 100; v_reward_label := '100 XP';
  ELSE
    v_reward_id := 'slot-6'; v_reward_type := 'coins'; v_reward_value := 500; v_reward_label := '500 Coins Jackpot';
  END IF;

  INSERT INTO public.spins (user_id, reward_type, reward_value, label, created_at)
  VALUES (v_user_id, v_reward_type, v_reward_value, v_reward_label, now());

  IF v_reward_type = 'coins' THEN
    PERFORM set_config('aniflix.coin_reason', 'lucky_spin', true);
    UPDATE public.profiles
    SET coins = coins + v_reward_value, updated_at = now()
    WHERE id = v_user_id;
  ELSIF v_reward_type = 'xp' THEN
    UPDATE public.profiles
    SET xp = xp + v_reward_value,
        level = ((xp + v_reward_value) / 300) + 1,
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    UPDATE public.profiles
    SET is_vip = true,
        vip_expires_at = greatest(coalesce(vip_expires_at, now()), now()) + interval '1 day',
        updated_at = now()
    WHERE id = v_user_id;

    INSERT INTO public.vip_transactions (user_id, type, duration, created_at)
    VALUES (v_user_id, 'spin_reward', 1, now());
  END IF;

  SELECT coins, xp INTO v_new_coins, v_new_xp FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'reward_id', v_reward_id,
    'reward_type', v_reward_type,
    'reward_value', v_reward_value,
    'reward_label', v_reward_label,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.spin_lucky_wheel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_lucky_wheel() TO authenticated;
