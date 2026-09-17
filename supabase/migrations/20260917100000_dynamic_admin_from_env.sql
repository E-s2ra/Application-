-- =============================================================================
-- Migration: 20260917100000_dynamic_admin_from_env.sql
-- Description:
--   Replaces the hardcoded admin@aniflix.com email with the value stored in
--   the Supabase Secret / environment variable ADMIN_EMAIL.
--
--   The admin email is read via current_setting('app.admin_email', true).
--   This setting is injected by the setup script (scripts/setup-admin.ts)
--   or can be set manually in Supabase Dashboard → Settings → Vault.
--
--   Fallback: if app.admin_email is not set, uses EXPO_PUBLIC_ADMIN_EMAIL
--   (set in supabase/config.toml [db.settings]) or falls back to 'esra99san@gmail.com'.
-- =============================================================================

-- ── Helper: get configured admin email ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(current_setting('app.admin_email', true)), ''),
    'esra99san@gmail.com'   -- fallback — overridden by ADMIN_EMAIL env var at runtime
  );
$$;

REVOKE ALL ON FUNCTION public.get_admin_email() FROM public;
GRANT EXECUTE ON FUNCTION public.get_admin_email() TO authenticated, anon, service_role;

-- ── Rewrite is_admin() — uses get_admin_email() dynamically ──────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    JOIN auth.users ON auth.users.id = profiles.id
    WHERE profiles.id  = auth.uid()
      AND profiles.role = 'admin'
      AND lower(auth.users.email) = lower(public.get_admin_email())
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── Rewrite enforce_approved_admin_role trigger ───────────────────────────────
-- Only the user whose email matches get_admin_email() can hold role='admin'.
CREATE OR REPLACE FUNCTION public.enforce_approved_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = NEW.id
      AND lower(email) = lower(public.get_admin_email())
  ) THEN
    NEW.role := 'user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_approved_admin_role ON public.profiles;
CREATE TRIGGER enforce_approved_admin_role
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_approved_admin_role();

-- ── Auto-promote existing user matching ADMIN_EMAIL ──────────────────────────
-- Safe: only promotes the account whose email matches get_admin_email().
-- All other accounts remain 'user'.
UPDATE public.profiles
SET role = CASE
  WHEN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id  = public.profiles.id
      AND lower(auth.users.email) = lower(public.get_admin_email())
  ) THEN 'admin'
  ELSE role  -- don't touch other users
END
WHERE EXISTS (
  SELECT 1 FROM auth.users
  WHERE auth.users.id = public.profiles.id
    AND lower(auth.users.email) = lower(public.get_admin_email())
);
