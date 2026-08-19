const https = require('https');

const PROJECT_REF = 'zkbprmyxwjfznsucyuvi';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN is not set.');
  console.error('Get it from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const sql = `
create table if not exists public.device_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 20 and 200),
  updated_at timestamptz not null default now()
);

alter table public.device_sessions enable row level security;

create or replace function public.claim_device_session(p_device_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.device_sessions (user_id, device_id, updated_at)
  values (auth.uid(), p_device_id, now())
  on conflict (user_id) do update set device_id = excluded.device_id, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.is_current_device(p_device_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.device_sessions where user_id = auth.uid() and device_id = p_device_id);
$$;

grant execute on function public.claim_device_session(text) to authenticated;
grant execute on function public.is_current_device(text) to authenticated;

UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'esra99san@gmail.com';

INSERT INTO public.profiles (id, username, full_name, role, coins, xp, level, streak_days, is_vip, created_at, updated_at)
SELECT id, 'esra99san', 'Esra Admin', 'admin', 9999, 9999, 10, 10, true, now(), now()
FROM auth.users WHERE email = 'esra99san@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Esra Admin', is_vip = true;
`;

const body = JSON.stringify({ query: sql });

const req = https.request({
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Authorization': `Bearer ${ACCESS_TOKEN}`
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('SUCCESS: device_sessions table and functions created!');
    } else {
      console.log('RESPONSE:', d.substring(0, 1000));
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(body);
req.end();
