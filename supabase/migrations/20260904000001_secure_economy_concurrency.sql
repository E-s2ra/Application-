-- =============================================================================
-- Migration: 20260904000001_secure_economy_concurrency.sql
-- =============================================================================
-- SECURITY HARDENING: Concurrency and Race Condition Fixes
--
-- Fixes:
--   1. claim_daily_login_reward: Moved FOR UPDATE lock BEFORE the EXISTS check.
--   2. claim_rewarded_ad: Moved FOR UPDATE lock BEFORE rate/daily limit checks.
--   3. spin_lucky_wheel: Moved FOR UPDATE lock BEFORE the EXISTS check.
--   4. unlock_theme_with_coins: Added FOR UPDATE lock BEFORE checking balance.
--   5. activate_vip_with_coins: Ignored client p_coin_cost and added FOR UPDATE.
-- =============================================================================

-- ============================================================================
-- 1. FIX: claim_daily_login_reward
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

  -- FIX CRITICAL: Lock the profile row FIRST to prevent concurrent bypass
  SELECT streak_days INTO v_current_streak
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  
  v_current_streak := coalesce(v_current_streak, 0);

  -- Check if already claimed today (idempotent guard) AFTER locking
  SELECT EXISTS (
    SELECT 1 FROM public.daily_logins
    WHERE user_id = v_user_id AND login_date = v_today AND reward_claimed = true
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    SELECT coins, xp, level INTO v_new_coins, v_new_xp, v_new_level FROM public.profiles WHERE id = v_user_id;
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

  -- Check if user logged in yesterday to continue streak
  SELECT EXISTS (
    SELECT 1 FROM public.daily_logins
    WHERE user_id = v_user_id AND login_date = v_yesterday
  ) INTO v_logged_yesterday;

  IF v_logged_yesterday THEN
    v_new_streak := v_current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_reward_coins := 60 + (LEAST(v_new_streak, 7) * 15);
  v_reward_xp := 90 + (LEAST(v_new_streak, 7) * 20);

  INSERT INTO public.daily_logins (user_id, login_date, reward_claimed, coins_awarded, xp_awarded, created_at)
  VALUES (v_user_id, v_today, true, v_reward_coins, v_reward_xp, now())
  ON CONFLICT (user_id, login_date) DO UPDATE SET
    reward_claimed = true,
    coins_awarded = v_reward_coins,
    xp_awarded = v_reward_xp;

  UPDATE public.profiles SET
    coins = coins + v_reward_coins,
    xp = xp + v_reward_xp,
    level = ((xp + v_reward_xp) / 300) + 1,
    streak_days = v_new_streak,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

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
-- 2. FIX: claim_rewarded_ad
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

  -- FIX CRITICAL: Lock user profile row FIRST for atomic evaluation
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Anti-Spam Rate Limit
  SELECT max(watched_at) INTO v_last_watched
  FROM public.rewarded_ads WHERE user_id = v_user_id;

  IF v_last_watched IS NOT NULL AND (now() - v_last_watched) < interval '10 seconds' THEN
    RAISE EXCEPTION 'Please wait before claiming another rewarded ad.';
  END IF;

  -- Daily ad reward cap
  SELECT count(*) INTO v_daily_count
  FROM public.rewarded_ads
  WHERE user_id = v_user_id AND watched_at::date = current_date;

  IF v_daily_count >= v_max_daily_ads THEN
    RAISE EXCEPTION 'Daily ad reward limit reached. Come back tomorrow!';
  END IF;

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

-- ============================================================================
-- 3. FIX: spin_lucky_wheel
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
    'reward_id', v_random::text,
    'reward_type', v_reward_type,
    'reward_value', v_reward_value,
    'label', v_reward_label,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp
  );
END;
$$;

-- ============================================================================
-- 4. FIX: unlock_theme_with_coins
-- ============================================================================
CREATE OR REPLACE FUNCTION public.unlock_theme_with_coins(p_theme_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_theme_id uuid;
  v_coin_cost integer;
  v_user_coins integer;
  v_already_unlocked boolean;
  v_remaining_coins integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id, coin_cost INTO v_theme_id, v_coin_cost
  FROM public.themes WHERE code = p_theme_code;

  IF v_theme_id IS NULL THEN
    RAISE EXCEPTION 'Theme not found';
  END IF;

  -- FIX CRITICAL: Lock user coin balance BEFORE checks
  SELECT coins INTO v_user_coins FROM public.profiles WHERE id = v_user_id FOR UPDATE;

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

  UPDATE public.profiles SET coins = coins - v_coin_cost, updated_at = now() WHERE id = v_user_id
  RETURNING coins INTO v_remaining_coins;

  INSERT INTO public.user_themes (user_id, theme_id, unlocked_at)
  VALUES (v_user_id, v_theme_id, now());

  RETURN json_build_object(
    'success', true,
    'theme_id', v_theme_id,
    'remaining_coins', v_remaining_coins
  );
END;
$$;

-- ============================================================================
-- 5. FIX: activate_vip_with_coins
-- ============================================================================
CREATE OR REPLACE FUNCTION public.activate_vip_with_coins(p_days integer, p_coin_cost integer DEFAULT 0)
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

  -- FIX CRITICAL: Ignore client cost and calculate securely on the server
  v_actual_cost := p_days * 50;

  -- Lock the profile row
  SELECT coins INTO v_current_coins
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  IF v_current_coins < v_actual_cost THEN
    RAISE EXCEPTION 'Insufficient coins for VIP activation. Required: %', v_actual_cost;
  END IF;

  UPDATE public.profiles SET
    coins = coins - v_actual_cost,
    is_vip = true,
    vip_expires_at = coalesce(vip_expires_at, now()) + (p_days || ' days')::interval,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, vip_expires_at INTO v_remaining, v_new_expires;

  -- Calculate total days remaining based on new expiration
  v_vip_days := EXTRACT(DAY FROM (v_new_expires - now()));

  INSERT INTO public.vip_transactions (user_id, type, duration, coins_spent, created_at)
  VALUES (v_user_id, 'coin_purchase', p_days, v_actual_cost, now());

  RETURN json_build_object(
    'success', true,
    'vip_days', v_vip_days,
    'vip_expires_at', v_new_expires,
    'remaining_coins', v_remaining,
    'cost', v_actual_cost
  );
END;
$$;
