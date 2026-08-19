const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zkbprmyxwjfznsucyuvi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gw13qL5Hs7d2o0gLP0FOuQ_siBOh5VK';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
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
  'anime'
];

async function check() {
  console.log('--- Inspecting Supabase Database: ' + SUPABASE_URL + ' ---');
  for (const table of tables) {
    try {
      const { data, error, status } = await client.from(table).select('*').limit(1);
      if (error) {
        console.log(`[TABLE MISSING/ERROR] ${table}: status=${status}, code=${error.code}, msg=${error.message}`);
      } else {
        console.log(`[TABLE EXISTS] ${table}: status=${status}, rowCount=${data ? data.length : 0}`);
      }
    } catch (e) {
      console.log(`[EXCEPTION] ${table}: ${e.message}`);
    }
  }

  // Also check RPCs
  console.log('\n--- Inspecting RPCs ---');
  const rpcs = [
    'claim_daily_login_reward',
    'claim_rewarded_ad',
    'spin_lucky_wheel',
    'unlock_theme_with_coins'
  ];
  for (const rpc of rpcs) {
    try {
      const { data, error, status } = await client.rpc(rpc);
      if (error) {
        console.log(`[RPC RESULT] ${rpc}: status=${status}, code=${error.code}, msg=${error.message}`);
      } else {
        console.log(`[RPC EXISTS & CALLED] ${rpc}: status=${status}`);
      }
    } catch (e) {
      console.log(`[RPC EXCEPTION] ${rpc}: ${e.message}`);
    }
  }
}

check();
