/**
 * apply-migration.js
 * Uses the Supabase Management API to run the consolidated_migration.sql
 * against the live Supabase PostgreSQL database.
 *
 * Usage:
 *   $env:SUPABASE_ACCESS_TOKEN="your_personal_access_token"
 *   node scripts/apply-migration.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_REF = 'zkbprmyxwjfznsucyuvi';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN is not set.');
  console.error('   Get your token at: https://supabase.com/dashboard/account/tokens');
  console.error('   Then run: $env:SUPABASE_ACCESS_TOKEN="your_token"; node scripts/apply-migration.js');
  process.exit(1);
}

const sqlPath = path.join(__dirname, 'consolidated_migration.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log(`✅ Loaded SQL (${sql.length} bytes)`);
console.log(`🔗 Connecting to Supabase project: ${PROJECT_REF}`);
console.log('⏳ Running migration via Management API...\n');

const body = JSON.stringify({ query: sql });

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/database/query`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log(`HTTP Status: ${res.statusCode}`);
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✅ Migration applied successfully to Supabase!\n');
      try {
        const result = JSON.parse(data);
        console.log(JSON.stringify(result, null, 2));
      } catch {
        console.log(data);
      }
    } else {
      console.error('❌ Migration failed:');
      try {
        const err = JSON.parse(data);
        console.error(JSON.stringify(err, null, 2));
      } catch {
        console.error(data);
      }
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
  process.exit(1);
});

req.write(body);
req.end();
