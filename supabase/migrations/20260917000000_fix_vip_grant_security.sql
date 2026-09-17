-- =============================================================================
-- Migration: 20260917000000_fix_vip_grant_security.sql
-- CRITICAL SECURITY FIX
-- =============================================================================
-- The previous migration (20260907130000_grant_vip_rpc_public.sql) contained
-- two severe vulnerabilities:
--
--   1. admin_grant_vip_by_identifier() had NO admin check in its function body.
--   2. Both admin VIP functions were GRANTED to the `anon` role, meaning ANY
--      unauthenticated visitor could call them and grant VIP to any account.
--
-- This migration:
--   a. Revokes EXECUTE from `anon` and public on both functions immediately.
--   b. Rewrites both functions with a mandatory is_admin() guard at entry.
--   c. Re-grants EXECUTE to `authenticated` only (admin check is inside).
-- =============================================================================

-- ============================================================
-- STEP 0: Immediately revoke dangerous grants
-- ============================================================
REVOKE ALL ON FUNCTION public.admin_grant_vip_by_identifier(text, integer)
  FROM anon, public;

-- Revoke the legacy admin_grant_vip function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_grant_vip'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.admin_grant_vip(uuid, integer) FROM anon, public';
  END IF;
END;
$$;

-- ============================================================
-- STEP 1: Rewrite admin_grant_vip_by_identifier with admin guard
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_grant_vip_by_identifier(
  p_target text,
  p_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_user_id uuid;
  v_current_expiry timestamptz;
  v_start timestamptz;
  v_expiry timestamptz;
  v_target_clean text;
BEGIN
  -- ⚠️  SECURITY GATE: caller MUST be an admin. This is checked server-side
  -- before any data is read or written — even though the function is
  -- SECURITY DEFINER and runs as the postgres role.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required (code: VIP_GRANT_UNAUTHORIZED)';
  END IF;

  IF p_target IS NULL OR p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN
    RAISE EXCEPTION 'Invalid parameters: target must be non-null and days must be 1–3650';
  END IF;

  v_target_clean := lower(trim(p_target));

  -- Search profiles by email, username, or id
  SELECT id INTO v_target_user_id
  FROM public.profiles
  WHERE lower(email) = v_target_clean
     OR lower(username) = v_target_clean
     OR id::text = v_target_clean
  LIMIT 1;

  -- Fallback: search auth.users if not found in profiles
  IF v_target_user_id IS NULL THEN
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE lower(email) = v_target_clean OR id::text = v_target_clean
    LIMIT 1;
  END IF;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'User "%" not found', p_target;
  END IF;

  -- Lock the target profile row
  SELECT vip_expires_at INTO v_current_expiry
  FROM public.profiles
  WHERE id = v_target_user_id
  FOR UPDATE;

  -- Extend from current expiry if it hasn't lapsed, otherwise start from now
  v_start := CASE
    WHEN v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN v_current_expiry
    ELSE now()
  END;

  v_expiry := v_start + make_interval(days => p_days);

  INSERT INTO public.profiles (id, is_vip, vip_expires_at, updated_at)
  VALUES (v_target_user_id, true, v_expiry, now())
  ON CONFLICT (id) DO UPDATE
     SET is_vip        = true,
         vip_expires_at = v_expiry,
         updated_at     = now();

  RETURN jsonb_build_object(
    'user_id',       v_target_user_id,
    'is_vip',        true,
    'vip_expires_at', v_expiry,
    'duration_days', p_days
  );
END;
$$;

-- ============================================================
-- STEP 2: Rewrite legacy admin_grant_vip with admin guard (if it exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_grant_vip'
      AND pg_get_function_arguments(p.oid) = 'p_user_id uuid, p_days integer'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.admin_grant_vip(p_user_id uuid, p_days integer)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, auth
      AS $body$
      DECLARE
        v_current_expiry timestamptz;
        v_start timestamptz;
        v_expiry timestamptz;
      BEGIN
        -- ⚠️  SECURITY GATE: caller MUST be an admin.
        IF NOT public.is_admin() THEN
          RAISE EXCEPTION 'Access denied: admin role required (code: VIP_GRANT_UNAUTHORIZED)';
        END IF;

        IF p_user_id IS NULL OR p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN
          RAISE EXCEPTION 'Invalid parameters';
        END IF;

        SELECT vip_expires_at INTO v_current_expiry
        FROM public.profiles
        WHERE id = p_user_id
        FOR UPDATE;

        v_start := CASE
          WHEN v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN v_current_expiry
          ELSE now()
        END;

        v_expiry := v_start + make_interval(days => p_days);

        INSERT INTO public.profiles (id, is_vip, vip_expires_at, updated_at)
        VALUES (p_user_id, true, v_expiry, now())
        ON CONFLICT (id) DO UPDATE
           SET is_vip = true, vip_expires_at = v_expiry, updated_at = now();

        RETURN jsonb_build_object(
          'user_id', p_user_id,
          'is_vip', true,
          'vip_expires_at', v_expiry,
          'duration_days', p_days
        );
      END;
      $body$
    $fn$;
  END IF;
END;
$$;

-- ============================================================
-- STEP 3: Restore correct grants — authenticated ONLY, never anon
-- ============================================================
REVOKE ALL ON FUNCTION public.admin_grant_vip_by_identifier(text, integer)
  FROM authenticated, anon, public;

GRANT EXECUTE ON FUNCTION public.admin_grant_vip_by_identifier(text, integer)
  TO authenticated;

-- Restore grant on legacy function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_grant_vip'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.admin_grant_vip(uuid, integer) FROM authenticated, anon, public';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid, integer) TO authenticated';
  END IF;
END;
$$;

-- ============================================================
-- STEP 4: Also harden the profiles_admin_all RLS policy
--         Previous version used FOR ALL which allows INSERT too.
--         Users should never INSERT a new profile row (that is
--         handled by the auth trigger only).
-- ============================================================
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- Allow admins to SELECT all profiles (needed for admin panel user search)
CREATE POLICY "profiles_admin_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

-- Allow admins to UPDATE any profile (e.g., grant VIP via admin panel)
-- Column-level grants still apply — economic columns are protected.
CREATE POLICY "profiles_admin_update_any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Normal users: only update their own non-economic columns
-- (This is enforced by column-level GRANTs from prior migrations)
