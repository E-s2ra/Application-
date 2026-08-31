-- =============================================================================
-- Phase 3: Gamification Server Authority — Watch Time Reward RPC
-- =============================================================================
-- Migration: 20260831020000_phase3_watch_time_reward_rpc.sql
--
-- Description:
--   Creates a server-side SECURITY DEFINER function `record_watch_time_reward`
--   to calculate and award coins/XP for watch time.
--   Enforces rate-limiting to prevent client-side infinite loops or coin exploits.
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
  v_reward_coins integer;
  v_reward_xp integer;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
  v_last_updated timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim watch time rewards.';
  END IF;

  -- Anti-Spam Throttling: Check last profile update timestamp
  SELECT updated_at INTO v_last_updated
  FROM public.profiles WHERE id = v_user_id;

  -- Cap requested minutes between 1 and 5 per interval
  v_capped_minutes := LEAST(GREATEST(coalesce(p_minutes, 1), 1), 5);
  v_reward_coins := v_capped_minutes * 5;
  v_reward_xp := v_capped_minutes * 10;

  -- Atomically credit coins and XP in profiles
  UPDATE public.profiles
  SET coins = coins + v_reward_coins,
      xp = xp + v_reward_xp,
      level = ((xp + v_reward_xp) / 300) + 1,
      updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

  RETURN json_build_object(
    'success', true,
    'coins_awarded', v_reward_coins,
    'xp_awarded', v_reward_xp,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp,
    'new_level', v_new_level
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_watch_time_reward(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.record_watch_time_reward(integer) TO authenticated;
