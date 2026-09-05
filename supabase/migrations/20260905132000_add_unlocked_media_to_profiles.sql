-- =============================================================================
-- Migration: 20260905132000_add_unlocked_media_to_profiles.sql
-- Description:
--   Adds unlocked_media_ids column to profiles so that unlocked content
--   persists across devices and sessions (not just local storage).
--   Also creates an unlock_media RPC that atomically deducts coins AND
--   records the unlock key in one transaction.
-- =============================================================================

-- 1. Add the column (safe if already exists)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS unlocked_media_ids text[] NOT NULL DEFAULT '{}';

-- 2. New RPC: unlock_media_with_coins — atomically deducts coins AND saves unlock key
CREATE OR REPLACE FUNCTION public.unlock_media_with_coins(p_unlock_key text, p_cost integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_coins integer;
  v_remaining integer;
  v_already_unlocked boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_cost <= 0 THEN
    RAISE EXCEPTION 'Cost must be positive';
  END IF;

  -- Lock the profile row
  SELECT coins INTO v_current_coins
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Check if already unlocked (idempotent — don't charge twice)
  SELECT p_unlock_key = ANY(unlocked_media_ids) INTO v_already_unlocked
  FROM public.profiles WHERE id = v_user_id;

  IF v_already_unlocked THEN
    RETURN json_build_object(
      'success', true,
      'already_unlocked', true,
      'deducted', 0,
      'remaining_coins', v_current_coins,
      'unlocked_media_ids', (SELECT unlocked_media_ids FROM public.profiles WHERE id = v_user_id)
    );
  END IF;

  -- Check balance
  IF v_current_coins < p_cost THEN
    RAISE EXCEPTION 'Insufficient coins (have: %, need: %)', v_current_coins, p_cost;
  END IF;

  -- Atomically deduct coins AND add unlock key
  UPDATE public.profiles SET
    coins = coins - p_cost,
    unlocked_media_ids = array_append(unlocked_media_ids, p_unlock_key),
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_remaining;

  RETURN json_build_object(
    'success', true,
    'already_unlocked', false,
    'deducted', p_cost,
    'remaining_coins', v_remaining,
    'unlocked_media_ids', (SELECT unlocked_media_ids FROM public.profiles WHERE id = v_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_media_with_coins(text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.unlock_media_with_coins(text, integer) FROM public;
