-- Keep conversations easy to follow: a comment may have replies, but replies
-- cannot themselves be parents. This avoids unbounded nesting on mobile.

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

alter table public.comments
  drop constraint if exists comments_not_own_parent;
alter table public.comments
  add constraint comments_not_own_parent check (parent_id is null or parent_id <> id);

create index if not exists idx_comments_parent_created
  on public.comments (parent_id, created_at asc)
  where parent_id is not null;

create or replace function public.enforce_single_level_comment_replies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if not exists (
    select 1 from public.comments parent
    where parent.id = new.parent_id and parent.parent_id is null
  ) then
    raise exception 'Replies must be attached to a top-level comment' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_level_comment_replies on public.comments;
create trigger enforce_single_level_comment_replies
  before insert or update of parent_id on public.comments
  for each row execute function public.enforce_single_level_comment_replies();

create unique index if not exists notifications_one_reply_per_comment_user
  on public.notifications (user_id, resource_id)
  where type = 'comment_reply';

create or replace function public.notify_parent_comment_author_of_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author_id uuid;
  author_label text;
begin
  if new.parent_id is null then
    return new;
  end if;

  select user_id into parent_author_id from public.comments where id = new.parent_id;
  if parent_author_id is null or parent_author_id = new.user_id then
    return new;
  end if;

  select coalesce(username, full_name, 'A community member')
    into author_label
  from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, actor_id, type, title, body, resource_type, resource_id, metadata)
  values (
    parent_author_id,
    new.user_id,
    'comment_reply',
    'New reply to your comment',
    left(coalesce(author_label, 'A community member') || ' replied to your comment.', 500),
    'comment',
    new.id,
    jsonb_build_object('movie_id', new.movie_id, 'parent_id', new.parent_id)
  )
  on conflict (user_id, resource_id) where type = 'comment_reply' do nothing;

  return new;
end;
$$;

drop trigger if exists notify_parent_comment_author_of_reply on public.comments;
create trigger notify_parent_comment_author_of_reply
  after insert on public.comments
  for each row execute function public.notify_parent_comment_author_of_reply();
