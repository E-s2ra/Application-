-- Migration: 002_create_daily_logins.sql
CREATE TABLE IF NOT EXISTS public.daily_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  login_date date NOT NULL DEFAULT current_date,
  reward_claimed boolean NOT NULL DEFAULT true,
  coins_awarded integer NOT NULL DEFAULT 60 CHECK (coins_awarded >= 0),
  xp_awarded integer NOT NULL DEFAULT 90 CHECK (xp_awarded >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_daily_login UNIQUE (user_id, login_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_logins_user_date ON public.daily_logins(user_id, login_date);
