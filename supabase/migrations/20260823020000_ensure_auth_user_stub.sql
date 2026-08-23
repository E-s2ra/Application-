-- ============================================================================
-- Migration: 20260823020000_ensure_auth_user_stub.sql
-- Description: Automatically ensures auth.users stub exists when syncing profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_auth_user_stub()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    INSERT INTO auth.users (id, email, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.username, 'user') || '@aniflix.local', now(), now())
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_auth_user_stub ON public.profiles;
CREATE TRIGGER trg_ensure_auth_user_stub
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_auth_user_stub();
