-- =============================================================================
-- Migration: 20260905140000_update_daily_streak_reward.sql
-- Description:
--   Update claim_daily_login_reward RPC to give exactly 15 coins instead of 10.
-- =============================================================================

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

  -- FIXED ECONOMY RULE: 15 coins for daily login
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
