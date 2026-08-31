-- =============================================================================
-- Migration: 20260831040000_grant_video_asset_key_column.sql
-- Purpose: Ensure the new video_asset_key column is accessible to the
--          secure stream delivery Edge Function (service role).
--
-- The watch screen does NOT read video_url/video_asset_key directly from the
-- client — it calls the secure-stream Edge Function (service role) which
-- resolves and returns a short-lived signed URL. However, the Edge Function
-- itself needs column access.
--
-- Additionally, grant SELECT on video_asset_key to authenticated so the
-- admin edit screen can load the current video key when editing anime.
-- =============================================================================

-- Grant authenticated users READ access to the video_asset_key column
-- (safe: the actual playable URL is only returned by the Edge Function)
GRANT SELECT (video_asset_key) ON public.anime TO authenticated;

-- Admins also need to UPDATE this column directly (for the edit-anime screen)
GRANT UPDATE (video_asset_key, video_url) ON public.anime TO authenticated;

-- Allow INSERT of video_asset_key by authenticated admins
GRANT INSERT (video_asset_key) ON public.anime TO authenticated;
