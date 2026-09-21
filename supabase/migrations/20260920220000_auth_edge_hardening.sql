-- Durable abuse protection for the public username-login Edge Function.
-- State lives outside public and is reachable only through a service-role RPC.

CREATE SCHEMA IF NOT EXISTS auth_private;

REVOKE ALL ON SCHEMA auth_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS auth_private.username_login_rate_limits (
  scope text NOT NULL CHECK (scope IN ('ip', 'identifier')),
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX IF NOT EXISTS username_login_rate_limits_updated_at_idx
  ON auth_private.username_login_rate_limits (updated_at);

REVOKE ALL ON TABLE auth_private.username_login_rate_limits
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA auth_private TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE auth_private.username_login_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_username_login_rate_limit(
  p_ip_hash text,
  p_identifier_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth_private, public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_ip_attempts integer;
  v_identifier_attempts integer;
BEGIN
  IF p_ip_hash IS NULL
     OR p_identifier_hash IS NULL
     OR p_ip_hash !~ '^[0-9a-f]{64}$'
     OR p_identifier_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid rate-limit key';
  END IF;

  INSERT INTO auth_private.username_login_rate_limits AS limits (
    scope,
    key_hash,
    window_started_at,
    attempts,
    updated_at
  )
  VALUES ('ip', p_ip_hash, v_now, 1, v_now)
  ON CONFLICT (scope, key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN limits.window_started_at <= v_now - interval '15 minutes' THEN v_now
      ELSE limits.window_started_at
    END,
    attempts = CASE
      WHEN limits.window_started_at <= v_now - interval '15 minutes' THEN 1
      ELSE limits.attempts + 1
    END,
    updated_at = v_now
  RETURNING attempts INTO v_ip_attempts;

  INSERT INTO auth_private.username_login_rate_limits AS limits (
    scope,
    key_hash,
    window_started_at,
    attempts,
    updated_at
  )
  VALUES ('identifier', p_identifier_hash, v_now, 1, v_now)
  ON CONFLICT (scope, key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN limits.window_started_at <= v_now - interval '15 minutes' THEN v_now
      ELSE limits.window_started_at
    END,
    attempts = CASE
      WHEN limits.window_started_at <= v_now - interval '15 minutes' THEN 1
      ELSE limits.attempts + 1
    END,
    updated_at = v_now
  RETURNING attempts INTO v_identifier_attempts;

  DELETE FROM auth_private.username_login_rate_limits
  WHERE updated_at < v_now - interval '24 hours';

  RETURN v_ip_attempts <= 20 AND v_identifier_attempts <= 8;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_username_login_rate_limit(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_username_login_rate_limit(text, text)
  TO service_role;
