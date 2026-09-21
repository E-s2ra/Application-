import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

type VerifierKey = {
  keyId?: number | string;
  key_id?: number | string;
  pem?: string;
  base64?: string;
};

type VerifierKeyResponse = {
  keys?: VerifierKey[];
};

const GOOGLE_VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';
const KEY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_CALLBACK_AGE_MS = 15 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 2 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSACTION_RE = /^[A-Za-z0-9._:-]{8,256}$/;
const DEFAULT_REWARDED_AD_UNITS = [
  'ca-app-pub-6508988701499376/4443363765',
  'ca-app-pub-6508988701499376/3978816560',
];

let cachedKeys: VerifierKey[] = [];
let keysFetchedAt = 0;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function spkiBytes(key: VerifierKey): Uint8Array {
  if (key.base64) return decodeBase64(key.base64);
  if (!key.pem) throw new Error('Verifier key has no public key material');
  const body = key.pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  return decodeBase64(body);
}

function readDerLength(bytes: Uint8Array, offset: number): { length: number; next: number } {
  const first = bytes[offset];
  if (first === undefined) throw new Error('Invalid DER length');
  if ((first & 0x80) === 0) return { length: first, next: offset + 1 };
  const count = first & 0x7f;
  if (count < 1 || count > 4 || offset + count >= bytes.length) throw new Error('Invalid DER length');
  let length = 0;
  for (let i = 0; i < count; i += 1) length = (length << 8) | bytes[offset + 1 + i];
  return { length, next: offset + 1 + count };
}

function derIntegerToFixed32(integer: Uint8Array): Uint8Array {
  let start = 0;
  while (start < integer.length - 1 && integer[start] === 0) start += 1;
  const trimmed = integer.subarray(start);
  if (trimmed.length > 32) throw new Error('Invalid ECDSA integer length');
  const result = new Uint8Array(32);
  result.set(trimmed, 32 - trimmed.length);
  return result;
}

function derEcdsaToRaw(signature: Uint8Array): Uint8Array {
  let offset = 0;
  if (signature[offset++] !== 0x30) throw new Error('Invalid DER signature');
  const sequence = readDerLength(signature, offset);
  offset = sequence.next;
  if (offset + sequence.length !== signature.length) throw new Error('Invalid DER sequence length');

  if (signature[offset++] !== 0x02) throw new Error('Invalid DER signature');
  const rLength = readDerLength(signature, offset);
  offset = rLength.next;
  const r = signature.subarray(offset, offset + rLength.length);
  offset += rLength.length;

  if (signature[offset++] !== 0x02) throw new Error('Invalid DER signature');
  const sLength = readDerLength(signature, offset);
  offset = sLength.next;
  const s = signature.subarray(offset, offset + sLength.length);
  offset += sLength.length;
  if (offset !== signature.length) throw new Error('Invalid DER signature');

  const raw = new Uint8Array(64);
  raw.set(derIntegerToFixed32(r), 0);
  raw.set(derIntegerToFixed32(s), 32);
  return raw;
}

async function fetchVerifierKeys(forceRefresh = false): Promise<VerifierKey[]> {
  if (!forceRefresh && cachedKeys.length > 0 && Date.now() - keysFetchedAt < KEY_CACHE_TTL_MS) {
    return cachedKeys;
  }

  const response = await fetch(GOOGLE_VERIFIER_KEYS_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Unable to fetch AdMob verifier keys');
  const payload = await response.json() as VerifierKeyResponse;
  if (!Array.isArray(payload.keys) || payload.keys.length === 0) {
    throw new Error('No AdMob verifier keys available');
  }

  cachedKeys = payload.keys;
  keysFetchedAt = Date.now();
  return cachedKeys;
}

function findKey(keys: VerifierKey[], keyId: string): VerifierKey | undefined {
  return keys.find((key) => String(key.keyId ?? key.key_id ?? '') === keyId);
}

async function getVerifierKey(keyId: string): Promise<VerifierKey> {
  let keys = await fetchVerifierKeys(false);
  let key = findKey(keys, keyId);
  if (!key) {
    keys = await fetchVerifierKeys(true);
    key = findKey(keys, keyId);
  }
  if (!key) throw new Error('Unknown AdMob verifier key');
  return key;
}

async function verifySignature(rawQuery: string, signatureParam: string, keyId: string): Promise<boolean> {
  const marker = '&signature=';
  const signatureIndex = rawQuery.lastIndexOf(marker);
  if (signatureIndex <= 0) return false;

  const signedContent = rawQuery.slice(0, signatureIndex);
  const suffix = rawQuery.slice(signatureIndex + marker.length);
  const keyMarker = '&key_id=';
  const keyIndex = suffix.indexOf(keyMarker);
  if (keyIndex <= 0 || suffix.indexOf('&', keyIndex + keyMarker.length) !== -1) return false;

  const rawSignature = suffix.slice(0, keyIndex);
  const rawKeyId = suffix.slice(keyIndex + keyMarker.length);
  if (decodeURIComponent(rawSignature) !== signatureParam || decodeURIComponent(rawKeyId) !== keyId) return false;

  const verifierKey = await getVerifierKey(keyId);
  const publicKey = await crypto.subtle.importKey(
    'spki',
    spkiBytes(verifierKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  const derSignature = decodeBase64Url(signatureParam);
  const rawSignatureBytes = derEcdsaToRaw(derSignature);
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    rawSignatureBytes,
    new TextEncoder().encode(signedContent),
  );
}

function requireSingleParam(params: URLSearchParams, name: string): string | null {
  const values = params.getAll(name);
  return values.length === 1 && values[0] ? values[0] : null;
}

function configuredAdUnits(): string[] {
  const values = [
    ...DEFAULT_REWARDED_AD_UNITS,
    Deno.env.get('ADMOB_REWARDED_AD_UNIT_ID') ?? '',
    ...(Deno.env.get('ADMOB_REWARDED_AD_UNIT_IDS') ?? '').split(','),
  ]
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
}

function resolveConfiguredAdUnit(received: string, configured: string[]): string | null {
  for (const value of configured) {
    if (value === received) return value;
    const slashIndex = value.lastIndexOf('/');
    if (slashIndex >= 0 && value.slice(slashIndex + 1) === received) return value;
  }
  return null;
}

serve(async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  try {
    const requestUrl = new URL(request.url);
    const rawQuery = requestUrl.search.startsWith('?') ? requestUrl.search.slice(1) : requestUrl.search;
    if (!rawQuery) return json({ error: 'Invalid callback' }, 400);

    const params = requestUrl.searchParams;
    const signature = requireSingleParam(params, 'signature');
    const keyId = requireSingleParam(params, 'key_id');
    const timestampRaw = requireSingleParam(params, 'timestamp');
    const transactionId = requireSingleParam(params, 'transaction_id');
    const userId = requireSingleParam(params, 'user_id');
    const customData = requireSingleParam(params, 'custom_data');
    const adUnit = requireSingleParam(params, 'ad_unit');
    const rewardAmountRaw = requireSingleParam(params, 'reward_amount');
    const rewardItem = requireSingleParam(params, 'reward_item');

    if (!signature || !keyId || !timestampRaw || !transactionId || !userId || !customData || !adUnit || !rewardAmountRaw || !rewardItem) {
      return json({ error: 'Invalid callback' }, 400);
    }

    if (!/^\d+$/.test(keyId) || !/^\d{10,17}$/.test(timestampRaw) || !/^\d{1,9}$/.test(rewardAmountRaw)) {
      return json({ error: 'Invalid callback' }, 400);
    }
    if (!UUID_RE.test(userId) || !UUID_RE.test(customData) || !TRANSACTION_RE.test(transactionId)) {
      return json({ error: 'Invalid callback' }, 400);
    }

    const allowedAdUnits = configuredAdUnits();
    if (allowedAdUnits.length === 0) return json({ error: 'SSV is not configured' }, 503);
    const canonicalAdUnit = resolveConfiguredAdUnit(adUnit, allowedAdUnits);
    if (!canonicalAdUnit) return json({ error: 'Invalid ad unit' }, 403);

    const timestamp = Number(timestampRaw);
    const rewardAmount = Number(rewardAmountRaw);
    const maxAge = Number(Deno.env.get('ADMOB_SSV_MAX_AGE_MS') ?? DEFAULT_MAX_CALLBACK_AGE_MS);
    const effectiveMaxAge = Number.isFinite(maxAge) && maxAge > 0 ? maxAge : DEFAULT_MAX_CALLBACK_AGE_MS;
    const now = Date.now();
    if (!Number.isSafeInteger(timestamp) || timestamp < now - effectiveMaxAge || timestamp > now + MAX_FUTURE_SKEW_MS) {
      return json({ error: 'Expired callback' }, 400);
    }
    if (!Number.isSafeInteger(rewardAmount) || rewardAmount <= 0) {
      return json({ error: 'Invalid reward' }, 400);
    }

    const signatureValid = await verifySignature(rawQuery, signature, keyId);
    if (!signatureValid) return json({ error: 'Invalid signature' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Reward service unavailable' }, 503);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: rewardSession, error: sessionError } = await adminClient
      .from('rewarded_ad_sessions')
      .select('user_id')
      .eq('id', customData)
      .maybeSingle();
    if (sessionError) return json({ error: 'Reward service unavailable' }, 503);
    if (!rewardSession || rewardSession.user_id !== userId) {
      return json({ error: 'Reward session mismatch' }, 403);
    }

    const { data, error } = await adminClient.rpc('credit_verified_rewarded_ad', {
      p_session_id: customData,
      p_transaction_id: transactionId,
      p_ad_unit_id: canonicalAdUnit,
    });

    if (error) {
      console.error('[admob-ssv] verified reward credit failed:', error.message);
      return json({ error: 'Reward service unavailable' }, 503);
    }

    return json({ success: true, result: data ?? null }, 200);
  } catch (error) {
    console.error('[admob-ssv] callback verification failed:', error instanceof Error ? error.message : String(error));
    return json({ error: 'Invalid callback' }, 400);
  }
});
