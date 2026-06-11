-- ─────────────────────────────────────────────────────────────────────────────
-- Buena Onda — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Helper: auto-update updated_at ──────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: posts  (culture essays & dispatches)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists posts (
  id            uuid        default gen_random_uuid() primary key,
  title         text        not null,
  slug          text        unique not null,
  excerpt       text,
  body          text,
  cover_image   text,
  tags          text[]      default '{}',
  published_at  timestamptz,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,
  published     boolean     default false not null
);

create index if not exists posts_published_at_idx on posts (published_at desc);
create index if not exists posts_slug_idx         on posts (slug);
create index if not exists posts_published_idx    on posts (published);

create trigger posts_updated_at
  before update on posts
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: episodes  (radio archive)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists episodes (
  id             uuid        default gen_random_uuid() primary key,
  title          text        not null,
  slug           text        unique not null,
  description    text,
  audio_url      text,
  cover_image    text,
  duration       integer,              -- duration in seconds
  episode_number integer,
  tags           text[]      default '{}',
  published_at   timestamptz,
  created_at     timestamptz default now() not null,
  published      boolean     default false not null
);

create index if not exists episodes_episode_number_idx on episodes (episode_number desc);
create index if not exists episodes_published_idx      on episodes (published);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: drops  (objects & limited editions)
-- ─────────────────────────────────────────────────────────────────────────────
create type drop_status as enum ('upcoming', 'live', 'sold_out');

create table if not exists drops (
  id          uuid        default gen_random_uuid() primary key,
  name        text        not null,
  slug        text        unique not null,
  description text,
  price       numeric(10,2),
  images      text[]      default '{}',
  status      drop_status default 'upcoming' not null,
  drop_date   timestamptz,
  created_at  timestamptz default now() not null,
  available   boolean     default false not null
);

create index if not exists drops_status_idx    on drops (status);
create index if not exists drops_drop_date_idx on drops (drop_date desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: media_assets  (images, audio, video)
-- ─────────────────────────────────────────────────────────────────────────────
create type media_type as enum ('image', 'audio', 'video');

create table if not exists media_assets (
  id         uuid        default gen_random_uuid() primary key,
  filename   text        not null,
  url        text        not null,
  type       media_type,
  width      integer,
  height     integer,
  size       integer,              -- bytes
  alt_text   text,
  tags       text[]      default '{}',
  created_at timestamptz default now() not null
);

create index if not exists media_assets_type_idx on media_assets (type);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: site_settings  (key-value store for dynamic config)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists site_settings (
  key        text        primary key,
  value      jsonb       not null default '{}',
  updated_at timestamptz default now() not null
);

create trigger site_settings_updated_at
  before update on site_settings
  for each row execute function update_updated_at();

-- ── Seed default settings ────────────────────────────────────────────────────
insert into site_settings (key, value) values
  ('hero',       '{"title": "Buena Onda", "subtitle": "An Analog Culture House", "cta": "Read Culture"}'),
  ('social',     '{"instagram": "https://instagram.com/buenaondalifestyle", "mixcloud": "", "spotify": ""}'),
  ('contact',    '{"email": "hello@buenaonda.com", "city": "Miami, FL"}'),
  ('newsletter', '{"enabled": true, "provider": "resend"}')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: newsletter_subscribers
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists newsletter_subscribers (
  id           uuid        default gen_random_uuid() primary key,
  email        text        unique not null,
  confirmed    boolean     default false not null,
  created_at   timestamptz default now() not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Posts: public read for published, write requires auth
alter table posts             enable row level security;
alter table episodes          enable row level security;
alter table drops             enable row level security;
alter table media_assets      enable row level security;
alter table site_settings     enable row level security;
alter table newsletter_subscribers enable row level security;

-- Posts
create policy "Public can read published posts"
  on posts for select using (published = true);
create policy "Authenticated can manage posts"
  on posts for all using (auth.role() = 'authenticated');

-- Episodes
create policy "Public can read published episodes"
  on episodes for select using (published = true);
create policy "Authenticated can manage episodes"
  on episodes for all using (auth.role() = 'authenticated');

-- Drops: all are publicly readable
create policy "Public can read drops"
  on drops for select using (true);
create policy "Authenticated can manage drops"
  on drops for all using (auth.role() = 'authenticated');

-- Media assets: public read
create policy "Public can read media assets"
  on media_assets for select using (true);
create policy "Authenticated can manage media assets"
  on media_assets for all using (auth.role() = 'authenticated');

-- Site settings: public read
create policy "Public can read site settings"
  on site_settings for select using (true);
create policy "Authenticated can manage site settings"
  on site_settings for all using (auth.role() = 'authenticated');

-- Newsletter: anyone can insert, only auth can read
create policy "Anyone can subscribe to newsletter"
  on newsletter_subscribers for insert with check (true);
create policy "Authenticated can read subscribers"
  on newsletter_subscribers for select using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKETS  (run in Supabase Dashboard → Storage → New Bucket)
-- ─────────────────────────────────────────────────────────────────────────────
-- These SQL statements create the storage buckets programmatically.
-- Alternatively, create them via the Supabase Dashboard UI.

insert into storage.buckets (id, name, public) values
  ('images', 'images', true),
  ('audio',  'audio',  true)
on conflict (id) do nothing;

create policy "Public can view images"
  on storage.objects for select using (bucket_id = 'images');
create policy "Authenticated can upload images"
  on storage.objects for insert using (auth.role() = 'authenticated' and bucket_id = 'images');

create policy "Public can view audio"
  on storage.objects for select using (bucket_id = 'audio');
create policy "Authenticated can upload audio"
  on storage.objects for insert using (auth.role() = 'authenticated' and bucket_id = 'audio');
