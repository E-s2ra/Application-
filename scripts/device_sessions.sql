-- Create device_sessions table
create table if not exists public.device_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.device_sessions enable row level security;

-- Function to register current device
create or replace function public.claim_device_session(p_device_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.device_sessions(user_id, device_id, updated_at)
  values(auth.uid(), p_device_id, now())
  on conflict(user_id) do update set device_id=excluded.device_id, updated_at=excluded.updated_at;
end;
$$;

-- Function to check if current device is the registered one
create or replace function public.is_current_device(p_device_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.device_sessions where user_id=auth.uid() and device_id=p_device_id);
$$;

grant execute on function public.claim_device_session(text) to authenticated;
grant execute on function public.is_current_device(text) to authenticated;

-- Confirm admin email and set role
UPDATE auth.users SET email_confirmed_at=now() WHERE email='esra99san@gmail.com';
INSERT INTO public.profiles (id, username, full_name, role, coins, xp, level, streak_days, is_vip, created_at, updated_at)
SELECT id, 'esra99san', 'Esra Admin', 'admin', 9999, 9999, 10, 10, true, now(), now()
FROM auth.users WHERE email='esra99san@gmail.com'
ON CONFLICT (id) DO UPDATE SET role='admin', is_vip=true, updated_at=now();
