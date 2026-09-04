-- =============================================================================
-- Fix: Secure Watch Time Reward RPC
-- =============================================================================
-- Migration: 20260904000002_fix_watch_time_reward.sql
--
-- Description:
--   Rewrites `record_watch_time_reward` to:
--   1. Properly use FOR UPDATE row locking for concurrency safety.
--   2. Award 0 coins (protecting PPV economy).
--   3. Correctly award XP securely.
--   4. Ensure authenticated users have EXECUTE access.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_watch_time_reward(p_minutes integer DEFAULT 1)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_capped_minutes integer;
  v_reward_xp integer;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim watch time rewards.';
  END IF;

  -- Lock user profile to prevent race conditions
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Cap requested minutes between 1 and 5 per interval
  v_capped_minutes := LEAST(GREATEST(coalesce(p_minutes, 1), 1), 5);
  
  -- Calculate XP (minimum 10, scales with minutes)
  v_reward_xp := GREATEST(10, v_capped_minutes * 5);

  -- Atomically credit XP (0 coins) in profiles
  UPDATE public.profiles
  SET xp = xp + v_reward_xp,
      level = ((xp + v_reward_xp) / 300) + 1,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

  RETURN json_build_object(
    'success', true,
    'coins_awarded', 0,
    'xp_awarded', v_reward_xp,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp,
    'new_level', v_new_level
  );
END;
$$;

-- Ensure authenticated users can execute the function
GRANT EXECUTE ON FUNCTION public.record_watch_time_reward(integer) TO authenticated;
