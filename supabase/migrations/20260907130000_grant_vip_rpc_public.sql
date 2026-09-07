-- Security Definer RPC function to grant VIP by email, username, or user ID
CREATE OR REPLACE FUNCTION public.admin_grant_vip_by_identifier(
  p_target text,
  p_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_user_id uuid;
  v_current_expiry timestamptz;
  v_start timestamptz;
  v_expiry timestamptz;
  v_target_clean text;
BEGIN
  IF p_target IS NULL OR p_days IS NULL OR p_days < 1 OR p_days > 3650 THEN
    RAISE EXCEPTION 'Invalid parameters';
  END IF;

  v_target_clean := lower(trim(p_target));

  -- Search profiles by email, username, or id
  SELECT id INTO v_target_user_id
  FROM public.profiles
  WHERE lower(email) = v_target_clean 
     OR lower(username) = v_target_clean 
     OR id::text = v_target_clean
  LIMIT 1;

  -- Fallback search in auth.users if not found in profiles table
  IF v_target_user_id IS NULL THEN
    SELECT id INTO v_target_user_id
    FROM auth.users
    WHERE lower(email) = v_target_clean OR id::text = v_target_clean
    LIMIT 1;
  END IF;

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'User "%" not found', p_target;
  END IF;

  SELECT vip_expires_at INTO v_current_expiry
  FROM public.profiles
  WHERE id = v_target_user_id
  FOR UPDATE;

  v_start := CASE
    WHEN v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN v_current_expiry
    ELSE now()
  END;

  v_expiry := v_start + make_interval(days => p_days);

  INSERT INTO public.profiles (id, is_vip, vip_expires_at, updated_at)
  VALUES (v_target_user_id, true, v_expiry, now())
  ON CONFLICT (id) DO UPDATE
     SET is_vip = true,
         vip_expires_at = v_expiry,
         updated_at = now();

  RETURN jsonb_build_object(
    'user_id', v_target_user_id,
    'is_vip', true,
    'vip_expires_at', v_expiry,
    'duration_days', p_days
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.admin_grant_vip_by_identifier(text, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid, integer) TO authenticated, anon;

-- Update RLS on profiles to allow admins to update profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id OR public.is_admin()
  );
