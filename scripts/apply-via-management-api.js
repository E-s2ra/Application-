#!/usr/bin/env node
/**
 * apply-via-management-api.js
 * Uses the Supabase Management API to execute SQL on the database.
 * Requires SUPABASE_ACCESS_TOKEN environment variable (project API key works too).
 * 
 * The consolidated SQL is run via the Supabase Management REST endpoint:
 *   POST /v1/projects/{ref}/database/query
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'zkbprmyxwjfznsucyuvi';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

if (!ACCESS_TOKEN) {
  console.error('❌ Please set the SUPABASE_ACCESS_TOKEN environment variable.');
  console.error('   Get it from: https://supabase.com/dashboard/account/tokens');
  console.error('   Then run: $env:SUPABASE_ACCESS_TOKEN="<token>"; node scripts/apply-via-management-api.js');
  process.exit(1);
}

const SQL_FILE = path.join(__dirname, 'consolidated_migration.sql');
const sql = fs.readFileSync(SQL_FILE, 'utf8');

function post(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body);
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: { ...headers, 'Content-Length': buf.length }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(buf);
    req.end();
  });
}

async function main() {
  console.log(`\n🚀 Applying consolidated migration to project: ${PROJECT_REF}\n`);

  const res = await post(
    'api.supabase.com',
    `/v1/projects/${PROJECT_REF}/database/query`,
    {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    JSON.stringify({ query: sql })
  );

  if (res.status >= 200 && res.status < 300) {
    console.log('✅ Migration applied successfully!');
    console.log('Response:', res.body.substring(0, 500));
  } else {
    console.error(`❌ Failed with status ${res.status}:`);
    console.error(res.body.substring(0, 1000));
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
