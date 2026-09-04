-- =============================================================================
-- Migration: 20260904000003_update_economy_values.sql
-- Description:
--   Updates the economy values to heavily incentivize watching ads:
--   - Daily Login: 15 coins
--   - Spin the Wheel: 10 coins (for all coin rewards)
--   - Daily Missions: 10 coins each
--   - Ad Rewards: 12 coins (Already set, but ensuring balance)
-- =============================================================================

-- 1. Update Daily Missions in the catalog
UPDATE public.missions 
SET reward_coins = 10 
WHERE mission_type = 'daily';

-- 2. Update claim_daily_login_reward to give exactly 15 coins
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

  -- FIX CRITICAL: Lock user profile row to prevent concurrent streak claims
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

  -- NEW ECONOMY RULE: Fixed 15 coins for daily login
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

GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;

-- 3. Update spin_lucky_wheel to give exactly 10 coins for any coin reward
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

  -- FIX CRITICAL: Lock the profile row FIRST
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

  v_random := floor(random() * 6) + 1;

  -- NEW ECONOMY RULE: All coin rewards are 10
  IF v_random = 1 THEN
    v_reward_type := 'coins'; v_reward_value := 10; v_reward_label := '10 Coins';
  ELSIF v_random = 2 THEN
    v_reward_type := 'xp'; v_reward_value := 50; v_reward_label := '50 XP';
  ELSIF v_random = 3 THEN
    v_reward_type := 'vip'; v_reward_value := 1; v_reward_label := '1-Day VIP Pass'; v_vip_days := 1;
  ELSIF v_random = 4 THEN
    v_reward_type := 'coins'; v_reward_value := 10; v_reward_label := '10 Coins';
  ELSIF v_random = 5 THEN
    v_reward_type := 'xp'; v_reward_value := 100; v_reward_label := '100 XP';
  ELSE
    v_reward_type := 'coins'; v_reward_value := 10; v_reward_label := '10 Coins (Jackpot!)';
  END IF;

  INSERT INTO public.spins (user_id, reward_type, reward_value, label, created_at)
  VALUES (v_user_id, v_reward_type, v_reward_value, v_reward_label, now());

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
    'reward_type', v_reward_type,
    'reward_value', v_reward_value,
    'reward_label', v_reward_label,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.spin_lucky_wheel() TO authenticated;
