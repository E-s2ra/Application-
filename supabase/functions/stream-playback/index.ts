import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, x-device-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOVIE_CATEGORIES = new Set(['Movies', 'Anime Movies']);
const SIGNED_URL_TTL_SECONDS = 300;

type EpisodeSource = {
  url?: unknown;
  is_default?: unknown;
};

type EpisodeLink = {
  episode?: unknown;
  url?: unknown;
  sources?: unknown;
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

function parseEpisode(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) return Number.NaN;
  return value;
}

function getEpisodeLocator(episodeLinks: unknown, episode: number): string | null {
  if (!Array.isArray(episodeLinks)) return null;
  const link = episodeLinks.find((entry: EpisodeLink) => Number(entry?.episode) === episode) as EpisodeLink | undefined;
  if (!link) return null;

  const sources = Array.isArray(link.sources) ? link.sources as EpisodeSource[] : [];
  const defaultSource = sources.find((source) => source?.is_default === true && typeof source?.url === 'string');
  const direct = typeof link.url === 'string' ? link.url.trim() : '';
  const fallbackSource = sources.find((source) => typeof source?.url === 'string');
  const locator = typeof defaultSource?.url === 'string'
    ? defaultSource.url.trim()
    : direct || (typeof fallbackSource?.url === 'string' ? fallbackSource.url.trim() : '');

  return locator || null;
}

function isSafePrivateAssetKey(value: string): boolean {
  return Boolean(value)
    && value.length <= 1000
    && !value.includes('://')
    && !value.includes('..')
    && !value.startsWith('/');
}

serve(async (request) => {
  const requestOrigin = request.headers.get('origin');
  const origin = allowedOrigin(requestOrigin);
  if (requestOrigin && !origin) {
    return json({ error: 'Origin is not allowed' }, 403);
  }
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { ...corsHeaders, ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
    });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  try {
    const authorization = request.headers.get('authorization');
    const deviceId = request.headers.get('x-device-id');
    if (!authorization || !deviceId || deviceId.length < 20 || deviceId.length > 200) {
      return json({ error: 'Unauthorized' }, 401, origin);
    }

    const payload = await request.json().catch(() => null) as { animeId?: unknown; episode?: unknown } | null;
    const animeId = payload?.animeId;
    const episode = parseEpisode(payload?.episode);
    if (typeof animeId !== 'string' || !UUID_RE.test(animeId) || Number.isNaN(episode)) {
      return json({ error: 'Invalid playback request' }, 400, origin);
    }

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!url || !anonKey || !serviceRoleKey) {
      return json({ error: 'Playback is unavailable' }, 503, origin);
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: 'Unauthorized' }, 401, origin);

    const { data: isCurrentDevice, error: deviceError } = await userClient.rpc('is_current_device', {
      p_device_id: deviceId,
    });
    if (deviceError || isCurrentDevice !== true) {
      return json({ error: 'This device session is no longer active' }, 403, origin);
    }

    const [{ data: anime, error: animeError }, { data: profile, error: profileError }] = await Promise.all([
      adminClient
        .from('anime')
        .select('id, category, episodes, video_asset_key, episode_links')
        .eq('id', animeId)
        .maybeSingle(),
      adminClient
        .from('profiles')
        .select('is_vip, vip_expires_at')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (animeError || !anime) return json({ error: 'Playback target was not found' }, 404, origin);
    if (profileError || !profile) return json({ error: 'Unauthorized' }, 401, origin);
    const isMovie = MOVIE_CATEGORIES.has(String(anime.category ?? ''));
    let canonicalEpisode: number | null = null;
    if (!isMovie) {
      if (episode === null) {
        return json({ error: 'Episode is required for series playback' }, 400, origin);
      }
      const episodeCount = Number(anime.episodes ?? 0);
      if (!Number.isSafeInteger(episodeCount) || episodeCount < 1 || episode > episodeCount) {
        return json({ error: 'Invalid episode' }, 400, origin);
      }
      canonicalEpisode = episode;
    }

    const episodeLocator = canonicalEpisode === null
      ? getEpisodeLocator(anime.episode_links, 1)
      : getEpisodeLocator(anime.episode_links, canonicalEpisode);
    const fallbackLocator = typeof anime.video_asset_key === 'string' ? anime.video_asset_key.trim() : '';
    const mediaLocator = episodeLocator || (canonicalEpisode === null || canonicalEpisode === 1 ? fallbackLocator : '');
    if (!mediaLocator) return json({ error: 'Playback is not configured for this episode' }, 404, origin);

    const unlockKey = isMovie ? animeId : `${animeId}_ep_${canonicalEpisode}`;
    const nowIso = new Date().toISOString();
    const vipExpiry = typeof profile.vip_expires_at === 'string'
      ? Date.parse(profile.vip_expires_at)
      : Number.NaN;
    const hasActiveVip = profile.is_vip === true && Number.isFinite(vipExpiry) && vipExpiry > Date.now();

    let hasEntitlement = false;
    if (!hasActiveVip) {
      let entitlementQuery = adminClient
        .from('media_entitlements')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('anime_id', animeId)
        .eq('unlock_key', unlockKey)
        .gt('expires_at', nowIso);

      entitlementQuery = canonicalEpisode === null
        ? entitlementQuery.is('episode', null)
        : entitlementQuery.eq('episode', canonicalEpisode);

      const { data: entitlement, error: entitlementError } = await entitlementQuery.maybeSingle();
      if (entitlementError) return json({ error: 'Playback authorization is unavailable' }, 503, origin);
      hasEntitlement = Boolean(entitlement);
    }

    if (!hasActiveVip && !hasEntitlement) {
      return json({ error: 'Playback entitlement required' }, 403, origin);
    }

    if (!isSafePrivateAssetKey(mediaLocator)) {
      return json({ error: 'Playback asset is misconfigured' }, 503, origin);
    }
    const bucket = Deno.env.get('PRIVATE_VIDEO_BUCKET') ?? 'videos-private';
    const { data: signed, error: signError } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(mediaLocator, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed?.signedUrl) return json({ error: 'Playback is unavailable' }, 503, origin);

    return json(
      {
        url: signed.signedUrl,
        expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      },
      200,
      origin,
    );
  } catch {
    return json({ error: 'Playback is unavailable' }, 500, origin);
  }
});
