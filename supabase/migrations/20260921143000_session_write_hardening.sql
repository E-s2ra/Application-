-- Bind all remaining client-writable rows and verified rewarded-ad credits to
-- the currently active Supabase auth session.

-- ---------------------------------------------------------------------------
-- 1. Direct PostgREST writes must not remain usable from a displaced JWT.
--    These are the only authenticated client DML surfaces left after the
--    previous hardening migrations.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_active_client_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
    PERFORM public.assert_active_auth_session();
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_active_client_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_active_client_write ON public.profiles;
CREATE TRIGGER enforce_active_client_write
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_client_write();

DROP TRIGGER IF EXISTS enforce_active_client_write ON public.favorites;
CREATE TRIGGER enforce_active_client_write
  BEFORE INSERT OR DELETE ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_client_write();

DROP TRIGGER IF EXISTS enforce_active_client_write ON public.follows;
CREATE TRIGGER enforce_active_client_write
  BEFORE INSERT OR DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_client_write();

-- ---------------------------------------------------------------------------
-- 2. AdMob SSV runs with service_role, so profile triggers intentionally do
--    not enforce the caller's auth session. Reject a credit transition unless
--    the rewarded-ad session still points at the live auth.sessions row and at
--    the account's current device claim. Raising here rolls back the entire RPC
--    transaction, including any preceding wallet mutation.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_live_reward_credit_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.status = 'credited'
     AND OLD.status IS DISTINCT FROM 'credited'
     AND (
       NEW.auth_session_id IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM public.device_sessions ds
         JOIN auth.sessions s
           ON s.id = ds.session_id
          AND s.user_id = ds.user_id
         WHERE ds.user_id = NEW.user_id
           AND ds.session_id = NEW.auth_session_id
       )
     ) THEN
    RAISE EXCEPTION 'Rewarded-ad auth session is no longer active';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_live_reward_credit_session()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_live_reward_credit_session
  ON public.rewarded_ad_sessions;
CREATE TRIGGER enforce_live_reward_credit_session
  BEFORE UPDATE OF status ON public.rewarded_ad_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_live_reward_credit_session();
