-- Migration: 010_create_themes.sql
CREATE TABLE IF NOT EXISTS public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  coin_cost integer NOT NULL DEFAULT 0 CHECK (coin_cost >= 0),
  preview_image text,
  primary_color text NOT NULL,
  accent_color text NOT NULL,
  glow_color text,
  badge_bg text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_themes_code ON public.themes(code);
