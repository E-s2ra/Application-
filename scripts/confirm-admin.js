const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_REF = 'zkbprmyxwjfznsucyuvi';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'esra99san@gmail.com';

INSERT INTO public.profiles (id, username, full_name, role, coins, xp, level, streak_days, is_vip, created_at, updated_at)
SELECT id, 'esra99san', 'Esra Admin', 'admin', 9999, 9999, 10, 10, true, now(), now()
FROM auth.users
WHERE email = 'esra99san@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Esra Admin', is_vip = true;
`;

if (ACCESS_TOKEN) {
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
    res.on('end', () => console.log('Management API response:', res.statusCode, d));
  });
  req.write(body);
  req.end();
} else {
  console.log('SQL to run in Supabase SQL Editor:\n\n' + sql);
}
