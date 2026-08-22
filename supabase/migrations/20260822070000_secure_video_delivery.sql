-- Private cloud-storage playback: catalog APIs never expose object locations.
alter table public.anime add column if not exists video_asset_key text;

create index if not exists anime_video_asset_key_idx
  on public.anime (video_asset_key)
  where video_asset_key is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos-private',
  'videos-private',
  false,
  2147483648,
  array['video/mp4', 'application/x-mpegURL', 'application/vnd.apple.mpegurl', 'video/MP2T']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The service-role Edge Function alone issues signed playback URLs. Clients
-- receive neither Storage object read access nor a permanent stream URL.
drop policy if exists "video_admin_upload" on storage.objects;
drop policy if exists "video_admin_update" on storage.objects;
drop policy if exists "video_admin_delete" on storage.objects;

create policy "video_admin_upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'videos-private' and public.is_admin());

create policy "video_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'videos-private' and public.is_admin())
  with check (bucket_id = 'videos-private' and public.is_admin());

create policy "video_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'videos-private' and public.is_admin());

revoke select on table storage.objects from anon, authenticated;
