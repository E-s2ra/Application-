-- Fixes the before_user_created hook to correctly parse the user email from the input payload.
-- The Supabase Auth hook payload structure has the email nested under the "user" object.

create or replace function public.before_user_created(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email_domain text;
  user_email text;
begin
  -- Extract the email from the nested "user" object
  user_email := input -> 'user' ->> 'email';
  
  email_domain := lower(split_part(coalesce(user_email, ''), '@', 2));

  if email_domain = '' or position('@' in coalesce(user_email, '')) = 0 then
    return jsonb_build_object('decision', 'reject', 'message', 'A valid email address is required.');
  end if;

  if exists (select 1 from public.disposable_email_domains where domain = email_domain) then
    return jsonb_build_object('decision', 'reject', 'message', 'Disposable email addresses are not allowed.');
  end if;

  return jsonb_build_object('decision', 'continue');
end;
$$;

revoke execute on function public.before_user_created(jsonb) from public, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.before_user_created(jsonb) TO supabase_auth_admin;';
  END IF;
END
$$;
