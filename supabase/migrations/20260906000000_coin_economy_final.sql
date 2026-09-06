-- =============================================================================
-- Migration: 20260906000000_coin_economy_final.sql
-- Description:
--   FINAL authoritative coin economy rules:
--   - Daily Login Streak: 15 coins (fixed — reverts the erroneous 10-coin audit)
--   - Rewarded Ad: 12 coins, UNLIMITED per day (only 10s cooldown between ads)
--   - Spin Wheel: 50 coins (unchanged)
--   - Drama category: maps to 100 coins unlock cost (same as K-Drama)
--   - Anomaly guard: flag users earning >500 coins in 1 hour from ads
-- =============================================================================

-- ============================================================
-- 1. Fix claim_daily_login_reward → exactly 15 coins
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_daily_login_reward()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_today date := current_date;
  v_already_claimed boolean;
  v_last_claim date;
  v_current_streak integer := 0;
  v_new_streak integer := 1;
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

  -- Lock user profile row to prevent concurrent streak claims
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  SELECT reward_claimed INTO v_already_claimed
  FROM public.daily_logins
  WHERE user_id = v_user_id AND login_date = v_today;

  IF v_already_claimed THEN
    SELECT coins, xp, level INTO v_new_coins, v_new_xp, v_new_level FROM public.profiles WHERE id = v_user_id;
    RETURN json_build_object(
      'success', false,
      'reason', 'already_claimed_today',
      'new_coins', v_new_coins,
      'new_xp', v_new_xp,
      'new_level', v_new_level
    );
  END IF;

  SELECT streak_days INTO v_current_streak FROM public.profiles WHERE id = v_user_id;
  
  SELECT max(login_date) INTO v_last_claim
  FROM public.daily_logins
  WHERE user_id = v_user_id AND reward_claimed = true;

  IF v_last_claim = v_today - interval '1 day' THEN
    v_new_streak := v_current_streak + 1;
  END IF;

  -- ECONOMY RULE: 15 coins for daily login (final value)
  v_reward_coins := 15;
  v_reward_xp := 150 + (LEAST(v_new_streak, 7) * 50);

  INSERT INTO public.daily_logins (user_id, login_date, reward_claimed, reward_coins, reward_xp, claimed_at)
  VALUES (v_user_id, v_today, true, v_reward_coins, v_reward_xp, now())
  ON CONFLICT (user_id, login_date) DO UPDATE
  SET 
    reward_claimed = true,
    reward_coins = v_reward_coins,
    reward_xp = v_reward_xp,
    claimed_at = now();

  UPDATE public.profiles
  SET 
    streak_days = v_new_streak,
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

-- ============================================================
-- 2. Rewarded Ad → UNLIMITED per day, only 10s cooldown
--    + anomaly guard (>500 coins/hour from ads → flag account)
-- ============================================================

-- Add anomaly_flagged column to profiles if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS anomaly_flagged boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS anomaly_flag_reason text;

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
  v_reward_coins integer := 12;
  v_reward_xp integer := 50;
  v_last_watched timestamptz;
  v_hourly_coins integer;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim rewarded ad';
  END IF;

  -- Block flagged accounts from earning
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND anomaly_flagged = true) THEN
    RAISE EXCEPTION 'Account under review. Please contact support.';
  END IF;

  -- 10-second cooldown between consecutive ads (anti-bot, not a daily cap)
  SELECT max(watched_at) INTO v_last_watched
  FROM public.rewarded_ads WHERE user_id = v_user_id;

  IF v_last_watched IS NOT NULL AND (now() - v_last_watched) < interval '10 seconds' THEN
    RAISE EXCEPTION 'Please wait a moment before claiming another rewarded ad.';
  END IF;

  -- NO DAILY CAP — ads are truly unlimited (removed v_max_daily_ads check)

  -- Lock user profile row (prevent race conditions)
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  INSERT INTO public.rewarded_ads (user_id, ad_unit_id, reward_type, reward_coins, watched_at)
  VALUES (v_user_id, coalesce(p_ad_unit_id, 'admob-rewarded'), p_reward_type, v_reward_coins, now());

  UPDATE public.profiles SET
    coins = coins + v_reward_coins,
    xp = xp + v_reward_xp,
    level = ((xp + v_reward_xp) / 300) + 1,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

  -- Anomaly guard: if user earned > 500 coins from ads in the last hour, flag account
  SELECT COALESCE(SUM(reward_coins), 0) INTO v_hourly_coins
  FROM public.rewarded_ads
  WHERE user_id = v_user_id
    AND watched_at >= now() - interval '1 hour';

  IF v_hourly_coins > 500 THEN
    UPDATE public.profiles SET
      anomaly_flagged = true,
      anomaly_flag_reason = format('Earned %s coins from ads in 1 hour at %s', v_hourly_coins, now())
    WHERE id = v_user_id;
  END IF;

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

-- ============================================================
-- 3. Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rewarded_ad(text, text, text) TO authenticated;
