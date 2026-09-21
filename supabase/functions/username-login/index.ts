import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function allowedOrigin(origin: string | null): string | null {
  const allowed = (Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
}

function requestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    request.headers.get('cf-connecting-ip')?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || forwarded
    || 'unknown'
  ).slice(0, 200);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const looksLikeEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  try {
    const payload = await request.json().catch(() => null) as {
      identifier?: unknown;
      password?: unknown;
    } | null;

    const identifier = typeof payload?.identifier === 'string'
      ? payload.identifier.trim()
      : '';
    const password = typeof payload?.password === 'string'
      ? payload.password
      : '';

    if (!identifier || identifier.length > 320 || !password || password.length > 512) {
      return json({ error: 'Invalid login credentials' }, 401, origin);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Login is unavailable' }, 503, origin);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const normalizedIdentifier = identifier.toLowerCase();
    const ipHash = await sha256Hex(requestIp(request));
    // Scope identifier throttling to the requesting network as well as the
    // account identifier. A remote attacker should not be able to globally
    // lock a victim's username with eight deliberate failures.
    const identifierHash = await sha256Hex(`${ipHash}:${normalizedIdentifier}`);
    const { data: rateLimitAllowed, error: rateLimitError } = await adminClient.rpc(
      'consume_username_login_rate_limit',
      {
        p_ip_hash: ipHash,
        p_identifier_hash: identifierHash,
      },
    );
    if (rateLimitError) {
      return json({ error: 'Login is unavailable' }, 503, origin);
    }
    if (rateLimitAllowed !== true) {
      return json({ error: 'Too many login attempts. Try again later.' }, 429, origin);
    }

    let email = normalizedIdentifier;
    if (!looksLikeEmail(email)) {
      const { data: resolvedEmail, error: lookupError } = await adminClient.rpc(
        'resolve_username_login_email',
        { p_identifier: identifier },
      );

      if (lookupError || typeof resolvedEmail !== 'string' || !resolvedEmail) {
        return json({ error: 'Invalid login credentials' }, 401, origin);
      }

      email = resolvedEmail.toLowerCase();
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return json({ error: 'Invalid login credentials' }, 401, origin);
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
    }, 200, origin);
  } catch {
    return json({ error: 'Login is unavailable' }, 500, origin);
  }
});
