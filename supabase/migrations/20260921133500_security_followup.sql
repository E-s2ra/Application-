-- Security follow-up: bind admin authorization to the active auth session,
-- remove legacy admin bypasses, make delete-all auditable, and harden usernames.

-- ---------------------------------------------------------------------------
-- 1. Admin authorization must belong to the currently claimed Supabase
--    session. A displaced-but-still-valid JWT must not retain admin powers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_active_auth_session()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  BEGIN
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_session_id := NULL;
  END;

  IF v_session_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.device_sessions ds
    JOIN auth.sessions s
      ON s.id = ds.session_id
     AND s.user_id = ds.user_id
    WHERE ds.user_id = auth.uid()
      AND ds.session_id = v_session_id
  ) THEN
    RAISE EXCEPTION 'This account session is no longer active';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_device(p_device_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  BEGIN
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  IF auth.uid() IS NULL OR v_session_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.device_sessions ds
    JOIN auth.sessions s
      ON s.id = ds.session_id
     AND s.user_id = ds.user_id
    WHERE ds.user_id = auth.uid()
      AND ds.device_id = p_device_id
      AND ds.session_id = v_session_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assert_active_auth_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_device(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_active_auth_session() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_current_device(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN true;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  IF v_session_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.device_sessions ds ON ds.user_id = p.id
    JOIN auth.sessions s
      ON s.id = ds.session_id
     AND s.user_id = ds.user_id
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND ds.session_id = v_session_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Older deployments may still have the legacy comments table, while clean
-- installs drop it in 20260823060000_drop_comments_and_notifications.sql.
-- Harden the policy only when the table is actually present.
DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON public.comments';
    EXECUTE '
      CREATE POLICY "comments_delete_own_or_admin"
      ON public.comments FOR DELETE TO authenticated
      USING (user_id = auth.uid() OR public.is_admin())
    ';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Keep the existing delete-all RPC for client compatibility, but remove the
--    hard-coded email bypass and require the active session-bound admin check.
--    The operation is recorded in the audit log in the same transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_all_anime()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: active admin session required';
  END IF;

  DELETE FROM public.anime;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  PERFORM public.log_audit_event(
    auth.uid(),
    'delete_all_anime',
    'anime',
    NULL,
    'all',
    NULL,
    jsonb_build_object('deleted_count', deleted_count),
    'success',
    NULL
  );

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_all_anime()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_all_anime()
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Usernames are looked up case-insensitively by username-login, so enforce
--    case-insensitive uniqueness. Resolve only pre-existing case collisions.
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    username,
    row_number() OVER (
      PARTITION BY lower(username)
      ORDER BY created_at NULLS LAST, id
    ) AS duplicate_rank
  FROM public.profiles
  WHERE username IS NOT NULL
    AND btrim(username) <> ''
)
UPDATE public.profiles p
SET username = p.username || '_' || p.id::text,
    updated_at = now()
FROM ranked r
WHERE p.id = r.id
  AND r.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND btrim(username) <> '';

CREATE OR REPLACE FUNCTION public.resolve_username_login_email(p_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND p.email IS NOT NULL
    AND lower(p.username) = lower(btrim(p_identifier))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_username_login_email(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_username_login_email(text)
  TO service_role;

-- New signups no longer derive a username directly from full_name. Full names
-- are non-unique by design; generated usernames include the immutable user id.
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
  v_base_username text;
BEGIN
  v_base_username := nullif(btrim(new.raw_user_meta_data->>'username'), '');

  IF v_base_username IS NULL THEN
    v_base_username := nullif(
      regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_.-]+', '', 'g'),
      ''
    );
  END IF;

  IF v_base_username IS NULL THEN
    v_base_username := 'user';
  END IF;

  -- Serialize allocation for the same case-insensitive base username so two
  -- concurrent signups cannot both pass the collision check.
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(v_base_username), 0));

  v_username := v_base_username;
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id <> new.id
      AND lower(p.username) = lower(v_username)
  ) THEN
    v_username := v_base_username || '_' || new.id::text;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
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
    lower(new.email),
    v_username,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), v_username),
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
    email = coalesce(public.profiles.email, excluded.email),
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now();

  SELECT id
  INTO v_default_theme_id
  FROM public.themes
  WHERE code = 'theme-crimson'
  LIMIT 1;

  IF v_default_theme_id IS NOT NULL THEN
    INSERT INTO public.user_themes (user_id, theme_id, unlocked_at)
    VALUES (new.id, v_default_theme_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id
  INTO v_default_badge_id
  FROM public.badges
  WHERE code = 'b-novice'
  LIMIT 1;

  IF v_default_badge_id IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id, unlocked_at)
    VALUES (new.id, v_default_badge_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
