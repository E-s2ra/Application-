-- Migration: 005_create_spins.sql
CREATE TABLE IF NOT EXISTS public.spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('coins', 'xp', 'vip', 'badge')),
  reward_value integer NOT NULL DEFAULT 0,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spins_user_id ON public.spins(user_id);
CREATE INDEX IF NOT EXISTS idx_spins_created_at ON public.spins(created_at);
