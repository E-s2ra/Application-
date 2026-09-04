-- Comprehensive Audit Logging System
-- Tracks all sensitive operations for security investigation and compliance

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  record_identifier TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);

-- Enable RLS on audit_logs (only admins and service role can read)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert audit logs
DROP POLICY IF EXISTS "audit_logs_insert_service_role" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_service_role"
  ON public.audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service role can read audit logs (never directly from client)
DROP POLICY IF EXISTS "audit_logs_select_service_role" ON public.audit_logs;
CREATE POLICY "audit_logs_select_service_role"
  ON public.audit_logs FOR SELECT
  TO service_role
  USING (true);

GRANT SELECT, INSERT ON public.audit_logs TO service_role;
REVOKE ALL ON public.audit_logs FROM anon, authenticated;

-- Audit Log Helper Function (for service role use only)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_record_identifier TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    admin_email,
    action,
    table_name,
    record_id,
    record_identifier,
    old_values,
    new_values,
    status,
    error_message
  ) VALUES (
    p_user_id,
    (SELECT email FROM auth.users WHERE id = p_user_id),
    p_action,
    p_table_name,
    p_record_id,
    p_record_identifier,
    p_old_values,
    p_new_values,
    p_status,
    p_error_message
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event FROM public;
GRANT EXECUTE ON FUNCTION public.log_audit_event TO service_role;

-- Trigger to prevent direct role changes at the database level
-- Only service role functions can change roles
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If role is being changed, reject it unless called via service_role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- This check happens at row level; service_role still works
    IF current_user NOT IN ('service_role', 'postgres') THEN
      RAISE EXCEPTION 'Role changes are not allowed through direct updates. Contact administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
