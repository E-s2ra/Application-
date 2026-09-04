-- =============================================================================
-- Migration: 20260904000004_unlimited_ads.sql
-- Description:
--   Removes the daily cap (50) on rewarded ads while maintaining the 10s cooldown
--   to allow unlimited ad-watching for revenue generation while stopping spam bots.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.claim_rewarded_ad(
  p_ad_unit_id text DEFAULT NULL,
  p_reward_type text DEFAULT 'coins',
  p_verification_token text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_reward_coins integer := 12;
  v_reward_xp integer := 50;
  v_last_watched timestamptz;
  v_new_coins integer;
  v_new_xp integer;
  v_new_level integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to claim rewarded ad';
  END IF;

  -- Anti-Spam Rate Limit: Minimum 10 seconds between claims
  SELECT max(watched_at) INTO v_last_watched
  FROM public.rewarded_ads WHERE user_id = v_user_id;

  IF v_last_watched IS NOT NULL AND (now() - v_last_watched) < interval '10 seconds' THEN
    RAISE EXCEPTION 'Please wait before claiming another rewarded ad.';
  END IF;

  -- NOTE: The daily cap has been removed here to allow unlimited revenue generation.

  -- Lock user profile row for atomic update
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Record into rewarded_ads ledger
  INSERT INTO public.rewarded_ads (user_id, ad_unit_id, reward_type, reward_coins, watched_at)
  VALUES (v_user_id, coalesce(p_ad_unit_id, 'admob-rewarded'), p_reward_type, v_reward_coins, now());

  -- Atomically update profile coins and xp
  UPDATE public.profiles SET
    coins = coins + v_reward_coins,
    xp = xp + v_reward_xp,
    level = ((xp + v_reward_xp) / 300) + 1,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, xp, level INTO v_new_coins, v_new_xp, v_new_level;

  RETURN json_build_object(
    'success', true,
    'reward_coins', v_reward_coins,
    'reward_xp', v_reward_xp,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp,
    'new_level', v_new_level
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_rewarded_ad(text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.claim_rewarded_ad(text, text, text) FROM public;
