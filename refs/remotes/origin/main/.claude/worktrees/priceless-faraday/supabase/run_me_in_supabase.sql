-- ─────────────────────────────────────────────────────────────────────────────
-- Buena Onda — COMPLETE MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run All
-- Safe to run on a fresh project. Includes all tables, policies, seed data.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1 — schema.sql (core tables)
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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

drop trigger if exists posts_updated_at on posts;
create trigger posts_updated_at
  before update on posts
  for each row execute function update_updated_at();

create table if not exists episodes (
  id             uuid        default gen_random_uuid() primary key,
  title          text        not null,
  slug           text        unique not null,
  description    text,
  audio_url      text,
  cover_image    text,
  duration       integer,
  episode_number integer,
  tags           text[]      default '{}',
  published_at   timestamptz,
  created_at     timestamptz default now() not null,
  published      boolean     default false not null
);

create index if not exists episodes_episode_number_idx on episodes (episode_number desc);
create index if not exists episodes_published_idx      on episodes (published);

do $$ begin
  create type drop_status as enum ('upcoming', 'live', 'sold_out');
exception when duplicate_object then null; end $$;

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

do $$ begin
  create type media_type as enum ('image', 'audio', 'video');
exception when duplicate_object then null; end $$;

create table if not exists media_assets (
  id         uuid        default gen_random_uuid() primary key,
  filename   text        not null,
  url        text        not null,
  type       media_type,
  width      integer,
  height     integer,
  size       integer,
  alt_text   text,
  tags       text[]      default '{}',
  created_at timestamptz default now() not null
);

create index if not exists media_assets_type_idx on media_assets (type);

create table if not exists site_settings (
  key        text        primary key,
  value      jsonb       not null default '{}',
  updated_at timestamptz default now() not null
);

drop trigger if exists site_settings_updated_at on site_settings;
create trigger site_settings_updated_at
  before update on site_settings
  for each row execute function update_updated_at();

insert into site_settings (key, value) values
  ('hero',       '{"title": "Buena Onda", "subtitle": "An Analog Culture House", "cta": "Read Culture"}'),
  ('social',     '{"instagram": "https://instagram.com/buenaondalifestyle", "mixcloud": "", "spotify": ""}'),
  ('contact',    '{"email": "hello@buenaonda.com", "city": "Miami, FL"}'),
  ('newsletter', '{"enabled": true, "provider": "resend"}')
on conflict (key) do nothing;

create table if not exists newsletter_subscribers (
  id           uuid        default gen_random_uuid() primary key,
  email        text        unique not null,
  confirmed    boolean     default false not null,
  created_at   timestamptz default now() not null
);

alter table posts                 enable row level security;
alter table episodes              enable row level security;
alter table drops                 enable row level security;
alter table media_assets          enable row level security;
alter table site_settings         enable row level security;
alter table newsletter_subscribers enable row level security;

do $$ begin
  create policy "Public can read published posts" on posts for select using (published = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can manage posts" on posts for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public can read published episodes" on episodes for select using (published = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can manage episodes" on episodes for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public can read drops" on drops for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can manage drops" on drops for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public can read media assets" on media_assets for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can manage media assets" on media_assets for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public can read site settings" on site_settings for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can manage site settings" on site_settings for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Anyone can subscribe to newsletter" on newsletter_subscribers for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can read subscribers" on newsletter_subscribers for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public) values
  ('images', 'images', true),
  ('audio',  'audio',  true)
on conflict (id) do nothing;

do $$ begin
  create policy "Public can view images" on storage.objects for select using (bucket_id = 'images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can upload images" on storage.objects for insert using (auth.role() = 'authenticated' and bucket_id = 'images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Public can view audio" on storage.objects for select using (bucket_id = 'audio');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can upload audio" on storage.objects for insert using (auth.role() = 'authenticated' and bucket_id = 'audio');
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2 — catalog_migration.sql (themes, items, item_images)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists themes (
  id              uuid        default gen_random_uuid() primary key,
  title           text        not null,
  slug            text        unique not null,
  code            text        not null check (length(code) between 2 and 6),
  description     text,
  editorial_text  text,
  cover_image     text,
  featured        boolean     default false not null,
  published       boolean     default false not null,
  sort_order      integer     default 0 not null,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create unique index if not exists themes_code_idx on themes (upper(code));
create index if not exists themes_slug_idx      on themes (slug);
create index if not exists themes_featured_idx  on themes (featured) where featured = true;
create index if not exists themes_published_idx on themes (published);

drop trigger if exists themes_updated_at on themes;
create trigger themes_updated_at
  before update on themes
  for each row execute function update_updated_at();

-- Create item_status enum with sold_out from the start
do $$ begin
  create type item_status as enum ('draft', 'published', 'archived', 'sold_out');
exception when duplicate_object then
  -- Enum exists; add sold_out if missing
  alter type item_status add value if not exists 'sold_out';
end $$;

create table if not exists items (
  id              uuid        default gen_random_uuid() primary key,
  title           text        not null,
  slug            text        unique not null,
  catalog_number  text        unique,
  theme_id        uuid        references themes (id) on delete set null,
  description     text,
  details         jsonb       default '{}'::jsonb,
  price           numeric(10,2),
  buy_url         text,
  tags            text[]      default '{}',
  status          item_status default 'draft' not null,
  featured        boolean     default false not null,
  cover_image_url text,
  published_at    timestamptz,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index if not exists items_theme_id_idx    on items (theme_id);
create index if not exists items_status_idx      on items (status);
create index if not exists items_slug_idx        on items (slug);
create index if not exists items_featured_idx    on items (featured) where featured = true;
create index if not exists items_catalog_num_idx on items (catalog_number);
create index if not exists items_tags_idx        on items using gin (tags);

drop trigger if exists items_updated_at on items;
create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

create table if not exists item_images (
  id           uuid        default gen_random_uuid() primary key,
  item_id      uuid        not null references items (id) on delete cascade,
  url          text        not null,
  storage_path text,
  alt_text     text,
  sort_order   integer     default 0 not null,
  created_at   timestamptz default now() not null
);

create index if not exists item_images_item_id_idx on item_images (item_id, sort_order);

create or replace function generate_catalog_number(p_theme_id uuid)
returns text
language plpgsql
as $$
declare
  v_code   text;
  v_year   text;
  v_prefix text;
  v_max    int;
  v_seq    text;
begin
  select upper(code) into v_code from themes where id = p_theme_id;
  if v_code is null then
    raise exception 'Theme not found: %', p_theme_id;
  end if;

  v_year   := to_char(now(), 'YYYY');
  v_prefix := 'BO-' || v_code || '-' || v_year || '-';

  select coalesce(
    max(cast(right(catalog_number, 4) as int)),
    0
  ) + 1
  into v_max
  from items
  where catalog_number like v_prefix || '%';

  v_seq := lpad(v_max::text, 4, '0');
  return v_prefix || v_seq;
end;
$$;

alter table themes      enable row level security;
alter table items       enable row level security;
alter table item_images enable row level security;

-- Themes policies
do $$ begin
  create policy "Public can read published themes"
    on themes for select using (published = true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can manage themes"
    on themes for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Items policies — sold_out and archived items stay visible on the site
do $$ begin
  create policy "Public can read visible items"
    on items for select using (status in ('published', 'sold_out', 'archived'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can manage items"
    on items for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Item images — visible for all non-draft items
do $$ begin
  create policy "Public can read images of visible items"
    on item_images for select using (
      exists (
        select 1 from items
        where items.id = item_images.item_id
          and items.status in ('published', 'sold_out', 'archived')
      )
    );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can manage item images"
    on item_images for all using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- Catalog storage bucket
insert into storage.buckets (id, name, public) values
  ('catalog', 'catalog', true)
on conflict (id) do nothing;

do $$ begin
  create policy "Public can view catalog images"
    on storage.objects for select using (bucket_id = 'catalog');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can upload catalog images"
    on storage.objects for insert
    with check (auth.role() = 'authenticated' and bucket_id = 'catalog');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Authenticated can delete catalog images"
    on storage.objects for delete
    using (auth.role() = 'authenticated' and bucket_id = 'catalog');
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3 — item_notify_requests table (new)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists item_notify_requests (
  id         uuid        default gen_random_uuid() primary key,
  item_id    uuid        not null references items (id) on delete cascade,
  email      text        not null,
  created_at timestamptz default now() not null
);

alter table item_notify_requests enable row level security;

do $$ begin
  create policy "Anyone can insert notify request"
    on item_notify_requests for insert to anon with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Auth can read notify requests"
    on item_notify_requests for select to authenticated using (true);
exception when duplicate_object then null; end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4 — Seed: Curated Vintage theme + 2 items
-- ═══════════════════════════════════════════════════════════════════════════

with new_theme as (
  insert into themes (title, slug, code, description, published, sort_order)
  values (
    'Curated Vintage',
    'curated-vintage',
    'VNL',
    'Objects with provenance, patina, and purpose.',
    true,
    1
  )
  on conflict (slug) do update
    set published = true
  returning id
)
insert into items (title, slug, theme_id, description, details, price, status, published_at)
select
  v.title,
  v.slug,
  new_theme.id,
  v.description,
  v.details::jsonb,
  v.price::numeric,
  v.status::item_status,
  now()
from new_theme
cross join (
  values
    (
      'Low Cabinet No. 4',
      'low-cabinet-no-4',
      'A striking low cabinet in vivid red lacquer. Clean lines, museum-grade finish.',
      '{"material":"Red lacquer","condition":"Excellent","origin":"Miami, FL","era":"1990s","why_we_chose_this":"We found this piece at a Miami estate and could not leave without it. The lacquer depth is rare — this is not a reproduction finish. It belongs in a room that takes objects seriously."}',
      '299',
      'published'
    ),
    (
      'Modular Storage Unit No. 7',
      'modular-storage-unit-no-7',
      'Cobalt blue and white modular storage. Bold geometry, functional depth.',
      '{"material":"Cobalt blue and white lacquer","condition":"Very Good","origin":"Miami, FL","era":"1980s","why_we_chose_this":"A piece that stops the room. The cobalt-to-white transition is precise and deliberate — made by someone who understood color as architecture."}',
      '350',
      'published'
    )
) as v(title, slug, description, details, price, status)
on conflict (slug) do nothing;
