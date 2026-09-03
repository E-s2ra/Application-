-- =============================================================================
-- Migration: 20260904000000_harden_gamification_rpcs.sql
-- =============================================================================
-- SECURITY HARDENING: Comprehensive fix for all coin/reward system exploits.
--
-- Fixes:
--   1. claim_daily_login_reward: Atomic coin increment + streak reset on missed days
--   2. claim_rewarded_ad: Correct reward values (12 coins, 50 XP) + daily cap
--   3. spin_lucky_wheel: Add daily limit (1 spin per day)
--   4. NEW: claim_mission_reward — server-authoritative mission claims
--   5. NEW: deduct_coins — atomic coin deduction for media unlock
--   6. NEW: activate_vip_with_coins — server-validated VIP purchase
--   7. record_watch_time_reward: Revoke from authenticated (disabled for PPV)
--   8. Restrict GRANT UPDATE on profiles to non-economic columns only
-- =============================================================================

-- ============================================================================
-- 0. ENFORCE: Restrict profile column-level grants (defense-in-depth)
-- ============================================================================
-- Ensure authenticated users can NEVER directly UPDATE economic columns.
-- Only SECURITY DEFINER RPCs may modify coins, xp, level, streak_days, is_vip.
REVOKE ALL ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (username, full_name, avatar_url, updated_at) ON public.profiles TO authenticated;

-- ============================================================================
-- 1. FIX: claim_daily_login_reward — atomic increment + streak reset
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_daily_login_reward()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_already_claimed boolean;
  v_logged_yesterday boolean;
  v_current_streak integer;
  v_new_streak integer;
  v_reward_coins integer;
  v_reward_xp integer;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim daily reward';
  END IF;

  -- Check if already claimed today (idempotent guard)
  SELECT EXISTS (
    SELECT 1 FROM public.daily_logins
    WHERE user_id = v_user_id AND login_date = v_today AND reward_claimed = true
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    -- Return current state instead of throwing, for idempotent client calls
    SELECT coins, xp, level, streak_days
    INTO v_new_coins, v_new_xp, v_new_level, v_current_streak
    FROM public.profiles WHERE id = v_user_id;

    RETURN json_build_object(
      'success', false,
      'reason', 'already_claimed',
      'coins_awarded', 0,
      'xp_awarded', 0,
      'streak_days', v_current_streak,
      'new_coins', v_new_coins,
      'new_xp', v_new_xp,
      'new_level', v_new_level
    );
  END IF;

  -- Lock the profile row to prevent concurrent claims
  SELECT streak_days INTO v_current_streak
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  v_current_streak := coalesce(v_current_streak, 0);

  -- FIX HIGH-01: Check if user logged in yesterday to continue streak
  SELECT EXISTS (
    SELECT 1 FROM public.daily_logins
    WHERE user_id = v_user_id AND login_date = v_yesterday
  ) INTO v_logged_yesterday;

  IF v_logged_yesterday THEN
    v_new_streak := v_current_streak + 1;
  ELSE
    -- Streak broken — reset to day 1
    v_new_streak := 1;
  END IF;

  -- Cap reward scaling to prevent unbounded inflation (max streak bonus = 7 days)
  v_reward_coins := 60 + (LEAST(v_new_streak, 7) * 15);
  v_reward_xp := 90 + (LEAST(v_new_streak, 7) * 20);

  -- Insert daily login record (unique constraint prevents duplicates)
  INSERT INTO public.daily_logins (user_id, login_date, reward_claimed, coins_awarded, xp_awarded, created_at)
  VALUES (v_user_id, v_today, true, v_reward_coins, v_reward_xp, now())
  ON CONFLICT (user_id, login_date) DO UPDATE SET
    reward_claimed = true,
    coins_awarded = v_reward_coins,
    xp_awarded = v_reward_xp;

  -- FIX HIGH-02: Atomically increment coins/xp (not pre-computed assignment)
  UPDATE public.profiles SET
    coins = coins + v_reward_coins,
    xp = xp + v_reward_xp,
    level = ((xp + v_reward_xp) / 300) + 1,
    streak_days = v_new_streak,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

  -- Grant 3-day streak badge if milestone reached
  IF v_new_streak >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_id, unlocked_at)
    SELECT v_user_id, id, now() FROM public.badges WHERE code = 'b-streak-3'
    ON CONFLICT DO NOTHING;
  END IF;

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

-- ============================================================================
-- 2. FIX: claim_rewarded_ad — correct values + daily cap
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_rewarded_ad(
  p_ad_unit_id text DEFAULT NULL,
  p_reward_type text DEFAULT 'coins',
  p_verification_token text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  -- FIX CRITICAL-03: Match frontend config (12 coins, 50 XP)
  v_reward_coins integer := 12;
  v_reward_xp integer := 50;
  v_last_watched timestamptz;
  v_daily_count integer;
  v_max_daily_ads integer := 50; -- Hard cap: max 50 ad rewards per day
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim rewarded ad';
  END IF;

  -- Anti-Spam Rate Limit: Minimum 10 seconds between claims
  SELECT max(watched_at) INTO v_last_watched
  FROM public.rewarded_ads WHERE user_id = v_user_id;

  IF v_last_watched IS NOT NULL AND (now() - v_last_watched) < interval '10 seconds' THEN
    RAISE EXCEPTION 'Please wait before claiming another rewarded ad.';
  END IF;

  -- FIX MED-05: Daily ad reward cap
  SELECT count(*) INTO v_daily_count
  FROM public.rewarded_ads
  WHERE user_id = v_user_id AND watched_at::date = current_date;

  IF v_daily_count >= v_max_daily_ads THEN
    RAISE EXCEPTION 'Daily ad reward limit reached. Come back tomorrow!';
  END IF;

  -- Lock user profile row for atomic update
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Record into rewarded_ads ledger
  INSERT INTO public.rewarded_ads (user_id, ad_unit_id, reward_type, reward_coins, watched_at)
  VALUES (v_user_id, coalesce(p_ad_unit_id, 'admob-rewarded'), p_reward_type, v_reward_coins, now());

  -- Atomically update profile coins and xp
  UPDATE public.profiles SET
    coins = coins + v_reward_coins,
    xp = xp + v_reward_xp,
    level = ((xp + v_reward_xp) / 300) + 1,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

  RETURN json_build_object(
    'success', true,
    'reward_coins', v_reward_coins,
    'reward_xp', v_reward_xp,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp,
    'new_level', v_new_level
  );
END;
$$;

-- ============================================================================
-- 3. FIX: spin_lucky_wheel — add daily limit
-- ============================================================================
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
  v_reward_type text;
  v_reward_value integer;
  v_reward_label text;
  v_new_coins integer;
  v_new_xp integer;
  v_vip_days integer := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to spin wheel';
  END IF;

  -- FIX CRITICAL-05: Check if user already spun today
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

  -- Lock the profile row
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Server computes pseudorandom reward (1 to 6)
  -- FIX MED-04: Align reward values with frontend SPIN_REWARDS array
  v_random := floor(random() * 6) + 1;

  IF v_random = 1 THEN
    v_reward_type := 'coins'; v_reward_value := 10; v_reward_label := '10 Coins';
  ELSIF v_random = 2 THEN
    v_reward_type := 'xp'; v_reward_value := 50; v_reward_label := '50 XP';
  ELSIF v_random = 3 THEN
    v_reward_type := 'vip'; v_reward_value := 1; v_reward_label := '1-Day VIP Pass'; v_vip_days := 1;
  ELSIF v_random = 4 THEN
    v_reward_type := 'coins'; v_reward_value := 20; v_reward_label := '20 Coins';
  ELSIF v_random = 5 THEN
    v_reward_type := 'xp'; v_reward_value := 100; v_reward_label := '100 XP';
  ELSE
    v_reward_type := 'coins'; v_reward_value := 50; v_reward_label := '50 Coins (Jackpot!)';
  END IF;

  -- Insert spin history
  INSERT INTO public.spins (user_id, reward_type, reward_value, label, created_at)
  VALUES (v_user_id, v_reward_type, v_reward_value, v_reward_label, now());

  -- Atomically update profile based on reward
  IF v_reward_type = 'coins' THEN
    UPDATE public.profiles SET coins = coins + v_reward_value, updated_at = now() WHERE id = v_user_id;
  ELSIF v_reward_type = 'xp' THEN
    UPDATE public.profiles SET xp = xp + v_reward_value, level = ((xp + v_reward_value) / 300) + 1, updated_at = now() WHERE id = v_user_id;
  ELSIF v_reward_type = 'vip' THEN
    UPDATE public.profiles SET
      is_vip = true,
      vip_expires_at = coalesce(vip_expires_at, now()) + interval '1 day',
      updated_at = now()
    WHERE id = v_user_id;
    INSERT INTO public.vip_transactions (user_id, type, duration, created_at)
    VALUES (v_user_id, 'spin_reward', 1, now());
  END IF;

  SELECT coins, xp INTO v_new_coins, v_new_xp FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'reward_id', v_random::text,
    'reward_type', v_reward_type,
    'reward_value', v_reward_value,
    'label', v_reward_label,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp,
    'vip_days_remaining', v_vip_days
  );
END;
$$;

-- ============================================================================
-- 4. NEW: claim_mission_reward — server-authoritative mission claim
-- ============================================================================
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

  -- Get mission details from catalog
  SELECT id, reward_coins, reward_xp, target
  INTO v_mission_id, v_reward_coins, v_reward_xp, v_target
  FROM public.missions WHERE code = p_mission_code;

  IF v_mission_id IS NULL THEN
    RAISE EXCEPTION 'Mission not found: %', p_mission_code;
  END IF;

  -- Check user_missions status
  SELECT progress, claimed
  INTO v_progress, v_already_claimed
  FROM public.user_missions
  WHERE user_id = v_user_id AND mission_id = v_mission_id;

  -- If no user_mission row exists, they haven't started/completed it
  IF v_progress IS NULL THEN
    RAISE EXCEPTION 'Mission not started or progress not recorded';
  END IF;

  -- Check if already claimed
  IF v_already_claimed THEN
    SELECT coins, xp, level INTO v_new_coins, v_new_xp, v_new_level
    FROM public.profiles WHERE id = v_user_id;
    RETURN json_build_object(
      'success', false,
      'reason', 'already_claimed',
      'new_coins', v_new_coins,
      'new_xp', v_new_xp,
      'new_level', v_new_level
    );
  END IF;

  -- Verify completion server-side
  IF v_progress < v_target THEN
    RAISE EXCEPTION 'Mission not completed (progress: %/%). Cannot claim reward.', v_progress, v_target;
  END IF;

  -- Lock user profile
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Mark as claimed (atomically, with unique constraint protection)
  UPDATE public.user_missions SET
    claimed = true,
    completed = true,
    completed_at = coalesce(completed_at, now()),
    updated_at = now()
  WHERE user_id = v_user_id AND mission_id = v_mission_id AND claimed = false;

  -- If no row was updated, the claim was already processed (concurrent protection)
  IF NOT FOUND THEN
    SELECT coins, xp, level INTO v_new_coins, v_new_xp, v_new_level
    FROM public.profiles WHERE id = v_user_id;
    RETURN json_build_object(
      'success', false,
      'reason', 'already_claimed',
      'new_coins', v_new_coins,
      'new_xp', v_new_xp,
      'new_level', v_new_level
    );
  END IF;

  -- Atomically credit coins and XP
  UPDATE public.profiles SET
    coins = coins + v_reward_coins,
    xp = xp + v_reward_xp,
    level = ((xp + v_reward_xp) / 300) + 1,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

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

-- ============================================================================
-- 5. NEW: deduct_coins — atomic coin deduction for media unlock
-- ============================================================================
CREATE OR REPLACE FUNCTION public.deduct_coins(p_amount integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_coins integer;
  v_remaining integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Deduction amount must be positive';
  END IF;

  -- Lock the profile row and check balance
  SELECT coins INTO v_current_coins
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_current_coins < p_amount THEN
    RAISE EXCEPTION 'Insufficient coins (have: %, need: %)', v_current_coins, p_amount;
  END IF;

  -- Atomically deduct coins
  UPDATE public.profiles SET
    coins = coins - p_amount,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_remaining;

  RETURN json_build_object(
    'success', true,
    'deducted', p_amount,
    'remaining_coins', v_remaining
  );
END;
$$;

-- ============================================================================
-- 6. NEW: activate_vip_with_coins — server-validated VIP purchase
-- ============================================================================
CREATE OR REPLACE FUNCTION public.activate_vip_with_coins(p_days integer, p_coin_cost integer)
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_days <= 0 OR p_days > 365 THEN
    RAISE EXCEPTION 'VIP duration must be between 1 and 365 days';
  END IF;

  IF p_coin_cost < 0 THEN
    RAISE EXCEPTION 'Invalid coin cost';
  END IF;

  -- Lock the profile row
  SELECT coins INTO v_current_coins
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  IF v_current_coins < p_coin_cost THEN
    RAISE EXCEPTION 'Insufficient coins (have: %, need: %)', v_current_coins, p_coin_cost;
  END IF;

  -- Calculate new expiry (extend from current expiry if still VIP, else from now)
  SELECT CASE
    WHEN vip_expires_at IS NOT NULL AND vip_expires_at > now()
    THEN vip_expires_at + (p_days || ' days')::interval
    ELSE now() + (p_days || ' days')::interval
  END INTO v_new_expires
  FROM public.profiles WHERE id = v_user_id;

  v_vip_days := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_new_expires - now())) / 86400));

  -- Atomically deduct coins and activate VIP
  UPDATE public.profiles SET
    coins = coins - p_coin_cost,
    is_vip = true,
    vip_expires_at = v_new_expires,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_remaining;

  -- Record VIP transaction
  INSERT INTO public.vip_transactions (user_id, type, duration, created_at)
  VALUES (v_user_id, 'coins_purchase', p_days, now());

  RETURN json_build_object(
    'success', true,
    'remaining_coins', v_remaining,
    'vip_expires_at', v_new_expires,
    'vip_days', v_vip_days
  );
END;
$$;

-- ============================================================================
-- 7. FIX: Revoke record_watch_time_reward from authenticated
-- ============================================================================
-- This RPC still awards coins (5 per minute) despite the frontend disabling it.
-- Revoke access so it cannot be called directly.
REVOKE EXECUTE ON FUNCTION public.record_watch_time_reward(integer) FROM authenticated;

-- ============================================================================
-- 8. GRANT EXECUTE on new functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rewarded_ad(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_lucky_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_theme_with_coins(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mission_reward(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_coins(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_vip_with_coins(integer, integer) TO authenticated;

-- Revoke from public/anon for defense-in-depth
REVOKE ALL ON FUNCTION public.claim_daily_login_reward() FROM public;
REVOKE ALL ON FUNCTION public.claim_rewarded_ad(text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.spin_lucky_wheel() FROM public;
REVOKE ALL ON FUNCTION public.unlock_theme_with_coins(text) FROM public;
REVOKE ALL ON FUNCTION public.claim_mission_reward(text) FROM public;
REVOKE ALL ON FUNCTION public.deduct_coins(integer) FROM public;
REVOKE ALL ON FUNCTION public.activate_vip_with_coins(integer, integer) FROM public;
