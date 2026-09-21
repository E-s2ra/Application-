import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;

async function fetchTable(tableName: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'count=exact',
    },
  });
  const countHeader = res.headers.get('content-range');
  return countHeader ? countHeader.split('/')[1] : 'unknown';
}

async function fetchUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  const data = await res.json();
  return data.users || [];
}

async function inspect() {
  console.log('--- DB INSPECTION ---');
  const tables = [
    'profiles',
    'favorites',
    'watch_history',
    'reviews',
    'animes',
    'episodes',
    'rewards',
    'vip_purchases',
    'push_subscriptions'
  ];

  for (const table of tables) {
    const count = await fetchTable(table);
    console.log(`Table '${table}': ${count} rows`);
  }

  const users = await fetchUsers();
  console.log(`Auth Users count: ${users.length}`);
  users.forEach((u: any) => {
    console.log(` - User ID: ${u.id}, Email: ${u.email}, Created: ${u.created_at}`);
  });
}

inspect().catch(console.error);
