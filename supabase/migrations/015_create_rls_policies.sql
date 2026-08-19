-- Migration: 015_create_rls_policies.sql
-- Enable Row Level Security on ALL user-related tables

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

-- Grant column and table privileges
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (username, full_name, avatar_url, updated_at) ON public.profiles TO authenticated;

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
