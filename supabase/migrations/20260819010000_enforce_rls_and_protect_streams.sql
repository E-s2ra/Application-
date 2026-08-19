-- Apply after the single-device migration. This intentionally replaces every
-- client-facing policy on these tables with a small, auditable policy set.
-- Supabase service-role operations remain unaffected because they bypass RLS.

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'anime', 'favorites')
  loop
    execute format('drop policy if exists %I on %I.%I',
      policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.anime enable row level security;
alter table public.favorites enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "anime_read_authenticated"
  on public.anime for select to authenticated
  using (true);

create policy "anime_admin_insert"
  on public.anime for insert to authenticated
  with check (public.is_admin());

create policy "anime_admin_update"
  on public.anime for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "anime_admin_delete"
  on public.anime for delete to authenticated
  using (public.is_admin());

create policy "favorites_select_own"
  on public.favorites for select to authenticated
  using (user_id = auth.uid());

create policy "favorites_insert_own"
  on public.favorites for insert to authenticated
  with check (user_id = auth.uid());

create policy "favorites_delete_own"
  on public.favorites for delete to authenticated
  using (user_id = auth.uid());

-- Column privileges keep a raw stream URL out of all REST responses. A secure
-- server/Edge Function should exchange the content ID for a short-lived DRM URL.
revoke all on table public.profiles from anon, authenticated;
grant select (id, full_name, role) on public.profiles to authenticated;

revoke all on table public.anime from anon, authenticated;
grant select (id, title, description, image_url, episodes, genre, is_featured, created_at)
  on public.anime to authenticated;
grant insert (title, description, image_url, video_url, episodes, genre, is_featured)
  on public.anime to authenticated;
grant update (is_featured) on public.anime to authenticated;
grant delete on public.anime to authenticated;

revoke all on table public.favorites from anon, authenticated;
grant select, insert, delete on public.favorites to authenticated;
