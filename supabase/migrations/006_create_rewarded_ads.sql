-- Migration: 006_create_rewarded_ads.sql
CREATE TABLE IF NOT EXISTS public.rewarded_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_unit_id text,
  reward_type text NOT NULL DEFAULT 'coins',
  reward_coins integer NOT NULL DEFAULT 50 CHECK (reward_coins >= 0),
  watched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewarded_ads_user_id ON public.rewarded_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_rewarded_ads_watched_at ON public.rewarded_ads(watched_at);
