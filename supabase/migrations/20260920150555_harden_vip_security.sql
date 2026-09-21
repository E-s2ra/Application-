-- =============================================================================
-- Harden VIP grant/payment RPCs after auditing legacy migrations.
-- =============================================================================

-- The original admin_grant_vip uses p_target_user_id, while an earlier security
-- migration only replaced a p_user_id signature. Recreate the real function with
-- an authorization check that supports authenticated admins and the service-role
-- Edge Function used by admin-operations.
CREATE OR REPLACE FUNCTION public.admin_grant_vip(
  p_target_user_id uuid,
  p_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_expiry timestamptz;
  v_start timestamptz;
  v_expiry timestamptz;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: admin role required (code: VIP_GRANT_UNAUTHORIZED)';
    END IF;
  END IF;

  IF p_target_user_id IS NULL OR p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN
    RAISE EXCEPTION 'Invalid VIP grant parameters';
  END IF;

  SELECT vip_expires_at
    INTO v_current_expiry
    FROM public.profiles
   WHERE id = p_target_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile was not found';
  END IF;

  v_start := CASE
    WHEN v_current_expiry IS NOT NULL AND v_current_expiry > now()
      THEN v_current_expiry
    ELSE now()
  END;
  v_expiry := v_start + make_interval(days => p_days);

  UPDATE public.profiles
     SET is_vip = true,
         vip_expires_at = v_expiry,
         updated_at = now()
   WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'user_id', p_target_user_id,
    'is_vip', true,
    'vip_expires_at', v_expiry,
    'duration_days', p_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_vip(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid, integer)
  TO authenticated, service_role;

-- This legacy payment finalizer is not present in every deployment. Harden it
-- when it exists without making the migration fail on projects that never
-- installed the RASEDI integration.
DO $$
BEGIN
  IF to_regprocedure(
    'public.process_verified_rasedi_payment(uuid,text,text,text,integer,integer,jsonb)'
  ) IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.process_verified_rasedi_payment(uuid,text,text,text,integer,integer,jsonb) FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.process_verified_rasedi_payment(uuid,text,text,text,integer,integer,jsonb) TO service_role';
  END IF;
END;
$$;

-- Fix legacy coin-VIP renewal so an expired timestamp cannot shorten a newly
-- purchased period. This keeps the old RPC correct while the product uses the
-- manual subscription flow.
CREATE OR REPLACE FUNCTION public.activate_vip_with_coins(p_days integer, p_coin_cost integer DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_coins integer;
  v_remaining integer;
  v_new_expires timestamptz;
  v_vip_days integer;
  v_actual_cost integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_days <= 0 OR p_days > 365 THEN
    RAISE EXCEPTION 'VIP duration must be between 1 and 365 days';
  END IF;

  v_actual_cost := p_days * 50;

  SELECT coins INTO v_current_coins
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  IF v_current_coins < v_actual_cost THEN
    RAISE EXCEPTION 'Insufficient coins for VIP activation. Required: %', v_actual_cost;
  END IF;

  UPDATE public.profiles SET
    coins = coins - v_actual_cost,
    is_vip = true,
    vip_expires_at = greatest(coalesce(vip_expires_at, now()), now()) + make_interval(days => p_days),
    updated_at = now()
  WHERE id = v_user_id
  RETURNING coins, vip_expires_at INTO v_remaining, v_new_expires;

  v_vip_days := greatest(0, ceil(extract(epoch FROM (v_new_expires - now())) / 86400.0)::integer);

  INSERT INTO public.vip_transactions (user_id, type, duration, created_at)
  VALUES (v_user_id, 'coins_purchase', p_days, now());

  RETURN json_build_object(
    'success', true,
    'vip_days', v_vip_days,
    'vip_expires_at', v_new_expires,
    'remaining_coins', v_remaining,
    'cost', v_actual_cost
  );
END;
$$;
