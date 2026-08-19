const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zkbprmyxwjfznsucyuvi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gw13qL5Hs7d2o0gLP0FOuQ_siBOh5VK';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const allTables = [
  'profiles',
  'daily_logins',
  'missions',
  'user_missions',
  'spins',
  'rewarded_ads',
  'comments',
  'comment_likes',
  'follows',
  'themes',
  'user_themes',
  'badges',
  'user_badges',
  'vip_transactions',
  'device_sessions',
  'favorites',
  'anime'
];

async function inspectAll() {
  console.log('=== FULL SUPABASE INSPECTION ===');
  for (const t of allTables) {
    const { data, error, status } = await client.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ TABLE [${t}]: status=${status} error=${error.code} message=${error.message}`);
    } else {
      console.log(`✅ TABLE [${t}]: status=${status} count=${data ? data.length : 0}`);
    }
  }

  console.log('\n=== RPC FUNCTIONS INSPECTION ===');
  const rpcs = [
    { name: 'is_current_device', params: { p_device_id: 'test' } },
    { name: 'claim_device_session', params: { p_device_id: 'test' } },
    { name: 'claim_daily_login_reward', params: {} },
    { name: 'claim_rewarded_ad', params: {} },
    { name: 'spin_lucky_wheel', params: {} },
    { name: 'unlock_theme_with_coins', params: { p_theme_id: 'sample' } },
    { name: 'unlock_badge', params: { p_badge_id: 'sample' } }
  ];

  for (const r of rpcs) {
    const { data, error, status } = await client.rpc(r.name, r.params);
    if (error) {
      console.log(`RPC [${r.name}]: status=${status} code=${error.code} msg=${error.message}`);
    } else {
      console.log(`✅ RPC [${r.name}]: status=${status}`);
    }
  }
}

inspectAll();
