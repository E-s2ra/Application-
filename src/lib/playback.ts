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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(animeId));

  if (isUuid) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stream-playback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({ animeId }),
      });

      if (response.ok) {
        return await response.json() as PlaybackResponse;
      }
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || `Playback request failed with status ${response.status}`);
    } catch (err: any) {
      throw new Error(err?.message || 'Unable to authorize playback session.');
    }
  }

  throw new Error('Invalid playback target or unauthorized access.');
}
