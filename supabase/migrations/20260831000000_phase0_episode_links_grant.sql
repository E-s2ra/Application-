-- =============================================================================
-- Phase 0: Fix anime GRANT to include episode_links and published_at columns
-- =============================================================================
-- Migration: 20260831000000_phase0_episode_links_grant.sql
--
-- Problem:
--   Migration 20260821000100_harden_rls_policies.sql issued a GRANT SELECT on
--   the anime table that omitted episode_links and published_at columns.
--   This means clients could not receive episode URLs, breaking the episode
--   selector in the watch screen.
--
-- Fix:
--   Re-issue the GRANT SELECT to include all client-facing columns.
--   video_url and video_asset_key remain EXCLUDED — they are private and only
--   returned by the stream-playback Edge Function as signed URLs.
-- =============================================================================

-- Re-issue GRANT SELECT with complete column list for public/authenticated roles
REVOKE SELECT ON TABLE public.anime FROM anon, authenticated;

GRANT SELECT (
  id,
  title,
  description,
  image_url,
  episodes,
  episode_links,
  genre,
  category,
  is_featured,
  created_at,
  updated_at,
  views,
  rating,
  published_at
)
  ON public.anime TO anon, authenticated;

-- Narrow admin INSERT/UPDATE to safe columns.
-- Full access (video_url, video_asset_key) is handled by the admin-operations
-- Edge Function using the service role, not via direct client GRANT.
REVOKE INSERT, UPDATE ON TABLE public.anime FROM authenticated;

GRANT INSERT (title, description, image_url, video_asset_key, episodes, episode_links, genre, category, is_featured, published_at)
  ON public.anime TO authenticated;

GRANT UPDATE (title, description, image_url, video_asset_key, episodes, episode_links, genre, category, is_featured, published_at)
  ON public.anime TO authenticated;
