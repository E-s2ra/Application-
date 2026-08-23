-- Migration: 20260823030000_admin_delete_all_anime.sql
-- Adds a secure SECURITY DEFINER function that lets the admin delete all anime.
-- Bypasses RLS safely since only an authenticated admin can call it.

create or replace function public.admin_delete_all_anime()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  -- Only allow if caller is an admin
  if not public.is_admin() then
    raise exception 'Permission denied: admin only';
  end if;

  delete from public.anime;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Only authenticated users can call it (RLS check inside ensures admin only)
revoke all on function public.admin_delete_all_anime() from public;
grant execute on function public.admin_delete_all_anime() to authenticated;
