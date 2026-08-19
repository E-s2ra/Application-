-- ============================================================================
-- AniFlix Complete Database Schema & Migrations
-- Target Database: Supabase PostgreSQL (Project: guebvvlopuyebpwbzuri)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  streak_days integer NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  is_vip boolean NOT NULL DEFAULT false,
  vip_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);

-- ----------------------------------------------------------------------------
-- 2. ANIME / MEDIA CATALOG TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  video_url text,
  episodes integer NOT NULL DEFAULT 1 CHECK (episodes >= 1),
  genre text,
  category text DEFAULT 'Movies',
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anime_featured ON public.anime(is_featured);
CREATE INDEX IF NOT EXISTS idx_anime_category ON public.anime(category);

-- ----------------------------------------------------------------------------
-- 3. FAVORITES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anime_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_anime_favorite UNIQUE (user_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);

-- ----------------------------------------------------------------------------
-- 4. DEVICE SESSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.device_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL CHECK (char_length(device_id) between 20 and 200),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. DAILY LOGINS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  login_date date NOT NULL DEFAULT current_date,
  reward_claimed boolean NOT NULL DEFAULT true,
  coins_awarded integer NOT NULL DEFAULT 60 CHECK (coins_awarded >= 0),
  xp_awarded integer NOT NULL DEFAULT 90 CHECK (xp_awarded >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_daily_login UNIQUE (user_id, login_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logins_user_date ON public.daily_logins(user_id, login_date);

-- ----------------------------------------------------------------------------
-- 6. MISSIONS CATALOG TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  reward_xp integer NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
  target integer NOT NULL DEFAULT 1 CHECK (target >= 1),
  mission_type text NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'event')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_type ON public.missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_code ON public.missions(code);

-- ----------------------------------------------------------------------------
-- 7. USER MISSIONS PROGRESS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_mission UNIQUE (user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON public.user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON public.user_missions(mission_id);

-- ----------------------------------------------------------------------------
-- 8. SPINS TABLE (LUCKY WHEEL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('coins', 'xp', 'vip', 'badge')),
  reward_value integer NOT NULL DEFAULT 0,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spins_user_id ON public.spins(user_id);
CREATE INDEX IF NOT EXISTS idx_spins_created_at ON public.spins(created_at);

-- ----------------------------------------------------------------------------
-- 9. REWARDED ADS TABLE (ADMOB WATCH LEDGER)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rewarded_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_unit_id text,
  reward_type text NOT NULL DEFAULT 'coins',
  reward_coins integer NOT NULL DEFAULT 100 CHECK (reward_coins >= 0),
  watched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewarded_ads_user_id ON public.rewarded_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_rewarded_ads_watched_at ON public.rewarded_ads(watched_at);

-- ----------------------------------------------------------------------------
-- 10. COMMENTS TABLE (COMMUNITY REVIEWS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) > 0),
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  likes_count integer NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_movie_id ON public.comments(movie_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);

-- ----------------------------------------------------------------------------
-- 11. COMMENT LIKES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

-- ----------------------------------------------------------------------------
-- 12. FOLLOWS TABLE (SOCIAL GRAPH)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
  CONSTRAINT check_not_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- ----------------------------------------------------------------------------
-- 13. THEMES CATALOG TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  coin_cost integer NOT NULL DEFAULT 0 CHECK (coin_cost >= 0),
  preview_image text,
  primary_color text NOT NULL,
  accent_color text NOT NULL,
  glow_color text,
  badge_bg text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_themes_code ON public.themes(code);

-- ----------------------------------------------------------------------------
-- 14. USER THEMES UNLOCKED TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_theme UNIQUE (user_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_user_themes_user_id ON public.user_themes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_themes_theme_id ON public.user_themes(theme_id);

-- ----------------------------------------------------------------------------
-- 15. BADGES CATALOG TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badges_code ON public.badges(code);

-- ----------------------------------------------------------------------------
-- 16. USER BADGES EARNED TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);

-- ----------------------------------------------------------------------------
-- 17. VIP TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vip_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ad_reward', 'coins_purchase', 'spin_reward', 'event_bonus', 'subscription')),
  duration integer NOT NULL CHECK (duration > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vip_transactions_user_id ON public.vip_transactions(user_id);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewarded_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_transactions ENABLE ROW LEVEL SECURITY;

-- Helper admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 2. Anime Policies
DROP POLICY IF EXISTS "anime_read_all" ON public.anime;
CREATE POLICY "anime_read_all" ON public.anime FOR SELECT USING (true);

DROP POLICY IF EXISTS "anime_admin_insert" ON public.anime;
CREATE POLICY "anime_admin_insert" ON public.anime FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "anime_admin_update" ON public.anime;
CREATE POLICY "anime_admin_update" ON public.anime FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "anime_admin_delete" ON public.anime;
CREATE POLICY "anime_admin_delete" ON public.anime FOR DELETE TO authenticated
  USING (public.is_admin());

-- 3. Favorites Policies
DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4. Daily Logins Policies
DROP POLICY IF EXISTS "daily_logins_select_own" ON public.daily_logins;
CREATE POLICY "daily_logins_select_own" ON public.daily_logins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_logins_insert_own" ON public.daily_logins;
CREATE POLICY "daily_logins_insert_own" ON public.daily_logins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Missions Catalog Policies
DROP POLICY IF EXISTS "missions_select_all" ON public.missions;
CREATE POLICY "missions_select_all" ON public.missions FOR SELECT USING (true);

-- 6. User Missions Policies
DROP POLICY IF EXISTS "user_missions_select_own" ON public.user_missions;
CREATE POLICY "user_missions_select_own" ON public.user_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_missions_insert_own" ON public.user_missions;
CREATE POLICY "user_missions_insert_own" ON public.user_missions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_missions_update_own" ON public.user_missions;
CREATE POLICY "user_missions_update_own" ON public.user_missions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. Spins Policies
DROP POLICY IF EXISTS "spins_select_own" ON public.spins;
CREATE POLICY "spins_select_own" ON public.spins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "spins_insert_own" ON public.spins;
CREATE POLICY "spins_insert_own" ON public.spins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 8. Rewarded Ads Policies
DROP POLICY IF EXISTS "rewarded_ads_select_own" ON public.rewarded_ads;
CREATE POLICY "rewarded_ads_select_own" ON public.rewarded_ads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "rewarded_ads_insert_own" ON public.rewarded_ads;
CREATE POLICY "rewarded_ads_insert_own" ON public.rewarded_ads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 9. Comments Policies
DROP POLICY IF EXISTS "comments_select_public" ON public.comments;
CREATE POLICY "comments_select_public" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON public.comments;
CREATE POLICY "comments_delete_own_or_admin" ON public.comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 10. Comment Likes Policies
DROP POLICY IF EXISTS "comment_likes_select_public" ON public.comment_likes;
CREATE POLICY "comment_likes_select_public" ON public.comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "comment_likes_insert_own" ON public.comment_likes;
CREATE POLICY "comment_likes_insert_own" ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comment_likes_delete_own" ON public.comment_likes;
CREATE POLICY "comment_likes_delete_own" ON public.comment_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 11. Follows Policies
DROP POLICY IF EXISTS "follows_select_public" ON public.follows;
CREATE POLICY "follows_select_public" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- 12. Themes Policies
DROP POLICY IF EXISTS "themes_select_public" ON public.themes;
CREATE POLICY "themes_select_public" ON public.themes FOR SELECT USING (true);

-- 13. User Themes Policies
DROP POLICY IF EXISTS "user_themes_select_own" ON public.user_themes;
CREATE POLICY "user_themes_select_own" ON public.user_themes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_themes_insert_own" ON public.user_themes;
CREATE POLICY "user_themes_insert_own" ON public.user_themes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 14. Badges Policies
DROP POLICY IF EXISTS "badges_select_public" ON public.badges;
CREATE POLICY "badges_select_public" ON public.badges FOR SELECT USING (true);

-- 15. User Badges Policies
DROP POLICY IF EXISTS "user_badges_select_public" ON public.user_badges;
CREATE POLICY "user_badges_select_public" ON public.user_badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_badges_insert_own" ON public.user_badges;
CREATE POLICY "user_badges_insert_own" ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 16. VIP Transactions Policies
DROP POLICY IF EXISTS "vip_transactions_select_own" ON public.vip_transactions;
CREATE POLICY "vip_transactions_select_own" ON public.vip_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "vip_transactions_insert_own" ON public.vip_transactions;
CREATE POLICY "vip_transactions_insert_own" ON public.vip_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Grant table privileges
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (username, full_name, avatar_url, updated_at) ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;

GRANT SELECT ON public.anime TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.anime TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT ON public.daily_logins TO authenticated;
GRANT SELECT ON public.missions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_missions TO authenticated;
GRANT SELECT, INSERT ON public.spins TO authenticated;
GRANT SELECT, INSERT ON public.rewarded_ads TO authenticated;
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT SELECT ON public.follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.themes TO anon, authenticated;
GRANT SELECT, INSERT ON public.user_themes TO authenticated;
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT SELECT, INSERT ON public.vip_transactions TO authenticated;


-- ============================================================================
-- FUNCTIONS, TRIGGERS & SECURITY DEFINER RPCs
-- ============================================================================

-- 1. Profile Creation Trigger on auth.users
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
    id, username, full_name, avatar_url, role, coins, xp, level, streak_days, is_vip, vip_expires_at, created_at, updated_at
  ) VALUES (
    new.id, v_username, coalesce(new.raw_user_meta_data->>'full_name', v_username), new.raw_user_meta_data->>'avatar_url',
    'user', 0, 0, 1, 0, false, null, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now();

  -- Grant default free theme
  SELECT id INTO v_default_theme_id FROM public.themes WHERE code = 'theme-crimson' LIMIT 1;
  IF v_default_theme_id IS NOT NULL THEN
    INSERT INTO public.user_themes (user_id, theme_id, unlocked_at)
    VALUES (new.id, v_default_theme_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Grant first stream novice badge
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

-- 2. Comment Likes Counter Trigger
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments
    SET likes_count = likes_count + 1, updated_at = now()
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments
    SET likes_count = GREATEST(0, likes_count - 1), updated_at = now()
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

-- 3. Device Session RPCs
CREATE OR REPLACE FUNCTION public.claim_device_session(p_device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_device_id IS NULL OR char_length(p_device_id) NOT BETWEEN 20 AND 200 THEN
    RAISE EXCEPTION 'Invalid device identifier';
  END IF;

  INSERT INTO public.device_sessions (user_id, device_id, updated_at)
  VALUES (auth.uid(), p_device_id, now())
  ON CONFLICT (user_id) DO UPDATE
    SET device_id = excluded.device_id,
        updated_at = excluded.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_device(p_device_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1 FROM public.device_sessions
    WHERE user_id = auth.uid() AND device_id = p_device_id
  );
$$;

-- 4. Claim Daily Login Reward RPC
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

  SELECT EXISTS (
    SELECT 1 FROM public.daily_logins
    WHERE user_id = v_user_id AND login_date = v_today AND reward_claimed = true
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RAISE EXCEPTION 'Daily login reward already claimed for today';
  END IF;

  SELECT streak_days, coins, xp INTO v_current_streak, v_new_coins, v_new_xp
  FROM public.profiles WHERE id = v_user_id;

  v_current_streak := coalesce(v_current_streak, 0);
  v_new_streak := v_current_streak + 1;
  v_reward_coins := 60 + (v_new_streak * 15);
  v_reward_xp := 90 + (v_new_streak * 20);

  v_new_coins := coalesce(v_new_coins, 0) + v_reward_coins;
  v_new_xp := coalesce(v_new_xp, 0) + v_reward_xp;
  v_new_level := (v_new_xp / 300) + 1;

  INSERT INTO public.daily_logins (user_id, login_date, reward_claimed, coins_awarded, xp_awarded, created_at)
  VALUES (v_user_id, v_today, true, v_reward_coins, v_reward_xp, now())
  ON CONFLICT (user_id, login_date) DO UPDATE SET
    reward_claimed = true,
    coins_awarded = v_reward_coins,
    xp_awarded = v_reward_xp;

  UPDATE public.profiles SET
    coins = v_new_coins,
    xp = v_new_xp,
    level = v_new_level,
    streak_days = v_new_streak,
    updated_at = now()
  WHERE id = v_user_id;

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

-- 5. Claim Rewarded Ad RPC
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

  SELECT max(watched_at) INTO v_last_watched
  FROM public.rewarded_ads WHERE user_id = v_user_id;

  IF v_last_watched IS NOT NULL AND (now() - v_last_watched) < interval '8 seconds' THEN
    RAISE EXCEPTION 'Please wait before claiming another rewarded ad.';
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

-- 6. Spin Lucky Wheel RPC
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
    'new_xp', v_new_xp,
    'vip_days_remaining', v_vip_days
  );
END;
$$;

-- 7. Unlock Theme with Coins RPC
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

  SELECT EXISTS (
    SELECT 1 FROM public.user_themes
    WHERE user_id = v_user_id AND theme_id = v_theme_id
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    SELECT coins INTO v_remaining_coins FROM public.profiles WHERE id = v_user_id;
    RETURN json_build_object('success', true, 'theme_id', v_theme_id, 'remaining_coins', v_remaining_coins);
  END IF;

  SELECT coins INTO v_user_coins FROM public.profiles WHERE id = v_user_id;

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

-- Grants for authenticated users
GRANT EXECUTE ON FUNCTION public.claim_device_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_device(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rewarded_ad(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spin_lucky_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_theme_with_coins(text) TO authenticated;


-- ============================================================================
-- INITIAL SEED DATA (Themes, Badges, Missions, Default Catalog)
-- ============================================================================

-- Themes Catalog
INSERT INTO public.themes (code, name, description, coin_cost, primary_color, accent_color, glow_color, badge_bg, is_default)
VALUES 
  ('theme-crimson', 'AniFlix Crimson (Default)', 'Classic cinema red with deep OLED obsidian background.', 0, '#E50914', '#FFB800', 'rgba(229, 9, 20, 0.4)', '#1A0E10', true),
  ('theme-gold-sun', 'Kurdish Sun Golden', 'Vibrant solar gold celebrating Kurdish cinema culture.', 200, '#FFB800', '#00D2FF', 'rgba(255, 184, 0, 0.45)', '#262010', false),
  ('theme-emerald-night', 'Ramadan Midnight Emerald', 'Lush glowing emerald with gold crescent accents.', 250, '#00E676', '#FFD700', 'rgba(0, 230, 118, 0.45)', '#0F2618', false),
  ('theme-cyberpunk-violet', 'New Year Neon Cyberpunk', 'Electric neon violet with hyper-modern anime styling.', 300, '#9D4EDD', '#FF007F', 'rgba(157, 78, 221, 0.5)', '#221133', false),
  ('theme-sunset-coral', 'Summer Sunset Coral', 'Warm tropical orange with crystal cyan highlights.', 200, '#FF6D00', '#00E5FF', 'rgba(255, 109, 0, 0.45)', '#2A1608', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  coin_cost = EXCLUDED.coin_cost,
  primary_color = EXCLUDED.primary_color,
  accent_color = EXCLUDED.accent_color;

-- Badges Catalog
INSERT INTO public.badges (code, name, description, icon, color)
VALUES
  ('b-novice', 'First Stream', 'Streamed your first title on AniFlix', '🎬', '#E50914'),
  ('b-streak-3', '3-Day Fire Streak', 'Logged in for 3 consecutive days', '🔥', '#FF5722'),
  ('b-critic', '5-Star Critic', 'Published a helpful community review', '⭐', '#FFB800'),
  ('b-kurdish-sun', 'Kurdish Sun Legend', 'Participated in the Kurdish Cinema Gala', '☀️', '#FFD700'),
  ('b-vip', 'AniFlix VIP Sovereign', 'Unlocked active VIP Ultra HD status', '👑', '#9C27B0'),
  ('b-night-owl', 'Crescent Night Owl', 'Streamed during Ramadan midnight festival', '🌙', '#00E676'),
  ('b-luminary', 'New Year Luminary', 'Celebrated the New Year premiere event', '🎆', '#9D4EDD')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- Missions Catalog
INSERT INTO public.missions (code, title, description, reward_coins, reward_xp, target, mission_type)
VALUES
  ('m-daily-1', 'Daily Cinema Explorer', 'Stream any movie or anime for 10+ minutes', 30, 50, 1, 'daily'),
  ('m-daily-2', 'Critique & Rate', 'Rate any movie or write a community review', 40, 60, 1, 'daily'),
  ('m-daily-3', 'Curator', 'Add 2 new titles to your watchlist', 25, 40, 2, 'daily'),
  ('m-weekly-1', 'Weekend Binge Master', 'Watch 5 full episodes across any series', 120, 250, 5, 'weekly'),
  ('m-weekly-2', 'Genre Explorer', 'Explore at least 3 different categories (K-Drama, Anime, Movies)', 100, 200, 3, 'weekly'),
  ('event-kurd-1', 'Festival Streamer', 'Watch 3 different titles during the Kurdish Festival', 250, 350, 3, 'event'),
  ('event-kurd-2', 'Golden Critique', 'Leave a 5-star review on any festival movie', 180, 250, 1, 'event'),
  ('event-ram-1', 'Midnight Binge', 'Stream 4 episodes during evening hours', 300, 400, 4, 'event'),
  ('event-ny-1', 'New Year Countdown Stream', 'Watch the #1 Top Ranked Movie of the Year', 350, 500, 1, 'event'),
  ('event-sum-1', 'Action Marathon', 'Watch 2 blockbuster action movies', 220, 300, 2, 'event')
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_coins = EXCLUDED.reward_coins,
  reward_xp = EXCLUDED.reward_xp,
  target = EXCLUDED.target,
  mission_type = EXCLUDED.mission_type;
