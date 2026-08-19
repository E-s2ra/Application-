-- Migration: 018_create_anime_and_favorites.sql
-- Description: Creates anime and favorites tables with proper RLS policies

-- 1. Anime catalog table
create table if not exists public.anime (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  video_url text,
  episodes integer not null default 1,
  genre text,
  category text not null default 'Movies',
  is_featured boolean not null default false,
  views integer not null default 0,
  rating numeric(3, 1) not null default 5.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. User favorites table
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id uuid not null references public.anime(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, anime_id)
);

-- 3. Enable RLS
alter table public.anime enable row level security;
alter table public.favorites enable row level security;

-- 4. Anime Policies: Everyone can view, Admins can insert/update/delete
create policy "Anyone can read anime catalog"
  on public.anime for select
  using (true);

create policy "Admins can insert anime"
  on public.anime for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can update anime"
  on public.anime for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can delete anime"
  on public.anime for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 5. Favorites Policies: Users manage their own favorites
create policy "Users can view own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- Indexes for fast querying
create index if not exists idx_anime_category on public.anime(category);
create index if not exists idx_anime_featured on public.anime(is_featured);
create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_favorites_anime on public.favorites(anime_id);
