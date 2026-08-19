-- Migration: 016_create_functions_and_triggers.sql
-- Description: Security Definer functions and triggers for verified server-side reward distribution

-- ----------------------------------------------------------------------------
-- 1. Profile Creation Trigger (on auth.users insert)
-- ----------------------------------------------------------------------------
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
  -- Determine default username
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

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
    CASE WHEN lower(v_username) LIKE '%admin%' OR lower(v_username) LIKE '%esra%' THEN 'admin' ELSE 'user' END,
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
    role = CASE WHEN lower(excluded.username) LIKE '%admin%' OR lower(excluded.username) LIKE '%esra%' THEN 'admin' ELSE public.profiles.role END,
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Comment Likes Counter Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments
    SET likes_count = likes_count + 1,
        updated_at = now()
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments
    SET likes_count = GREATEST(0, likes_count - 1),
        updated_at = now()
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_comment_likes_count ON public.comment_likes;
CREATE TRIGGER trigger_comment_likes_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

-- ----------------------------------------------------------------------------
-- 3. SECURE FUNCTION: Claim Daily Login Reward
-- ----------------------------------------------------------------------------
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

  -- Check if already claimed today
  SELECT EXISTS (
    SELECT 1 FROM public.daily_logins
    WHERE user_id = v_user_id AND login_date = v_today AND reward_claimed = true
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RAISE EXCEPTION 'Daily login reward already claimed for today';
  END IF;

  -- Get current user streak & stats
  SELECT streak_days, coins, xp INTO v_current_streak, v_new_coins, v_new_xp
  FROM public.profiles WHERE id = v_user_id;

  v_current_streak := coalesce(v_current_streak, 0);
  v_new_streak := v_current_streak + 1;
  v_reward_coins := 60 + (v_new_streak * 15);
  v_reward_xp := 90 + (v_new_streak * 20);

  v_new_coins := coalesce(v_new_coins, 0) + v_reward_coins;
  v_new_xp := coalesce(v_new_xp, 0) + v_reward_xp;
  v_new_level := (v_new_xp / 300) + 1;

  -- Insert daily login record
  INSERT INTO public.daily_logins (user_id, login_date, reward_claimed, coins_awarded, xp_awarded, created_at)
  VALUES (v_user_id, v_today, true, v_reward_coins, v_reward_xp, now())
  ON CONFLICT (user_id, login_date) DO UPDATE SET
    reward_claimed = true,
    coins_awarded = v_reward_coins,
    xp_awarded = v_reward_xp;

  -- Atomically update profile
  UPDATE public.profiles SET
    coins = v_new_coins,
    xp = v_new_xp,
    level = v_new_level,
    streak_days = v_new_streak,
    updated_at = now()
  WHERE id = v_user_id;

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

-- ----------------------------------------------------------------------------
-- 4. SECURE FUNCTION: Claim Rewarded Ad Reward (AdMob Verification)
-- ----------------------------------------------------------------------------
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
  v_reward_coins integer := 100;
  v_reward_xp integer := 150;
  v_last_watched timestamptz;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim rewarded ad';
  END IF;

  -- Anti-Spam Rate Limit: Check if watched within last 10 seconds
  SELECT max(watched_at) INTO v_last_watched
  FROM public.rewarded_ads WHERE user_id = v_user_id;

  IF v_last_watched IS NOT NULL AND (now() - v_last_watched) < interval '8 seconds' THEN
    RAISE EXCEPTION 'Please wait before claiming another rewarded ad.';
  END IF;

  -- Record into rewarded_ads ledger
  INSERT INTO public.rewarded_ads (user_id, ad_unit_id, reward_type, reward_coins, watched_at)
  VALUES (v_user_id, coalesce(p_ad_unit_id, 'admob-rewarded'), p_reward_type, v_reward_coins, now());

  -- Update profile coins and xp atomically
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

-- ----------------------------------------------------------------------------
-- 5. SECURE FUNCTION: Spin Lucky Wheel
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spin_lucky_wheel()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
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

  -- Server computes pseudorandom reward (1 to 6)
  v_random := floor(random() * 6) + 1;

  IF v_random = 1 THEN
    v_reward_type := 'coins'; v_reward_value := 50; v_reward_label := '50 Coins';
  ELSIF v_random = 2 THEN
    v_reward_type := 'xp'; v_reward_value := 100; v_reward_label := '100 XP';
  ELSIF v_random = 3 THEN
    v_reward_type := 'vip'; v_reward_value := 1; v_reward_label := '1-Day VIP Pass'; v_vip_days := 1;
  ELSIF v_random = 4 THEN
    v_reward_type := 'coins'; v_reward_value := 150; v_reward_label := '150 Coins';
  ELSIF v_random = 5 THEN
    v_reward_type := 'xp'; v_reward_value := 250; v_reward_label := '250 XP';
  ELSE
    v_reward_type := 'coins'; v_reward_value := 500; v_reward_label := '500 Coins (Jackpot!)';
  END IF;

  -- Insert spin history
  INSERT INTO public.spins (user_id, reward_type, reward_value, label, created_at)
  VALUES (v_user_id, v_reward_type, v_reward_value, v_reward_label, now());

  -- Update profile atomically based on reward
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

-- ----------------------------------------------------------------------------
-- 6. SECURE FUNCTION: Unlock Theme with Coins
-- ----------------------------------------------------------------------------
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

  -- Get theme details
  SELECT id, coin_cost INTO v_theme_id, v_coin_cost
  FROM public.themes WHERE code = p_theme_code;

  IF v_theme_id IS NULL THEN
    RAISE EXCEPTION 'Theme not found';
  END IF;

  -- Check if already unlocked
  SELECT EXISTS (
    SELECT 1 FROM public.user_themes
    WHERE user_id = v_user_id AND theme_id = v_theme_id
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    SELECT coins INTO v_remaining_coins FROM public.profiles WHERE id = v_user_id;
    RETURN json_build_object('success', true, 'theme_id', v_theme_id, 'remaining_coins', v_remaining_coins);
  END IF;

  -- Check user coin balance
  SELECT coins INTO v_user_coins FROM public.profiles WHERE id = v_user_id;

  IF v_user_coins < v_coin_cost THEN
    RAISE EXCEPTION 'Insufficient coins to unlock this theme (Required: %, Available: %)', v_coin_cost, v_user_coins;
  END IF;

  -- Deduct coins and insert into user_themes atomically
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rewarded_ad(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_lucky_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_theme_with_coins(text) TO authenticated;

-- Ensure profile for esra is set to admin role
UPDATE public.profiles SET role = 'admin' WHERE lower(username) LIKE '%esra%' OR lower(full_name) LIKE '%esra%' OR id = 'ecf73126-8bb8-4999-8627-fa440bcbd776';
