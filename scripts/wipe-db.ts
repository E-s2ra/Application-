import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function deleteAuthUsers() {
  console.log('Fetching all auth users...');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  const data = await res.json();
  const users = data.users || [];
  console.log(`Found ${users.length} auth users to delete.`);

  for (const user of users) {
    console.log(`Deleting user: ${user.id} (${user.email})...`);
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });
  }
}

async function wipePublicTable(table: string) {
  // Delete all rows matching any ID (or non-null column)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation',
    },
  });
  if (res.ok) {
    console.log(`✓ Cleared table: ${table}`);
  } else {
    console.log(`! Table ${table} status: ${res.status}`);
  }
}

async function main() {
  console.log('🧹 Wiping Supabase Database...');

  // 1. Delete all auth users
  await deleteAuthUsers();

  // 2. Clear user data tables
  const tables = [
    'user_badges',
    'user_themes',
    'user_missions',
    'spins',
    'daily_logins',
    'rewarded_ads',
    'comment_likes',
    'comments',
    'follows',
    'favorites',
    'watch_history',
    'reviews',
    'vip_transactions',
    'payments',
    'audit_logs',
    'push_subscriptions',
    'profiles',
  ];

  for (const t of tables) {
    await wipePublicTable(t);
  }

  console.log('\n✅ Database wiped successfully!');
  console.log('👉 Run "npm run setup:admin" to recreate the default admin account.');
}

main().catch(console.error);
