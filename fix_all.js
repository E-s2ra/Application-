/**
 * AniFlix Fix Script
 * ==================
 * 1. Signs in as admin (esra99san@gmail.com)
 * 2. Applies SQL fixes to the hosted Supabase via Management API
 * 3. Deletes all test anime entries
 *
 * Usage:  node fix_all.js <your-password>
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL   = 'https://zkbprmyxwjfznsucyuvi.supabase.co';
const SUPABASE_ANON  = 'sb_publishable_gw13qL5Hs7d2o0gLP0FOuQ_siBOh5VK';
const PROJECT_REF    = 'zkbprmyxwjfznsucyuvi';
const ADMIN_EMAIL    = 'esra99san@gmail.com';
const password       = process.argv[2];

if (!password) {
  console.error('Usage: node fix_all.js <admin-password>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── helpers ──────────────────────────────────────────────────────────────────

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'api.supabase.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`,
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Sign in
  console.log(`\n[1/5] Signing in as ${ADMIN_EMAIL}...`);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password,
  });
  if (authErr || !auth.session) {
    console.error('❌ Sign-in failed:', authErr?.message || 'no session');
    process.exit(1);
  }
  const jwt = auth.session.access_token;
  console.log('✅ Signed in');

  // 2. Fix is_admin() to use the real admin email
  console.log('\n[2/5] Applying is_admin() fix...');
  const r2 = await post(
    `/v1/projects/${PROJECT_REF}/database/query`,
    {
      query: `
        -- Fix is_admin(): use email check, no dependency on profiles.role
        create or replace function public.is_admin()
        returns boolean
        language sql stable security definer
        set search_path = public, auth
        as $$
          select lower(email) = 'esra99san@gmail.com'
          from auth.users where id = auth.uid();
        $$;

        revoke all on function public.is_admin() from public;
        grant execute on function public.is_admin() to authenticated;

        -- Fix enforce_approved_admin_role trigger to use correct email
        create or replace function public.enforce_approved_admin_role()
        returns trigger language plpgsql security definer
        set search_path = public, auth
        as $$
        begin
          if new.role = 'admin' and not exists (
            select 1 from auth.users
            where id = new.id and lower(email) = 'esra99san@gmail.com'
          ) then
            new.role := 'user';
          end if;
          return new;
        end;
        $$;

        -- Set admin profile role
        update public.profiles
        set role = 'admin'
        where id in (
          select id from auth.users where lower(email) = 'esra99san@gmail.com'
        );
      `,
    },
    jwt
  );
  if (r2.status >= 200 && r2.status < 300) {
    console.log('✅ is_admin() fixed');
  } else {
    console.warn('⚠️  is_admin() fix response:', r2.status, JSON.stringify(r2.body).slice(0, 200));
  }

  // 3. Add admin_delete_all_anime() RPC
  console.log('\n[3/5] Creating admin_delete_all_anime() RPC...');
  const r3 = await post(
    `/v1/projects/${PROJECT_REF}/database/query`,
    {
      query: `
        create or replace function public.admin_delete_all_anime()
        returns integer language plpgsql security definer
        set search_path = public, auth
        as $$
        declare
          deleted_count integer;
          caller_email  text;
        begin
          select lower(email) into caller_email from auth.users where id = auth.uid();
          if caller_email != 'esra99san@gmail.com' then
            raise exception 'Permission denied: admin only';
          end if;
          delete from public.anime;
          get diagnostics deleted_count = row_count;
          return deleted_count;
        end;
        $$;

        revoke all on function public.admin_delete_all_anime() from public;
        grant execute on function public.admin_delete_all_anime() to authenticated;
      `,
    },
    jwt
  );
  if (r3.status >= 200 && r3.status < 300) {
    console.log('✅ admin_delete_all_anime() RPC created');
  } else {
    console.warn('⚠️  RPC creation response:', r3.status, JSON.stringify(r3.body).slice(0, 200));
  }

  // 4. Create notifications table if it doesn't exist
  console.log('\n[4/5] Ensuring notifications table exists...');
  const r4 = await post(
    `/v1/projects/${PROJECT_REF}/database/query`,
    {
      query: `
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

        alter table public.notifications enable row level security;

        drop policy if exists "notifications_select_own" on public.notifications;
        create policy "notifications_select_own"
          on public.notifications for select to authenticated
          using (user_id = auth.uid());

        drop policy if exists "notifications_update_own_read_state" on public.notifications;
        create policy "notifications_update_own_read_state"
          on public.notifications for update to authenticated
          using (user_id = auth.uid())
          with check (user_id = auth.uid());

        revoke all on public.notifications from anon, authenticated;
        grant select on public.notifications to authenticated;
        grant update (read_at) on public.notifications to authenticated;
      `,
    },
    jwt
  );
  if (r4.status >= 200 && r4.status < 300) {
    console.log('✅ Notifications table ready');
  } else {
    console.warn('⚠️  Notifications table response:', r4.status, JSON.stringify(r4.body).slice(0, 300));
  }

  // 5. Delete all test anime
  console.log('\n[5/5] Deleting all test anime...');
  const { data: animeList } = await supabase
    .from('anime').select('id, title').order('created_at', { ascending: false });

  console.log(`Found ${animeList?.length ?? 0} entries:`, animeList?.map(a => a.title));

  if (!animeList?.length) {
    console.log('Nothing to delete.');
  } else {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_all_anime');
    if (!rpcErr) {
      console.log(`✅ Deleted ${rpcData} anime entries via RPC`);
    } else {
      console.warn('RPC not available:', rpcErr.message, '- falling back to individual deletes...');
      let deleted = 0;
      for (const a of animeList) {
        const { error } = await supabase.from('anime').delete().eq('id', a.id);
        if (!error) { deleted++; console.log(`  🗑️  "${a.title}"`); }
        else console.warn(`  ⚠️  "${a.title}": ${error.message}`);
      }
      console.log(`Deleted ${deleted}/${animeList.length}`);
    }
  }

  // Verify
  const { data: remaining } = await supabase.from('anime').select('id, title');
  if (!remaining?.length) {
    console.log('\n✅ All done! Anime table is now empty.');
  } else {
    console.log(`\n⚠️  Still ${remaining.length} remaining:`, remaining.map(a => a.title));
  }
}

main().catch(console.error);
