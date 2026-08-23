-- ============================================================================
-- Migration: 20260823010000_rasedi_payment_integration.sql
-- Description: Adds RASEDI payment tracking and atomic idempotent VIP activation
-- ============================================================================

-- 1. Create payments table for RASEDI transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rasedi_order_id text UNIQUE,
  rasedi_transaction_id text UNIQUE,
  plan_id text NOT NULL CHECK (plan_id IN ('vip_1_month', 'vip_3_months', 'vip_6_months', 'vip_1_year')),
  amount_iqd integer NOT NULL CHECK (amount_iqd > 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  currency text NOT NULL DEFAULT 'IQD',
  payment_method text DEFAULT 'rasedi_fib',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_rasedi_order ON public.payments(rasedi_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_rasedi_tx ON public.payments(rasedi_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment history
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Only service role / backend can insert and update payments
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all"
  ON public.payments FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.payments TO authenticated;

-- 2. Atomic, Idempotent VIP Activation Function for Verified Payments
CREATE OR REPLACE FUNCTION public.process_verified_rasedi_payment(
  p_user_id uuid,
  p_rasedi_order_id text,
  p_rasedi_transaction_id text,
  p_plan_id text,
  p_amount_iqd integer,
  p_duration_days integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_existing_payment record;
  v_profile record;
  v_new_expires_at timestamptz;
BEGIN
  -- 1. Check for Idempotency by Transaction ID
  IF p_rasedi_transaction_id IS NOT NULL AND trim(p_rasedi_transaction_id) <> '' THEN
    SELECT * INTO v_existing_payment
    FROM public.payments
    WHERE rasedi_transaction_id = p_rasedi_transaction_id AND status = 'completed';

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'message', 'Payment was already processed successfully.'
      );
    END IF;
  END IF;

  -- 2. Validate Amount Against Plan ID (Strict Backend Enforcement)
  IF p_plan_id = 'vip_1_month' AND p_amount_iqd <> 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount for 1 Month plan (expected 5,000 IQD).');
  ELSIF p_plan_id = 'vip_3_months' AND p_amount_iqd <> 13000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount for 3 Months plan (expected 13,000 IQD).');
  ELSIF p_plan_id = 'vip_6_months' AND p_amount_iqd <> 25000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount for 6 Months plan (expected 25,000 IQD).');
  ELSIF p_plan_id = 'vip_1_year' AND p_amount_iqd <> 50000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount for 1 Year plan (expected 50,000 IQD).');
  END IF;

  -- 3. Calculate Expiration Date (Extends from current expiration if still active)
  SELECT is_vip, vip_expires_at INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found.');
  END IF;

  IF v_profile.vip_expires_at IS NOT NULL AND v_profile.vip_expires_at > now() THEN
    v_new_expires_at := v_profile.vip_expires_at + (p_duration_days || ' days')::interval;
  ELSE
    v_new_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;

  -- 4. Update Profile VIP Status
  UPDATE public.profiles
  SET
    is_vip = true,
    vip_expires_at = v_new_expires_at,
    updated_at = now()
  WHERE id = p_user_id;

  -- 5. Record VIP Transaction
  INSERT INTO public.vip_transactions (
    user_id,
    type,
    duration,
    created_at
  ) VALUES (
    p_user_id,
    'subscription',
    p_duration_days,
    now()
  );

  -- 6. Upsert/Update Payment Record
  INSERT INTO public.payments (
    user_id,
    rasedi_order_id,
    rasedi_transaction_id,
    plan_id,
    amount_iqd,
    duration_days,
    currency,
    status,
    metadata,
    completed_at
  ) VALUES (
    p_user_id,
    p_rasedi_order_id,
    p_rasedi_transaction_id,
    p_plan_id,
    p_amount_iqd,
    p_duration_days,
    'IQD',
    'completed',
    p_metadata,
    now()
  )
  ON CONFLICT (rasedi_order_id) DO UPDATE SET
    rasedi_transaction_id = EXCLUDED.rasedi_transaction_id,
    status = 'completed',
    metadata = EXCLUDED.metadata,
    completed_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'is_vip', true,
    'vip_expires_at', v_new_expires_at,
    'duration_days_added', p_duration_days
  );
END;
$$;
