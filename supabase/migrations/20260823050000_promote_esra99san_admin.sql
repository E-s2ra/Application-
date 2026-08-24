-- Migration: 20260823050000_promote_esra99san_admin.sql
-- Ensure esra99san@gmail.com is promoted to admin directly in the database

update public.profiles
set role = 'admin'
from auth.users
where auth.users.id = public.profiles.id
  and lower(auth.users.email) = 'esra99san@gmail.com';
