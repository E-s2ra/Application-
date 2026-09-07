-- Atomic VIP grant used by the authenticated admin Edge Function.
-- The Edge Function performs the admin authorization check before calling this
-- SECURITY DEFINER function with the service-role client.
CREATE OR REPLACE FUNCTION public.admin_grant_vip(
  p_target_user_id uuid,
  p_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_expiry timestamptz;
  v_start timestamptz;
  v_expiry timestamptz;
BEGIN
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

REVOKE ALL ON FUNCTION public.admin_grant_vip(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid, integer) TO service_role;
