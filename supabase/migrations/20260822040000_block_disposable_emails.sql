-- Maintainable, server-side disposable email policy. The Auth hook below runs
-- before a user is created, so clients cannot bypass it by modifying the app.

create table if not exists public.disposable_email_domains (
  domain text primary key check (domain = lower(domain) and domain like '%.%'),
  created_at timestamptz not null default now()
);

insert into public.disposable_email_domains (domain) values
  ('10minutemail.com'),
  ('dispostable.com'),
  ('emailondeck.com'),
  ('fakeinbox.com'),
  ('guerrillamail.com'),
  ('guerrillamailblock.com'),
  ('mailinator.com'),
  ('mailnesia.com'),
  ('mintemail.com'),
  ('mohmal.com'),
  ('sharklasers.com'),
  ('tempmail.com'),
  ('tempmailo.com'),
  ('throwawaymail.com'),
  ('trashmail.com'),
  ('yopmail.com')
on conflict (domain) do nothing;

alter table public.disposable_email_domains enable row level security;
revoke all on public.disposable_email_domains from anon, authenticated;

create or replace function public.before_user_created(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  email_domain text;
begin
  email_domain := lower(split_part(coalesce(input ->> 'email', ''), '@', 2));

  if email_domain = '' or position('@' in coalesce(input ->> 'email', '')) = 0 then
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
