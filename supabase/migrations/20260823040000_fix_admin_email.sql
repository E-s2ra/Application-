-- Migration: 20260823040000_fix_admin_email.sql
-- The admin account is esra99san@gmail.com, not admin@aniflix.com.
-- Update is_admin(), the trigger, and the profiles table to use the real email.

-- 1. Fix the admin role enforcement trigger
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

-- 2. Fix the is_admin() check to use the real admin email
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

-- 3. Fix the admin_delete_all_anime function to also allow by email directly
--    (belt-and-suspenders: checks email OR role = 'admin')
create or replace function public.admin_delete_all_anime()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_count integer;
  caller_email  text;
begin
  select lower(email) into caller_email
  from auth.users where id = auth.uid();

  if caller_email != 'esra99san@gmail.com' and not public.is_admin() then
    raise exception 'Permission denied: admin only';
  end if;

  delete from public.anime;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.admin_delete_all_anime() from public;
grant execute on function public.admin_delete_all_anime() to authenticated;

-- 4. Ensure the real admin profile has role = 'admin'
update public.profiles
set role = 'admin'
where id in (
  select id from auth.users where lower(email) = 'esra99san@gmail.com'
);

-- 5. Also correct is_admin() to work even if profile row doesn't exist
--    (pure email-based check as a simpler fallback)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(email) = 'esra99san@gmail.com'
  from auth.users
  where id = auth.uid();
$$;
