-- ============================================================================
-- Migration: 20260819030000_full_gamification_admob_schema.sql
-- Description: Complete Supabase Database Schema for AniFlix Gamification,
--              Seasonal Events, Social Comments, Themes, Badges, VIP, and AdMob
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Extend existing or create if missing)
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

-- Add any missing columns to existing profiles table if it was created previously
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'coins') THEN
    ALTER TABLE public.profiles ADD COLUMN coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'xp') THEN
    ALTER TABLE public.profiles ADD COLUMN xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'level') THEN
    ALTER TABLE public.profiles ADD COLUMN level integer NOT NULL DEFAULT 1 CHECK (level >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'streak_days') THEN
    ALTER TABLE public.profiles ADD COLUMN streak_days integer NOT NULL DEFAULT 0 CHECK (streak_days >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_vip') THEN
    ALTER TABLE public.profiles ADD COLUMN is_vip boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'vip_expires_at') THEN
    ALTER TABLE public.profiles ADD COLUMN vip_expires_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);

-- ----------------------------------------------------------------------------
-- 2. DAILY LOGINS TABLE (Streak & Daily Rewards)
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
-- 3. MISSIONS TABLE (Daily, Weekly & Seasonal Event Quests)
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
-- 4. USER MISSIONS TABLE (Progress & Claims)
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
-- 5. SPINS TABLE (Lucky Wheel Rewards History)
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
-- 6. REWARDED ADS TABLE (AdMob Watched Ads & Coin Claims)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rewarded_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_unit_id text,
  reward_type text NOT NULL DEFAULT 'coins',
  reward_coins integer NOT NULL DEFAULT 50 CHECK (reward_coins >= 0),
  watched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewarded_ads_user_id ON public.rewarded_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_rewarded_ads_watched_at ON public.rewarded_ads(watched_at);

-- ----------------------------------------------------------------------------
-- 7. COMMENTS TABLE (Anime & Movie Community Reviews)
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
-- 8. COMMENT LIKES TABLE (Helpful / Like Votes)
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
-- 9. FOLLOWS TABLE (Community Social Graph)
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
-- 10. THEMES TABLE (Custom App Themes Catalog)
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
-- 11. USER THEMES TABLE (Purchased & Unlocked Themes)
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
-- 12. BADGES TABLE (Achievement Badges Catalog)
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
-- 13. USER BADGES TABLE (Earned Prestige Badges)
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
-- 14. VIP TRANSACTIONS TABLE (VIP Passes & Days Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vip_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ad_reward', 'coins_purchase', 'spin_reward', 'event_bonus', 'subscription')),
  duration integer NOT NULL CHECK (duration > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vip_transactions_user_id ON public.vip_transactions(user_id);

-- ----------------------------------------------------------------------------
-- 15. AUTOMATIC TRIGGERS & FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function: Automatic profile creation on auth.users insert
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
  -- Determine default username from metadata or email prefix
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
    'user',
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

-- Trigger: on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Automatically update comments.likes_count
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
-- 16. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS on ALL user-related tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
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

-- 1. Profiles Policies
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Daily Logins Policies
DROP POLICY IF EXISTS "daily_logins_select_own" ON public.daily_logins;
CREATE POLICY "daily_logins_select_own"
  ON public.daily_logins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_logins_insert_own" ON public.daily_logins;
CREATE POLICY "daily_logins_insert_own"
  ON public.daily_logins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. Missions Policies (Catalog is readable by all)
DROP POLICY IF EXISTS "missions_select_all" ON public.missions;
CREATE POLICY "missions_select_all"
  ON public.missions FOR SELECT
  USING (true);

-- 4. User Missions Policies
DROP POLICY IF EXISTS "user_missions_select_own" ON public.user_missions;
CREATE POLICY "user_missions_select_own"
  ON public.user_missions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_missions_insert_own" ON public.user_missions;
CREATE POLICY "user_missions_insert_own"
  ON public.user_missions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_missions_update_own" ON public.user_missions;
CREATE POLICY "user_missions_update_own"
  ON public.user_missions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Spins Policies
DROP POLICY IF EXISTS "spins_select_own" ON public.spins;
CREATE POLICY "spins_select_own"
  ON public.spins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "spins_insert_own" ON public.spins;
CREATE POLICY "spins_insert_own"
  ON public.spins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. Rewarded Ads Policies
DROP POLICY IF EXISTS "rewarded_ads_select_own" ON public.rewarded_ads;
CREATE POLICY "rewarded_ads_select_own"
  ON public.rewarded_ads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "rewarded_ads_insert_own" ON public.rewarded_ads;
CREATE POLICY "rewarded_ads_insert_own"
  ON public.rewarded_ads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 7. Comments Policies
DROP POLICY IF EXISTS "comments_select_public" ON public.comments;
CREATE POLICY "comments_select_public"
  ON public.comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
CREATE POLICY "comments_update_own"
  ON public.comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON public.comments;
CREATE POLICY "comments_delete_own_or_admin"
  ON public.comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR coalesce((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false));

-- 8. Comment Likes Policies
DROP POLICY IF EXISTS "comment_likes_select_public" ON public.comment_likes;
CREATE POLICY "comment_likes_select_public"
  ON public.comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "comment_likes_insert_own" ON public.comment_likes;
CREATE POLICY "comment_likes_insert_own"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comment_likes_delete_own" ON public.comment_likes;
CREATE POLICY "comment_likes_delete_own"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 9. Follows Policies
DROP POLICY IF EXISTS "follows_select_public" ON public.follows;
CREATE POLICY "follows_select_public"
  ON public.follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own"
  ON public.follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- 10. Themes Policies
DROP POLICY IF EXISTS "themes_select_public" ON public.themes;
CREATE POLICY "themes_select_public"
  ON public.themes FOR SELECT
  USING (true);

-- 11. User Themes Policies
DROP POLICY IF EXISTS "user_themes_select_own" ON public.user_themes;
CREATE POLICY "user_themes_select_own"
  ON public.user_themes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_themes_insert_own" ON public.user_themes;
CREATE POLICY "user_themes_insert_own"
  ON public.user_themes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 12. Badges Policies
DROP POLICY IF EXISTS "badges_select_public" ON public.badges;
CREATE POLICY "badges_select_public"
  ON public.badges FOR SELECT
  USING (true);

-- 13. User Badges Policies
DROP POLICY IF EXISTS "user_badges_select_public" ON public.user_badges;
CREATE POLICY "user_badges_select_public"
  ON public.user_badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "user_badges_insert_own" ON public.user_badges;
CREATE POLICY "user_badges_insert_own"
  ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 14. VIP Transactions Policies
DROP POLICY IF EXISTS "vip_transactions_select_own" ON public.vip_transactions;
CREATE POLICY "vip_transactions_select_own"
  ON public.vip_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "vip_transactions_insert_own" ON public.vip_transactions;
CREATE POLICY "vip_transactions_insert_own"
  ON public.vip_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 17. GRANT TABLE PRIVILEGES
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (username, full_name, avatar_url, coins, xp, level, streak_days, is_vip, vip_expires_at, updated_at) ON public.profiles TO authenticated;

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
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT INSERT ON public.user_badges TO authenticated;
GRANT SELECT, INSERT ON public.vip_transactions TO authenticated;

-- ----------------------------------------------------------------------------
-- 18. SEED INITIAL CATALOG DATA (Themes, Badges, Missions)
-- ----------------------------------------------------------------------------

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
