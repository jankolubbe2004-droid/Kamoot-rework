-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists postgis;
create extension if not exists pgcrypto;   -- needed for gen_salt / crypt in seed

-- ============================================================
-- PROFILES
-- Extends auth.users — auto-created via trigger on signup.
-- ============================================================
create table public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  username        text        not null unique,
  avatar_url      text,
  plan            text        not null default 'free'
                              check (plan in ('free', 'explorer', 'lifetime')),
  plan_expires_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- All authenticated and anonymous users can read any profile
-- (needed for route cards showing author names / avatars)
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Users can only update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile row on signup (runs as security definer — bypasses RLS)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
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
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  title            text        not null,
  description      text,
  sport_type       text        not null
                               check (sport_type in (
                                 'hiking','cycling','trail_running',
                                 'mountain_biking','walking'
                               )),
  distance_m       numeric(10,2) not null default 0,
  elevation_gain_m numeric(10,2) not null default 0,
  difficulty       text        not null
                               check (difficulty in ('easy','moderate','hard','expert')),
  gpx_url          text,
  is_public        boolean     not null default false,
  waypoints        jsonb       not null default '[]',
  created_at       timestamptz not null default now()
);

create index routes_user_id_idx        on public.routes(user_id);
create index routes_public_created_idx on public.routes(is_public, created_at desc)
  where is_public = true;
create index routes_sport_type_idx     on public.routes(sport_type);
create index routes_difficulty_idx     on public.routes(difficulty);

alter table public.routes enable row level security;

-- Public routes are readable by everyone; private routes only by owner
create policy "routes_select"
  on public.routes for select
  using (is_public = true or auth.uid() = user_id);

create policy "routes_insert_own"
  on public.routes for insert
  with check (auth.uid() = user_id);

create policy "routes_update_own"
  on public.routes for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "routes_delete_own"
  on public.routes for delete
  using (auth.uid() = user_id);

-- ============================================================
-- ACTIVITIES
-- Private to the recording user — never publicly readable.
-- ============================================================
create table public.activities (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  route_id         uuid        references public.routes(id) on delete set null,
  started_at       timestamptz not null,
  finished_at      timestamptz,
  distance_m       numeric(10,2) not null default 0,
  elevation_gain_m numeric(10,2) not null default 0,
  avg_hr           integer,
  max_hr           integer,
  gpx_url          text,
  photos           jsonb       not null default '[]',
  created_at       timestamptz not null default now()
);

create index activities_user_id_idx    on public.activities(user_id);
create index activities_started_at_idx on public.activities(user_id, started_at desc);

alter table public.activities enable row level security;

-- All four operations are owner-only
create policy "activities_select_own"
  on public.activities for select
  using (auth.uid() = user_id);

create policy "activities_insert_own"
  on public.activities for insert
  with check (auth.uid() = user_id);

create policy "activities_update_own"
  on public.activities for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "activities_delete_own"
  on public.activities for delete
  using (auth.uid() = user_id);

-- ============================================================
-- ROUTE PHOTOS
-- Attached to a route; readable whenever the parent route is readable.
-- ============================================================
create table public.route_photos (
  id           uuid        primary key default gen_random_uuid(),
  route_id     uuid        not null references public.routes(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  storage_path text        not null,
  caption      text,
  lat          numeric(10,7),
  lng          numeric(10,7),
  created_at   timestamptz not null default now()
);

create index route_photos_route_id_idx on public.route_photos(route_id);

alter table public.route_photos enable row level security;

-- Readable when the parent route is public or the viewer owns the route
create policy "route_photos_select"
  on public.route_photos for select
  using (
    exists (
      select 1 from public.routes r
      where r.id = route_id
        and (r.is_public = true or r.user_id = auth.uid())
    )
  );

-- Users can add photos to any route they can see (community contributions)
create policy "route_photos_insert_own"
  on public.route_photos for insert
  with check (auth.uid() = user_id);

-- Users can only delete their own photos
create policy "route_photos_delete_own"
  on public.route_photos for delete
  using (auth.uid() = user_id);

-- ============================================================
-- ROUTE RATINGS
-- Users can rate any public route; ratings on public routes are public.
-- ============================================================
create table public.route_ratings (
  id         uuid        primary key default gen_random_uuid(),
  route_id   uuid        not null references public.routes(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  rating     integer     not null check (rating between 1 and 5),
  review     text,
  created_at timestamptz not null default now(),
  unique (route_id, user_id)
);

create index route_ratings_route_id_idx on public.route_ratings(route_id);

alter table public.route_ratings enable row level security;

-- Ratings on public routes are readable by all; ratings on private routes
-- are readable only by the route owner or the rater themselves
create policy "route_ratings_select"
  on public.route_ratings for select
  using (
    exists (
      select 1 from public.routes r
      where r.id = route_id
        and (r.is_public = true or r.user_id = auth.uid())
    )
    or auth.uid() = user_id
  );

-- Authenticated users can rate public routes
create policy "route_ratings_insert_own"
  on public.route_ratings for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.routes r
      where r.id = route_id and r.is_public = true
    )
  );

-- Users can update only their own ratings
create policy "route_ratings_update_own"
  on public.route_ratings for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete only their own ratings
create policy "route_ratings_delete_own"
  on public.route_ratings for delete
  using (auth.uid() = user_id);

-- ============================================================
-- SENSOR READINGS
-- Time-series stored as a JSONB array per activity. Owner-only.
-- data format: [{t, hr?, cad?, power?, lat?, lng?, ele?}]
-- ============================================================
create table public.sensor_readings (
  id          uuid        primary key default gen_random_uuid(),
  activity_id uuid        not null references public.activities(id) on delete cascade,
  data        jsonb       not null default '[]',
  created_at  timestamptz not null default now()
);

create index sensor_readings_activity_id_idx on public.sensor_readings(activity_id);

alter table public.sensor_readings enable row level security;

create policy "sensor_readings_select_own"
  on public.sensor_readings for select
  using (
    exists (
      select 1 from public.activities a
      where a.id = activity_id and a.user_id = auth.uid()
    )
  );

create policy "sensor_readings_insert_own"
  on public.sensor_readings for insert
  with check (
    exists (
      select 1 from public.activities a
      where a.id = activity_id and a.user_id = auth.uid()
    )
  );

create policy "sensor_readings_delete_own"
  on public.sensor_readings for delete
  using (
    exists (
      select 1 from public.activities a
      where a.id = activity_id and a.user_id = auth.uid()
    )
  );

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Average rating for a route (returns null when no ratings exist)
create or replace function public.route_avg_rating(route_id uuid)
returns numeric
language sql stable
as $$
  select round(avg(rating)::numeric, 1)
  from public.route_ratings
  where route_ratings.route_id = route_avg_rating.route_id;
$$;

-- Count of public routes by a user
create or replace function public.user_public_route_count(user_id uuid)
returns bigint
language sql stable
as $$
  select count(*)
  from public.routes
  where routes.user_id = user_public_route_count.user_id
    and routes.is_public = true;
$$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('gpx-files',    'gpx-files',    false, 10485760,  array['application/gpx+xml','application/xml','text/xml']),
  ('route-photos', 'route-photos', true,  5242880,   array['image/jpeg','image/png','image/webp','image/heic']),
  ('avatars',      'avatars',      true,  2097152,   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- GPX files: owner can do everything; path must start with their user_id
create policy "gpx_files_owner_all"
  on storage.objects for all
  using  (bucket_id = 'gpx-files' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'gpx-files' and auth.uid()::text = (storage.foldername(name))[1]);

-- Route photos: anyone can read; authenticated users can upload
create policy "route_photos_public_select"
  on storage.objects for select
  using (bucket_id = 'route-photos');

create policy "route_photos_auth_insert"
  on storage.objects for insert
  with check (bucket_id = 'route-photos' and auth.uid() is not null);

create policy "route_photos_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'route-photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Avatars: anyone can read; users can manage their own folder
create policy "avatars_public_select"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_all"
  on storage.objects for all
  using  (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
