-- Persistent in-app notifications. Notification creation stays server-side so
-- clients cannot notify arbitrary users or manufacture product events.

alter table public.anime
  add column if not exists published_at timestamptz;

-- Existing catalog entries are already published. Backfill before the trigger
-- exists so this migration never creates a burst of legacy notifications.
update public.anime
set published_at = coalesce(published_at, created_at)
where published_at is null;

alter table public.anime
  alter column published_at set default now();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('product_published', 'user_mention', 'comment_reply')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  resource_type text not null check (resource_type in ('anime', 'comment')),
  resource_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, created_at desc)
  where read_at is null;

-- A product publication can never notify the same recipient twice.
create unique index if not exists notifications_one_product_publication_per_user
  on public.notifications (user_id, resource_id)
  where type = 'product_published';

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

create or replace function public.notify_users_of_published_anime()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.published_at is not distinct from new.published_at then
    return new;
  end if;

  if new.published_at is null then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    resource_type,
    resource_id,
    metadata
  )
  select
    profiles.id,
    'product_published',
    'New on AniFlix',
    left(new.title || ' is now available to watch.', 500),
    'anime',
    new.id,
    jsonb_build_object('anime_title', new.title)
  from public.profiles
  on conflict (user_id, resource_id) where type = 'product_published' do nothing;

  return new;
end;
$$;

drop trigger if exists notify_users_when_anime_is_published on public.anime;
create trigger notify_users_when_anime_is_published
  after insert or update of published_at on public.anime
  for each row
  execute function public.notify_users_of_published_anime();
