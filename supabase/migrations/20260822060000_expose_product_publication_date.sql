-- Published date drives the New Products rail. It is read-only to clients.
grant select (published_at) on public.anime to anon, authenticated;
