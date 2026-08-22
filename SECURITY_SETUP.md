# Security setup

The application now blocks screen capture on supported native devices, uses secure storage for the per-install device ID, and requires a strong password in the sign-up form.

## Required Supabase steps

1. Apply `supabase/migrations/20260819000000_single_device_security.sql` first, then `supabase/migrations/20260819010000_enforce_rls_and_protect_streams.sql`, in the Supabase SQL editor or with the Supabase CLI.
2. In **Authentication → Providers → Email**, set the minimum password length to **9** and enable the password strength requirements if available in the project dashboard. The app additionally enforces: uppercase, lowercase, number, symbol, and 9+ characters.
3. Ensure email confirmation is enabled for production accounts, and set a short refresh-token lifetime appropriate for your customers.

The SQL migration makes a new login replace the active device ID. Each open app checks it on launch, on foreground, and every 15 seconds. The previously active device signs out automatically.

## Platform limitations

Screen capture protection works in native Android/iOS builds, not in a web browser. No mobile app can prevent someone using another camera to photograph a screen. The app removes its link-copy/share action, but browser users still control their browser address bar.

Never store a publicly downloadable MP4 in `anime.video_url`. The new RLS migration prevents the mobile client from selecting that column, so the player intentionally stays unavailable until a secure stream service is connected. For protected paid content, have a server/Edge Function check the signed-in user and device session, then return a short-lived HLS or DASH playback URL from a DRM-enabled streaming provider. A direct MP4 URL (even if hidden in the UI) can always be copied from network traffic.

## Private cloud video API

Apply `supabase/migrations/20260822070000_secure_video_delivery.sql`, then deploy the `stream-playback` Edge Function. Store every video in the private `videos-private` bucket and enter only its relative object key (for example, `shows/naruto/episode-01/master.m3u8`) in the admin screen. The mobile app calls the Edge Function with the logged-in user's active device ID; the function returns a five-minute URL and does not expose a permanent cloud-storage location.

Set these Edge Function secrets before deployment:

- `PRIVATE_VIDEO_BUCKET=videos-private`
- `ALLOWED_WEB_ORIGINS=https://your-web-domain.example` (comma-separated if needed; native apps do not need an origin)

The Stream API assumes Supabase Storage. If your files are in another provider, keep them private and adapt only `stream-playback` to call that provider's server-side signing API. Never put that provider's access key in the Expo app.
