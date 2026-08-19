/**
 * This script uses the Supabase Management API to run the device_sessions SQL.
 * Run with: node scripts/run-device-sql.js YOUR_SUPABASE_ACCESS_TOKEN
 * Get your token from: https://supabase.com/dashboard/account/tokens
 */
const https = require('https');

const PROJECT_REF = 'zkbprmyxwjfznsucyuvi';
const TOKEN = process.argv[2] || process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Usage: node scripts/run-device-sql.js YOUR_ACCESS_TOKEN');
  console.error('Get token at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const sql = `
create table if not exists public.device_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.device_sessions enable row level security;

create or replace function public.claim_device_session(p_device_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.device_sessions(user_id, device_id, updated_at)
  values(auth.uid(), p_device_id, now())
  on conflict(user_id) do update set device_id=excluded.device_id, updated_at=excluded.updated_at;
end;
$$;

create or replace function public.is_current_device(p_device_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.device_sessions where user_id=auth.uid() and device_id=p_device_id);
$$;

grant execute on function public.claim_device_session(text) to authenticated;
grant execute on function public.is_current_device(text) to authenticated;

UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'esra99san@gmail.com';

INSERT INTO public.profiles (id, username, full_name, role, coins, xp, level, streak_days, is_vip, created_at, updated_at)
SELECT id, 'esra99san', 'Esra Admin', 'admin', 9999, 9999, 10, 10, true, now(), now()
FROM auth.users WHERE email = 'esra99san@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', is_vip = true, updated_at = now();
`;

console.log('Running SQL on Supabase project:', PROJECT_REF);

const body = JSON.stringify({ query: sql });

const req = https.request({
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Authorization': `Bearer ${TOKEN}`
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ SUCCESS! device_sessions table and functions created!');
      console.log('✅ Admin role confirmed for esra99san@gmail.com');
      console.log('✅ Email confirmed - no need to verify email');
      console.log('');
      console.log('You can now sign in at http://localhost:8081 with:');
      console.log('  Email: esra99san@gmail.com');
      console.log('  Password: E20440891esra@@');
    } else {
      console.error('❌ Error (HTTP', res.statusCode + '):', d.substring(0, 500));
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(body);
req.end();
