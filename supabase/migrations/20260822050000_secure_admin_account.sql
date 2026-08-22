-- Only the named account may hold the application admin role. No password is
-- created or stored here; the account must be created through Supabase Auth.

create or replace function public.enforce_approved_admin_role()
returns trigger
language plpgsql
security definer
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

drop trigger if exists enforce_approved_admin_role on public.profiles;
create trigger enforce_approved_admin_role
  before insert or update of role on public.profiles
  for each row execute function public.enforce_approved_admin_role();

-- Correct prior name-based privilege assignments without changing any user,
-- password, or application data.
update public.profiles
set role = case when exists (
  select 1 from auth.users
  where auth.users.id = public.profiles.id
    and lower(auth.users.email) = 'esra99san@gmail.com'
) then 'admin' else 'user' end;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    join auth.users on auth.users.id = profiles.id
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and lower(auth.users.email) = 'esra99san@gmail.com'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
