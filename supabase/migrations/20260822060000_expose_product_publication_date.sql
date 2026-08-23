-- Published date drives the New Products rail. It is read-only to clients.
alter table public.anime add column if not exists published_at timestamptz default now();
grant select (published_at) on public.anime to anon, authenticated;
