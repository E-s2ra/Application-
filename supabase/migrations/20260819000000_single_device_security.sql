-- Run this migration in the Supabase SQL editor or through the Supabase CLI.
-- The RPC functions are SECURITY DEFINER so clients can only claim/check their
-- own session. They cannot read or update another account's device session.

create table if not exists public.device_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 20 and 200),
  updated_at timestamptz not null default now()
);

alter table public.device_sessions enable row level security;

create or replace function public.claim_device_session(p_device_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_device_id is null or char_length(p_device_id) not between 20 and 200 then
    raise exception 'Invalid device identifier';
  end if;

  insert into public.device_sessions (user_id, device_id, updated_at)
  values (auth.uid(), p_device_id, now())
  on conflict (user_id) do update
    set device_id = excluded.device_id,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function public.is_current_device(p_device_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.device_sessions
    where user_id = auth.uid()
      and device_id = p_device_id
  );
$$;

revoke all on function public.claim_device_session(text) from public;
revoke all on function public.is_current_device(text) from public;
grant execute on function public.claim_device_session(text) to authenticated;
grant execute on function public.is_current_device(text) to authenticated;
