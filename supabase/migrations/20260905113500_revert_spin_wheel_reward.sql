-- =============================================================================
-- Migration: 20260905113500_revert_spin_wheel_reward.sql
-- Description:
--   Reverts the spin lucky wheel coin reward back to 50 coins as requested by user.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.spin_lucky_wheel()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_already_spun boolean;
  v_random integer;
  v_reward_type text;
  v_reward_value integer;
  v_reward_label text;
  v_new_coins integer;
  v_new_xp integer;
  v_vip_days integer := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to spin wheel';
  END IF;

  -- FIX CRITICAL: Lock the profile row FIRST
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Check if user already spun today
  SELECT EXISTS (
    SELECT 1 FROM public.spins
    WHERE user_id = v_user_id AND created_at::date = current_date
  ) INTO v_already_spun;

  IF v_already_spun THEN
    SELECT coins, xp INTO v_new_coins, v_new_xp FROM public.profiles WHERE id = v_user_id;
    RETURN json_build_object(
      'success', false,
      'reason', 'already_spun_today',
      'new_coins', v_new_coins,
      'new_xp', v_new_xp
    );
  END IF;

  v_random := floor(random() * 6) + 1;

  -- Reverted to 50 coins
  IF v_random = 1 THEN
    v_reward_type := 'coins'; v_reward_value := 50; v_reward_label := '50 Coins';
  ELSIF v_random = 2 THEN
    v_reward_type := 'xp'; v_reward_value := 50; v_reward_label := '50 XP';
  ELSIF v_random = 3 THEN
    v_reward_type := 'vip'; v_reward_value := 1; v_reward_label := '1-Day VIP Pass'; v_vip_days := 1;
  ELSIF v_random = 4 THEN
    v_reward_type := 'coins'; v_reward_value := 50; v_reward_label := '50 Coins';
  ELSIF v_random = 5 THEN
    v_reward_type := 'xp'; v_reward_value := 100; v_reward_label := '100 XP';
  ELSE
    v_reward_type := 'coins'; v_reward_value := 500; v_reward_label := '500 Coins (Jackpot!)';
  END IF;

  INSERT INTO public.spins (user_id, reward_type, reward_value, label, created_at)
  VALUES (v_user_id, v_reward_type, v_reward_value, v_reward_label, now());

  IF v_reward_type = 'coins' THEN
    UPDATE public.profiles SET coins = coins + v_reward_value, updated_at = now() WHERE id = v_user_id;
  ELSIF v_reward_type = 'xp' THEN
    UPDATE public.profiles SET xp = xp + v_reward_value, level = ((xp + v_reward_value) / 300) + 1, updated_at = now() WHERE id = v_user_id;
  ELSIF v_reward_type = 'vip' THEN
    UPDATE public.profiles SET
      is_vip = true,
      vip_expires_at = coalesce(vip_expires_at, now()) + interval '1 day',
      updated_at = now()
    WHERE id = v_user_id;
    INSERT INTO public.vip_transactions (user_id, type, duration, created_at)
    VALUES (v_user_id, 'spin_reward', 1, now());
  END IF;

  SELECT coins, xp INTO v_new_coins, v_new_xp FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'reward_type', v_reward_type,
    'reward_value', v_reward_value,
    'reward_label', v_reward_label,
    'new_coins', v_new_coins,
    'new_xp', v_new_xp
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.spin_lucky_wheel() TO authenticated;
