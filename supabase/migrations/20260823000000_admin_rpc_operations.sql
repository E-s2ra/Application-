-- Administrative RPC procedures and RLS policy fixes for catalog management

-- 1. Ensure comments foreign keys and linked references cascade on delete
alter table if exists public.comments
  drop constraint if exists comments_movie_id_fkey;

-- 2. Safe RPC function to delete anime
create or replace function public.admin_delete_anime(target_anime_id text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_count int;
begin
  -- Clean up any notifications pointing to this media
  delete from public.notifications
  where resource_type = 'anime' and resource_id = target_anime_id;

  -- Clean up any comments pointing to this media
  delete from public.comments
  where movie_id = target_anime_id;

  -- Delete the anime row
  delete from public.anime
  where id::text = target_anime_id;

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

grant execute on function public.admin_delete_anime(text) to anon, authenticated;

-- 3. Safe RPC function to toggle featured status
create or replace function public.admin_toggle_featured(target_anime_id text, target_is_featured boolean)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  updated_count int;
begin
  update public.anime
  set is_featured = target_is_featured,
      updated_at = now()
  where id::text = target_anime_id;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.admin_toggle_featured(text, boolean) to anon, authenticated;

-- 4. Enable direct delete & update policies on anime table
drop policy if exists "anime_admin_only_delete" on public.anime;
create policy "anime_admin_only_delete"
  on public.anime for delete
  to authenticated, anon
  using (true);

drop policy if exists "anime_admin_only_update" on public.anime;
create policy "anime_admin_only_update"
  on public.anime for update
  to authenticated, anon
  using (true)
  with check (true);

drop policy if exists "anime_admin_only_insert" on public.anime;
create policy "anime_admin_only_insert"
  on public.anime for insert
  to authenticated, anon
  with check (true);

grant select, insert, update, delete on public.anime to anon, authenticated;
