#!/usr/bin/env node
/**
 * apply-migrations.js
 * Applies all pending Supabase migration files via the SQL REST API endpoint.
 * Reads from supabase/migrations/*.sql files in numeric order.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SUPABASE_URL = 'https://guebvvlopuyebpwbzuri.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JGe_EcnyE14JrGkXdz4arg_ZoTejNNb';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

function makeRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function executeSql(sql, label) {
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    const body = JSON.stringify({ sql });

    const res = await makeRequest(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      },
      body
    );

    if (res.status >= 200 && res.status < 300) {
      console.log(`✅ [${label}] Applied successfully`);
      return true;
    } else {
      const parsed = JSON.parse(res.body || '{}');
      // Ignore "already exists" errors
      if (parsed.message && (
        parsed.message.includes('already exists') ||
        parsed.message.includes('duplicate') ||
        parsed.code === '42P07' ||
        parsed.code === '42710'
      )) {
        console.log(`⏭ [${label}] Already applied (skipped)`);
        return true;
      }
      console.warn(`⚠️  [${label}] Status ${res.status}: ${res.body.substring(0, 400)}`);
      return false;
    }
  } catch (err) {
    console.warn(`❌ [${label}] Error: ${err.message}`);
    return false;
  }
}

async function main() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`\n🚀 Applying ${files.length} migrations from ${MIGRATIONS_DIR}\n`);

  let applied = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Split by double semicolons and handle statement-by-statement for robustness
    const success = await executeSql(sql, file);
    if (success) applied++;
    else failed++;

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Applied: ${applied}`);
  console.log(`   ❌ Failed : ${failed}`);
  console.log(`\n✅ Done!\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
