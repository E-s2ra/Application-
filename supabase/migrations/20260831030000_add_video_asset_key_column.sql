-- =============================================================================
-- Migration: 20260831030000_add_video_asset_key_column.sql
-- Purpose: Resolve the dual video-column naming confusion.
--
-- The app was written with `video_asset_key` but the DB only had `video_url`.
-- This caused schema-cache errors and brittle multi-retry insert/update logic.
--
-- Fix:
--   1. Add `video_asset_key` column (text, nullable) to public.anime
--   2. Backfill it from video_url for existing rows
--   3. Add a sync trigger so inserting/updating either column keeps both in sync
--
-- After this migration, the admin-operations Edge Function and the client can
-- safely use either column name — they will always hold the same value.
-- =============================================================================

-- 1. Add the video_asset_key column if it does not already exist
ALTER TABLE public.anime
    ADD COLUMN IF NOT EXISTS video_asset_key text;

-- 2. Backfill: copy existing video_url values into video_asset_key
UPDATE public.anime
    SET video_asset_key = video_url
    WHERE video_asset_key IS NULL AND video_url IS NOT NULL;

-- 3. Trigger function: keep both columns in sync on insert/update
CREATE OR REPLACE FUNCTION public.sync_video_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Prefer video_asset_key if it was provided; otherwise fall back to video_url
    IF NEW.video_asset_key IS NOT NULL AND NEW.video_url IS NULL THEN
        NEW.video_url := NEW.video_asset_key;
    ELSIF NEW.video_url IS NOT NULL AND NEW.video_asset_key IS NULL THEN
        NEW.video_asset_key := NEW.video_url;
    ELSIF NEW.video_asset_key IS NOT NULL AND NEW.video_url IS NOT NULL THEN
        -- If both are provided, prefer video_asset_key as the canonical value
        NEW.video_url := NEW.video_asset_key;
    END IF;
    RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS trg_sync_video_columns ON public.anime;

CREATE TRIGGER trg_sync_video_columns
    BEFORE INSERT OR UPDATE ON public.anime
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_video_columns();

-- Add an index on video_asset_key for faster lookups by video key
CREATE INDEX IF NOT EXISTS idx_anime_video_asset_key ON public.anime(video_asset_key)
    WHERE video_asset_key IS NOT NULL;
