const https = require('https');
const fs = require('fs');
const path = require('path');

// We use Supabase REST API + pg_rest endpoint approach
// The full migrations are concatenated and posted to the db
const SUPABASE_URL = 'https://guebvvlopuyebpwbzuri.supabase.co';
const KEY = 'sb_publishable_JGe_EcnyE14JrGkXdz4arg_ZoTejNNb';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function runSql(sql, label) {
  // Try the RPC approach using exec_sql if available
  try {
    const payload = JSON.stringify({ query: sql });
    const res = await post(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        'Content-Type': 'application/json',
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
      },
      payload
    );
    if (res.status === 200 || res.status === 204) {
      console.log(`✅ ${label}`);
      return true;
    }
    // Fall through
    const parsed = JSON.parse(res.body || '{}');
    if (parsed.code === 'PGRST202') {
      // function not found - try direct SQL via pg
      return null; // signal to try alternative
    }
    if (parsed.message && (
      parsed.message.includes('already exists') ||
      parsed.code === '42P07' ||
      parsed.code === '42710'
    )) {
      console.log(`⏭  ${label} (already applied)`);
      return true;
    }
    console.warn(`⚠️  ${label} [${res.status}]: ${res.body.substring(0, 300)}`);
    return false;
  } catch (e) {
    console.warn(`❌ ${label}: ${e.message}`);
    return false;
  }
}

async function main() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && f !== '20260819030000_full_gamification_admob_schema.sql')
    .sort();

  console.log(`\n🚀 Running ${files.length} migrations...\n`);

  // Consolidate all migrations into one large payload
  const allSql = files.map(f => {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    return `-- ========= ${f} =========\n${sql}`;
  }).join('\n\n');

  // Write consolidated SQL to a temp file for inspection
  fs.writeFileSync(path.join(__dirname, 'consolidated_migration.sql'), allSql);
  console.log(`📄 Consolidated migration written to scripts/consolidated_migration.sql`);

  // Try to run individual file sets in groups
  let applied = 0, skipped = 0, failed = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const result = await runSql(sql, file);
    if (result === true) applied++;
    else if (result === null) { skipped++; console.log(`⏩ ${file} (exec_sql not available)`); }
    else failed++;
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n📊 Results: ✅ ${applied} applied | ⏩ ${skipped} rpc-unavailable | ❌ ${failed} failed\n`);
  
  if (failed > 0 || skipped > 0) {
    console.log('ℹ️  To apply manually, run consolidated_migration.sql in Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/guebvvlopuyebpwbzuri/sql');
  }
}

main().catch(console.error);
