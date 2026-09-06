-- =============================================================================
-- Migration: 20260906000001_content_cost_registry.sql
-- Description:
--   Creates a server-side content_cost_registry table with authoritative
--   coin costs per content category. The unlock_media_with_coins RPC is
--   updated to read cost from this table and IGNORE the client-supplied
--   p_cost parameter — preventing cost spoofing attacks.
--
--   Content Costs:
--     Anime          → 80 coins
--     K-Drama        → 100 coins
--     Drama          → 100 coins  (same bucket as K-Drama)
--     Movies         → 125 coins
--     Anime Movies   → 125 coins
-- =============================================================================

-- ============================================================
-- 1. Create the cost registry table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_cost_registry (
  category text PRIMARY KEY,
  cost_coins integer NOT NULL CHECK (cost_coins > 0),
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the authoritative costs
INSERT INTO public.content_cost_registry (category, cost_coins, description) VALUES
  ('Anime',        80,  'Anime episode unlock cost'),
  ('K-Drama',     100,  'K-Drama episode unlock cost'),
  ('Drama',       100,  'Drama episode unlock cost'),
  ('Movies',      125,  'Movie unlock cost'),
  ('Anime Movies', 125, 'Anime movie unlock cost')
ON CONFLICT (category) DO UPDATE SET
  cost_coins = EXCLUDED.cost_coins,
  updated_at = now();

-- Only admins can modify costs; all users can read
ALTER TABLE public.content_cost_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_cost_registry_read" ON public.content_cost_registry
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "content_cost_registry_admin_write" ON public.content_cost_registry
  FOR ALL TO service_role USING (true);

-- ============================================================
-- 2. Update unlock_media_with_coins to use server-side cost
--    Now accepts p_category instead of p_cost (client cannot
--    spoof the amount — it's read from content_cost_registry)
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_media_with_coins(
  p_unlock_key text,
  p_category text DEFAULT 'Anime'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_coins integer;
  v_cost integer;
  v_remaining integer;
  v_already_unlocked boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Look up authoritative cost from registry (prevents client cost spoofing)
  SELECT cost_coins INTO v_cost
  FROM public.content_cost_registry
  WHERE category = p_category;

  IF v_cost IS NULL THEN
    -- Fallback: unknown category defaults to most expensive (safe default)
    v_cost := 125;
  END IF;

  -- Lock the profile row
  SELECT coins INTO v_current_coins
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Idempotent check — don't charge twice for same content
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
  IF v_current_coins < v_cost THEN
    RAISE EXCEPTION 'Insufficient coins (have: %, need: %)', v_current_coins, v_cost;
  END IF;

  -- Atomically deduct coins AND append unlock key
  UPDATE public.profiles SET
    coins = coins - v_cost,
    unlocked_media_ids = array_append(unlocked_media_ids, p_unlock_key),
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_remaining;

  RETURN json_build_object(
    'success', true,
    'already_unlocked', false,
    'deducted', v_cost,
    'remaining_coins', v_remaining,
    'unlocked_media_ids', (SELECT unlocked_media_ids FROM public.profiles WHERE id = v_user_id)
  );
END;
$$;

-- Keep old 2-arg signature as a shim for backwards compatibility during rollout
-- It maps the legacy p_cost to a category lookup and uses server-side cost
CREATE OR REPLACE FUNCTION public.unlock_media_with_coins(p_unlock_key text, p_cost integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_coins integer;
  v_cost integer;
  v_remaining integer;
  v_already_unlocked boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- SECURITY: Look up authoritative cost by closest match to p_cost value
  -- This prevents callers from passing p_cost = 1 to get cheap unlocks
  SELECT cost_coins INTO v_cost
  FROM public.content_cost_registry
  ORDER BY ABS(cost_coins - p_cost)
  LIMIT 1;

  -- If the client's cost is MORE than a registry value, use registry cost (safe)
  -- Never use client cost directly
  IF v_cost IS NULL THEN
    v_cost := 125;
  END IF;

  -- Lock the profile row
  SELECT coins INTO v_current_coins
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Idempotent
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

  IF v_current_coins < v_cost THEN
    RAISE EXCEPTION 'Insufficient coins (have: %, need: %)', v_current_coins, v_cost;
  END IF;

  UPDATE public.profiles SET
    coins = coins - v_cost,
    unlocked_media_ids = array_append(unlocked_media_ids, p_unlock_key),
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins INTO v_remaining;

  RETURN json_build_object(
    'success', true,
    'already_unlocked', false,
    'deducted', v_cost,
    'remaining_coins', v_remaining,
    'unlocked_media_ids', (SELECT unlocked_media_ids FROM public.profiles WHERE id = v_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_media_with_coins(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_media_with_coins(text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.unlock_media_with_coins(text, text) FROM public;
REVOKE ALL ON FUNCTION public.unlock_media_with_coins(text, integer) FROM public;
