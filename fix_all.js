/**
 * Apply SQL migrations directly to hosted Supabase via the pg-gateway / exec endpoint.
 * Uses the authenticated user JWT (works if user has superuser / service permissions,
 * or we fall back to the Supabase REST API extensions route).
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL  = 'https://zkbprmyxwjfznsucyuvi.supabase.co';
const SUPABASE_ANON = 'sb_publishable_gw13qL5Hs7d2o0gLP0FOuQ_siBOh5VK';
const ADMIN_EMAIL   = 'esra99san@gmail.com';
const password      = process.argv[2];

if (!password) { console.error('Usage: node fix_all.js <password>'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Try to execute raw SQL via the Supabase pg REST endpoint
function execSQL(sql, serviceKey) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ query: sql });
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey || SUPABASE_ANON,
        'Authorization': `Bearer ${serviceKey || SUPABASE_ANON}`,
      },
    };
    const req = https.request(opts, (res) => {
      let raw = ''; res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.write(body); req.end();
  });
}

async function main() {
  console.log(`[1] Signing in...`);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL, password,
  });
  if (authErr || !auth.session) { console.error('❌', authErr?.message); process.exit(1); }
  const jwt = auth.session.access_token;
  console.log('✅ Signed in. JWT obtained.\n');

  // ----- Apply migrations via rpc -----
  // Since we can't call management API without a personal access token,
  // we'll use the supabase.rpc('exec') approach if it's available,
  // otherwise output the SQL for manual application.

  const SQL_FIX_ADMIN = `
    create or replace function public.is_admin()
    returns boolean language sql stable security definer
    set search_path = public, auth as $$
      select lower(email) = 'esra99san@gmail.com'
      from auth.users where id = auth.uid();
    $$;
    revoke all on function public.is_admin() from public;
    grant execute on function public.is_admin() to authenticated;

    create or replace function public.admin_delete_all_anime()
    returns integer language plpgsql security definer
    set search_path = public, auth as $$
    declare deleted_count integer; caller_email text;
    begin
      select lower(email) into caller_email from auth.users where id = auth.uid();
      if caller_email != 'esra99san@gmail.com' then raise exception 'Permission denied'; end if;
      delete from public.anime;
      get diagnostics deleted_count = row_count;
      return deleted_count;
    end; $$;
    revoke all on function public.admin_delete_all_anime() from public;
    grant execute on function public.admin_delete_all_anime() to authenticated;

    update public.profiles set role = 'admin'
    where id in (select id from auth.users where lower(email) = 'esra99san@gmail.com');
  `;

  const SQL_NOTIFICATIONS = `
    alter table public.anime add column if not exists published_at timestamptz default now();

    create table if not exists public.notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      actor_id uuid references auth.users(id) on delete set null,
      type text not null check (type in ('product_published','user_mention','comment_reply')),
      title text not null check (char_length(title) between 1 and 120),
      body text not null check (char_length(body) between 1 and 500),
      resource_type text not null check (resource_type in ('anime','comment')),
      resource_id uuid not null,
      metadata jsonb not null default '{}'::jsonb,
      read_at timestamptz,
      created_at timestamptz not null default now()
    );
    create index if not exists idx_notifications_user_created
      on public.notifications(user_id, created_at desc);
    alter table public.notifications enable row level security;
    drop policy if exists "notifications_select_own" on public.notifications;
    create policy "notifications_select_own"
      on public.notifications for select to authenticated using (user_id = auth.uid());
    drop policy if exists "notifications_update_own_read_state" on public.notifications;
    create policy "notifications_update_own_read_state"
      on public.notifications for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    revoke all on public.notifications from anon, authenticated;
    grant select on public.notifications to authenticated;
    grant update (read_at) on public.notifications to authenticated;
  `;

  // Try applying via supabase.rpc('exec_sql') – only works if the function exists
  console.log('[2] Trying to apply SQL via RPC...');
  const { error: e1 } = await supabase.rpc('exec_sql', { sql: SQL_FIX_ADMIN });
  const { error: e2 } = await supabase.rpc('exec_sql', { sql: SQL_NOTIFICATIONS });

  if (e1 || e2) {
    console.log('RPC exec_sql not available (normal). Outputting SQL for manual application...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('COPY AND PASTE THIS INTO: https://supabase.com/dashboard/project/zkbprmyxwjfznsucyuvi/sql/new');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(SQL_FIX_ADMIN + SQL_NOTIFICATIONS);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('✅ SQL applied successfully via RPC!');
  }

  // Verify notifications
  const { error: notifErr } = await supabase.from('notifications').select('id').limit(1);
  if (!notifErr) console.log('\n✅ notifications table: OK');
  else console.log('\n⚠️  notifications table still missing — please apply SQL above');

  console.log('\n✅ Anime table is empty:', (await supabase.from('anime').select('id')).data?.length === 0 ? 'YES' : 'NO');
}

main().catch(console.error);
