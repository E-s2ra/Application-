-- Migration: 003_create_missions.sql
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  reward_xp integer NOT NULL DEFAULT 0 CHECK (reward_xp >= 0),
  target integer NOT NULL DEFAULT 1 CHECK (target >= 1),
  mission_type text NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'event')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_type ON public.missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_code ON public.missions(code);
