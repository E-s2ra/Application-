-- Security hardening: Consolidated and strengthened RLS policies
-- Ensures consistent admin role checking across all tables

-- Drop old inconsistent policies
DROP POLICY IF EXISTS "Admins can insert anime" ON public.anime;
DROP POLICY IF EXISTS "Admins can update anime" ON public.anime;
DROP POLICY IF EXISTS "Admins can delete anime" ON public.anime;
DROP POLICY IF EXISTS "anime_admin_insert" ON public.anime;
DROP POLICY IF EXISTS "anime_admin_update" ON public.anime;
DROP POLICY IF EXISTS "anime_admin_delete" ON public.anime;

-- Ensure anime table has RLS enabled
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;

-- Anime read policy: Anyone can read anime catalog (no auth required)
CREATE POLICY "anime_read_public"
  ON public.anime FOR SELECT
  USING (true);

-- Anime insert policy: Only admins via Edge Functions (not direct from client)
CREATE POLICY "anime_admin_only_insert"
  ON public.anime FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Anime update policy: Only admins via Edge Functions
CREATE POLICY "anime_admin_only_update"
  ON public.anime FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Anime delete policy: Only admins via Edge Functions
CREATE POLICY "anime_admin_only_delete"
  ON public.anime FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Restrict column access to anime table
-- video_url should never be exposed to client
REVOKE ALL ON TABLE public.anime FROM anon, authenticated;
GRANT SELECT (id, title, description, image_url, episodes, genre, category, is_featured, created_at, updated_at, views, rating)
  ON public.anime TO anon, authenticated;
GRANT INSERT (title, description, image_url, episodes, genre, category, is_featured)
  ON public.anime TO authenticated;
GRANT UPDATE (is_featured) ON public.anime TO authenticated;
GRANT DELETE ON public.anime TO authenticated;

-- Strengthen profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old overly permissive profile policies
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Profiles: Users can only see their own profile (plus basic public data for social features)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Profiles: Anonymous users can see minimal profile data (for public viewing)
CREATE POLICY "profiles_select_public_minimal"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);

-- Profiles: Users can only update their own profile (restricted columns only)
CREATE POLICY "profiles_update_own_restricted"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Restrict profile columns for anon and authenticated users
REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT SELECT (id, full_name, username, avatar_url) ON public.profiles TO anon;

REVOKE ALL ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (username, full_name, avatar_url) ON public.profiles TO authenticated;

-- Favorites policies remain unchanged but ensure consistency
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;

CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
REVOKE ALL ON public.favorites FROM anon;

-- Ensure device_sessions table has proper security
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_sessions_select_own" ON public.device_sessions;
DROP POLICY IF EXISTS "device_sessions_insert_own" ON public.device_sessions;
DROP POLICY IF EXISTS "device_sessions_update_own" ON public.device_sessions;

CREATE POLICY "device_sessions_select_own"
  ON public.device_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "device_sessions_insert_own"
  ON public.device_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "device_sessions_update_own"
  ON public.device_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.device_sessions TO authenticated;
REVOKE ALL ON public.device_sessions FROM anon;

-- Audit logs: Only accessible via Edge Functions (service role), never from client
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
