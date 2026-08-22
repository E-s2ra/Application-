import { getDeviceId } from '@/lib/device-session';
import { supabase, SUPABASE_URL } from '@/lib/supabase';

type PlaybackResponse = {
  url: string;
  expiresAt: string;
};

/**
 * Requests a short-lived stream URL only after the server checks both the
 * signed-in account and its active device. Never persist the returned URL.
 */
export async function getPlaybackUrl(animeId: string): Promise<PlaybackResponse> {
  const [{ data: { session } }, deviceId] = await Promise.all([
    supabase.auth.getSession(),
    getDeviceId(),
  ]);

  if (!session) throw new Error('Please sign in to play this title.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/stream-playback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({ animeId }),
  });

  if (!response.ok) {
    throw new Error('Playback is unavailable for this title.');
  }

  return response.json() as Promise<PlaybackResponse>;
}
