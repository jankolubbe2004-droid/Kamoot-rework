-- Enable PostGIS for geographic queries
create extension if not exists postgis;

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  avatar_url  text,
  plan        text not null default 'free' check (plan in ('free', 'explorer', 'lifetime')),
  plan_expires_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROUTES
-- ============================================================
create table public.routes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null,
  description      text,
  sport_type       text not null check (sport_type in ('hiking','cycling','trail_running','mountain_biking','walking')),
  distance_m       numeric(10,2) not null default 0,
  elevation_gain_m numeric(10,2) not null default 0,
  difficulty       text not null check (difficulty in ('easy','moderate','hard','expert')),
  gpx_url          text,
  is_public        boolean not null default false,
  waypoints        jsonb not null default '[]',
  created_at       timestamptz not null default now()
);

create index routes_user_id_idx on public.routes(user_id);
create index routes_public_idx  on public.routes(is_public) where is_public = true;
create index routes_sport_idx   on public.routes(sport_type);

alter table public.routes enable row level security;

create policy "routes_select_own_or_public" on public.routes
  for select using (auth.uid() = user_id or is_public = true);

create policy "routes_insert_own" on public.routes
  for insert with check (auth.uid() = user_id);

create policy "routes_update_own" on public.routes
  for update using (auth.uid() = user_id);

create policy "routes_delete_own" on public.routes
  for delete using (auth.uid() = user_id);

-- ============================================================
-- ACTIVITIES
-- ============================================================
create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  route_id         uuid references public.routes(id) on delete set null,
  started_at       timestamptz not null,
  finished_at      timestamptz,
  distance_m       numeric(10,2) not null default 0,
  elevation_gain_m numeric(10,2) not null default 0,
  avg_hr           integer,
  max_hr           integer,
  gpx_url          text,
  photos           jsonb not null default '[]',
  created_at       timestamptz not null default now()
);

create index activities_user_id_idx on public.activities(user_id);

alter table public.activities enable row level security;

create policy "activities_own" on public.activities
  for all using (auth.uid() = user_id);

-- ============================================================
-- ROUTE PHOTOS
-- ============================================================
create table public.route_photos (
  id           uuid primary key default gen_random_uuid(),
  route_id     uuid not null references public.routes(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption      text,
  lat          numeric(10,7),
  lng          numeric(10,7),
  created_at   timestamptz not null default now()
);

create index route_photos_route_id_idx on public.route_photos(route_id);

alter table public.route_photos enable row level security;

create policy "route_photos_select_public_route" on public.route_photos
  for select using (
    exists (select 1 from public.routes r where r.id = route_id and (r.is_public or r.user_id = auth.uid()))
  );

create policy "route_photos_insert_own" on public.route_photos
  for insert with check (auth.uid() = user_id);

create policy "route_photos_delete_own" on public.route_photos
  for delete using (auth.uid() = user_id);

-- ============================================================
-- ROUTE RATINGS
-- ============================================================
create table public.route_ratings (
  id         uuid primary key default gen_random_uuid(),
  route_id   uuid not null references public.routes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  rating     integer not null check (rating >= 1 and rating <= 5),
  review     text,
  created_at timestamptz not null default now(),
  unique (route_id, user_id)
);

create index route_ratings_route_id_idx on public.route_ratings(route_id);

alter table public.route_ratings enable row level security;

create policy "route_ratings_select_public" on public.route_ratings
  for select using (
    exists (select 1 from public.routes r where r.id = route_id and (r.is_public or r.user_id = auth.uid()))
  );

create policy "route_ratings_insert_own" on public.route_ratings
  for insert with check (auth.uid() = user_id);

create policy "route_ratings_update_own" on public.route_ratings
  for update using (auth.uid() = user_id);

create policy "route_ratings_delete_own" on public.route_ratings
  for delete using (auth.uid() = user_id);

-- ============================================================
-- SENSOR READINGS
-- ============================================================
create table public.sensor_readings (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  data        jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

alter table public.sensor_readings enable row level security;

create policy "sensor_readings_own" on public.sensor_readings
  for all using (
    exists (select 1 from public.activities a where a.id = activity_id and a.user_id = auth.uid())
  );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values ('gpx-files', 'gpx-files', false);
insert into storage.buckets (id, name, public) values ('route-photos', 'route-photos', true);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "gpx_files_own" on storage.objects
  for all using (bucket_id = 'gpx-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "route_photos_public_read" on storage.objects
  for select using (bucket_id = 'route-photos');

create policy "route_photos_auth_write" on storage.objects
  for insert with check (bucket_id = 'route-photos' and auth.role() = 'authenticated');

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_own_write" on storage.objects
  for all using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
