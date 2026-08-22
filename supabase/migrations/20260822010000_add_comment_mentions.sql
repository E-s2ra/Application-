-- User mentions are resolved and validated in PostgreSQL. This protects every
-- client path (mobile, web, and future admin tools) instead of trusting text UI.

create table if not exists public.comment_mentions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create index if not exists idx_comment_mentions_user
  on public.comment_mentions (mentioned_user_id, created_at desc);

alter table public.comment_mentions enable row level security;

drop policy if exists "comment_mentions_select_participants" on public.comment_mentions;
create policy "comment_mentions_select_participants"
  on public.comment_mentions for select to authenticated
  using (
    mentioned_user_id = auth.uid()
    or exists (select 1 from public.comments where comments.id = comment_id and comments.user_id = auth.uid())
  );

revoke all on public.comment_mentions from anon, authenticated;
grant select on public.comment_mentions to authenticated;

create unique index if not exists notifications_one_mention_per_comment_user
  on public.notifications (user_id, resource_id)
  where type = 'user_mention';

create or replace function public.sync_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invalid_username text;
begin
  -- A changed comment gets a fresh, accurate mention set and notification list.
  delete from public.comment_mentions where comment_id = new.id;
  delete from public.notifications where type = 'user_mention' and resource_type = 'comment' and resource_id = new.id;

  with requested_mentions as (
    select distinct lower(matches[2]) as username
    from regexp_matches(new.content, '(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,30})', 'g') as matches
  )
  select requested_mentions.username into invalid_username
  from requested_mentions
  left join public.profiles on lower(profiles.username) = requested_mentions.username
  where profiles.id is null
  limit 1;

  if invalid_username is not null then
    raise exception 'Unknown username: @%', invalid_username using errcode = '23514';
  end if;

  insert into public.comment_mentions (comment_id, mentioned_user_id)
  select new.id, profiles.id
  from public.profiles
  join (
    select distinct lower(matches[2]) as username
    from regexp_matches(new.content, '(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,30})', 'g') as matches
  ) as requested_mentions on lower(profiles.username) = requested_mentions.username;

  insert into public.notifications (user_id, actor_id, type, title, body, resource_type, resource_id, metadata)
  select
    mentions.mentioned_user_id,
    new.user_id,
    'user_mention',
    'You were mentioned',
    left(coalesce(author.username, author.full_name, 'A community member') || ' mentioned you in a comment.', 500),
    'comment',
    new.id,
    jsonb_build_object('movie_id', new.movie_id)
  from public.comment_mentions as mentions
  left join public.profiles as author on author.id = new.user_id
  where mentions.comment_id = new.id and mentions.mentioned_user_id <> new.user_id
  on conflict (user_id, resource_id) where type = 'user_mention' do nothing;

  return new;
end;
$$;

drop trigger if exists sync_mentions_after_comment_change on public.comments;
create trigger sync_mentions_after_comment_change
  after insert or update of content on public.comments
  for each row execute function public.sync_comment_mentions();
