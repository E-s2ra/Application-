-- =============================================================================
-- Migration: 20260905120000_audit_coin_system.sql
-- Description:
--   Strictly enforce the coin economy rules as per the final audit:
--   - Daily Login: +10 coins
--   - Spin Wheel: +50 coins (Exactly, no RNG alternatives)
--   - Rewarded Ad: +12 coins
--   - Daily Mission (m-daily-2): +15 coins (Additional daily reward)
--   All logic relies strictly on FOR UPDATE locking and server calculation.
-- =============================================================================

-- 1. Update Daily Missions in the catalog for +15 reward
UPDATE public.missions 
SET reward_coins = 15 
WHERE code = 'm-daily-2';

-- 2. Strictly Enforce: claim_daily_login_reward gives exactly 10 coins
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

  -- FIXED ECONOMY RULE: 10 coins for daily login
  v_reward_coins := 10;
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

-- 3. Strictly Enforce: spin_lucky_wheel gives exactly 50 coins (No RNG alternatives)
CREATE OR REPLACE FUNCTION public.spin_lucky_wheel()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_already_spun boolean;
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

  -- Lock the profile row FIRST
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Check if user already spun today
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

  -- NO RNG! FIXED ECONOMY RULE: 50 coins
  v_reward_type := 'coins'; 
  v_reward_value := 50; 
  v_reward_label := '50 Coins';

  INSERT INTO public.spins (user_id, reward_type, reward_value, label, created_at)
  VALUES (v_user_id, v_reward_type, v_reward_value, v_reward_label, now());

  UPDATE public.profiles SET coins = coins + v_reward_value, updated_at = now() WHERE id = v_user_id;

  SELECT coins, xp INTO v_new_coins, v_new_xp FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'reward_type', v_reward_type,
    'reward_value', v_reward_value,
    'reward_label', v_reward_label,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp
  );
END;
$$;

-- 4. Strictly Enforce: claim_rewarded_ad gives exactly 12 coins
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
  v_daily_count integer;
  v_max_daily_ads integer := 50;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim rewarded ad';
  END IF;

  SELECT max(watched_at) INTO v_last_watched
  FROM public.rewarded_ads WHERE user_id = v_user_id;

  IF v_last_watched IS NOT NULL AND (now() - v_last_watched) < interval '10 seconds' THEN
    RAISE EXCEPTION 'Please wait before claiming another rewarded ad.';
  END IF;

  SELECT count(*) INTO v_daily_count
  FROM public.rewarded_ads
  WHERE user_id = v_user_id AND watched_at::date = current_date;

  IF v_daily_count >= v_max_daily_ads THEN
    RAISE EXCEPTION 'Daily ad reward limit reached. Come back tomorrow!';
  END IF;

  -- Lock user profile row
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

GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_lucky_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rewarded_ad(text, text, text) TO authenticated;
