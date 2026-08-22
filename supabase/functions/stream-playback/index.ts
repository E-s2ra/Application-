import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, x-device-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

const json = (body: Record<string, unknown>, status = 200, origin?: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

function allowedOrigin(origin: string | null) {
  const allowed = (Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
}

serve(async (request) => {
  const origin = allowedOrigin(request.headers.get('origin'));
  if (request.method === 'OPTIONS') return new Response('ok', { headers: { ...corsHeaders, ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) } });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  try {
    const authorization = request.headers.get('authorization');
    const deviceId = request.headers.get('x-device-id');
    if (!authorization || !deviceId || deviceId.length < 20 || deviceId.length > 200) {
      return json({ error: 'Unauthorized' }, 401, origin);
    }

    const { animeId } = await request.json();
    if (typeof animeId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(animeId)) {
      return json({ error: 'Invalid playback request' }, 400, origin);
    }

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const adminClient = createClient(url, serviceRoleKey);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401, origin);

    const { data: deviceSession } = await adminClient
      .from('device_sessions')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .maybeSingle();
    if (!deviceSession) return json({ error: 'This device session is no longer active' }, 403, origin);

    const { data: anime } = await adminClient
      .from('anime')
      .select('video_asset_key')
      .eq('id', animeId)
      .maybeSingle();
    if (!anime?.video_asset_key) return json({ error: 'Playback is not configured' }, 404, origin);

    const bucket = Deno.env.get('PRIVATE_VIDEO_BUCKET') ?? 'videos-private';
    const { data: signed, error: signError } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(anime.video_asset_key, 300);
    if (signError || !signed?.signedUrl) return json({ error: 'Playback is unavailable' }, 503, origin);

    return json({ url: signed.signedUrl, expiresAt: new Date(Date.now() + 300_000).toISOString() }, 200, origin);
  } catch {
    return json({ error: 'Playback is unavailable' }, 500, origin);
  }
});
