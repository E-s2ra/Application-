-- Comment deletion is authoritative in PostgreSQL. Cascading reply deletes are
-- already enforced by the parent_id foreign key; this removes notifications
-- that would otherwise point to deleted discussion content.

create or replace function public.remove_notifications_for_deleted_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where resource_type = 'comment'
    and (
      resource_id = old.id
      or metadata ->> 'parent_id' = old.id::text
    );

  return old;
end;
$$;

drop trigger if exists remove_notifications_for_deleted_comment on public.comments;
create trigger remove_notifications_for_deleted_comment
  after delete on public.comments
  for each row execute function public.remove_notifications_for_deleted_comment();
