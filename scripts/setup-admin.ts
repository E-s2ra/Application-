#!/usr/bin/env ts-node
/**
 * scripts/setup-admin.ts
 * ──────────────────────
 * One-command admin account setup.
 *
 * Usage:
 *   npx ts-node scripts/setup-admin.ts
 *   # or via npm script:
 *   npm run setup:admin
 *
 * What it does:
 *   1. Reads ADMIN_EMAIL + ADMIN_PASSWORD from .env
 *   2. Tries to sign in — if the account doesn't exist, creates it
 *   3. Calls Supabase service-role API to set role='admin' in profiles table
 *
 * Requirements:
 *   SUPABASE_URL         (from .env)
 *   SUPABASE_SECRET_KEY  (from .env — server-only secret key)
 *   ADMIN_EMAIL          (from .env)
 *   ADMIN_PASSWORD       (from .env)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌  .env file not found at', envPath);
  process.exit(1);
}
dotenv.config({ path: envPath });

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY       = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD!;

function validate() {
  const missing: string[] = [];
  if (!SUPABASE_URL)    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!SERVICE_KEY)     missing.push('SUPABASE_SECRET_KEY');
  if (!ADMIN_EMAIL)     missing.push('ADMIN_EMAIL');
  if (!ADMIN_PASSWORD)  missing.push('ADMIN_PASSWORD');

  if (missing.length > 0) {
    console.error('\n❌  Missing required environment variables:\n');
    missing.forEach((v) => console.error(`   • ${v}`));
    console.error('\n👉  Add them to your .env file and re-run.\n');
    process.exit(1);
  }
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────
async function serviceRoleRequest(path: string, body: object): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function serviceRoleGet(path: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  validate();

  console.log('\n🚀  AniFlix Admin Setup');
  console.log('══════════════════════════════════════════');
  console.log(`   Supabase URL : ${SUPABASE_URL}`);
  console.log(`   Admin email  : ${ADMIN_EMAIL}`);
  console.log('══════════════════════════════════════════\n');

  // ── Step 1: Check if admin user exists ───────────────────────────────────
  console.log('⏳  Step 1/3 — Looking up admin account...');
  const usersRes = await serviceRoleGet(
    `/auth/v1/admin/users?email=${encodeURIComponent(ADMIN_EMAIL)}`
  );
  
  let userId: string | null = null;

  if (usersRes?.users?.length > 0) {
    userId = usersRes.users[0].id;
    console.log(`✅  Admin account found: ${userId}`);
  } else {
    // ── Step 2: Create admin user ─────────────────────────────────────────
    console.log('⏳  Step 2/3 — Creating admin account...');
    const createRes = await serviceRoleRequest('/auth/v1/admin/users', {
      email:            ADMIN_EMAIL,
      password:         ADMIN_PASSWORD,
      email_confirm:    true,           // auto-confirm email
      user_metadata:    { full_name: 'Admin', role: 'admin' },
    });

    if (createRes?.id) {
      userId = createRes.id;
      console.log(`✅  Admin account created: ${userId}`);
    } else {
      console.error('❌  Failed to create admin account:');
      console.error(JSON.stringify(createRes, null, 2));
      process.exit(1);
    }
  }

  // ── Step 3: Set role='admin' in profiles table ────────────────────────────
  console.log('⏳  Step 3/3 — Promoting to admin role...');

  // Upsert profile with role='admin' using service role (bypasses RLS + trigger check)
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      role:       'admin',
      updated_at: new Date().toISOString(),
    }),
  });

  if (!profileRes.ok) {
    // Profile row might not exist yet (created by auth trigger on first login)
    // Try to insert it
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        id:   userId,
        role: 'admin',
        email: ADMIN_EMAIL,
        full_name: 'Admin',
        updated_at: new Date().toISOString(),
      }),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      console.warn(`⚠️  Profile upsert warning: ${text}`);
      console.warn('   The admin role will be set automatically on first login.');
    } else {
      console.log('✅  Profile row created with admin role');
    }
  } else {
    console.log('✅  Profile role set to admin');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log('🎉  Admin setup complete!\n');
  console.log(`   Admin account: ${ADMIN_EMAIL}`);
  console.log('\n   → Open the app and go to Profile → Admin Panel');
  console.log('══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌  Unexpected error:', err.message || err);
  process.exit(1);
});
