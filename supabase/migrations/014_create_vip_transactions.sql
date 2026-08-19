-- Migration: 014_create_vip_transactions.sql
CREATE TABLE IF NOT EXISTS public.vip_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ad_reward', 'coins_purchase', 'spin_reward', 'event_bonus', 'subscription')),
  duration integer NOT NULL CHECK (duration > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vip_transactions_user_id ON public.vip_transactions(user_id);
