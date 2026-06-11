-- ─────────────────────────────────────────────────────────────────────────────
-- Buena Onda — Catalog Extension Migration
-- Run AFTER schema.sql in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: themes  (editorial "spreads" — curated groupings of items)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists themes (
  id              uuid        default gen_random_uuid() primary key,
  title           text        not null,
  slug            text        unique not null,
  code            text        not null check (length(code) between 2 and 6),  -- e.g. "VNL", "TXT"
  description     text,
  editorial_text  text,        -- long-form editorial copy, markdown OK
  cover_image     text,        -- Supabase Storage public URL
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

create trigger themes_updated_at
  before update on themes
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: items  (individual catalog objects)
-- ─────────────────────────────────────────────────────────────────────────────
create type item_status as enum ('draft', 'published', 'archived');

create table if not exists items (
  id              uuid        default gen_random_uuid() primary key,
  title           text        not null,
  slug            text        unique not null,
  catalog_number  text        unique,            -- BO-VNL-2025-0001 (auto-generated)
  theme_id        uuid        references themes (id) on delete set null,
  description     text,
  details         jsonb       default '{}'::jsonb, -- {material, dimensions, origin, year, condition}
  price           numeric(10,2),
  buy_url         text,                           -- outbound link or null for inquiry
  tags            text[]      default '{}',
  status          item_status default 'draft' not null,
  featured        boolean     default false not null,
  cover_image_url text,                           -- primary image (denormalized for speed)
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

create trigger items_updated_at
  before update on items
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: item_images  (one item : many images)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists item_images (
  id           uuid        default gen_random_uuid() primary key,
  item_id      uuid        not null references items (id) on delete cascade,
  url          text        not null,              -- Supabase Storage public URL
  storage_path text,                              -- e.g. "catalog/bo-vnl-2025-0001/01.jpg"
  alt_text     text,
  sort_order   integer     default 0 not null,
  created_at   timestamptz default now() not null
);

create index if not exists item_images_item_id_idx on item_images (item_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: generate_catalog_number(theme_id)
-- Returns the next BO-[CODE]-[YYYY]-[####] for a given theme
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
alter table themes      enable row level security;
alter table items       enable row level security;
alter table item_images enable row level security;

-- Themes
create policy "Public can read published themes"
  on themes for select using (published = true);
create policy "Authenticated can manage themes"
  on themes for all using (auth.role() = 'authenticated');

-- Items
create policy "Public can read published items"
  on items for select using (status = 'published');
create policy "Authenticated can manage items"
  on items for all using (auth.role() = 'authenticated');

-- Item images: follow their parent item visibility
create policy "Public can read images of published items"
  on item_images for select using (
    exists (
      select 1 from items
      where items.id = item_images.item_id
        and items.status = 'published'
    )
  );
create policy "Authenticated can manage item images"
  on item_images for all using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE: catalog bucket
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('catalog', 'catalog', true)
on conflict (id) do nothing;

create policy "Public can view catalog images"
  on storage.objects for select using (bucket_id = 'catalog');
create policy "Authenticated can upload catalog images"
  on storage.objects for insert
  with check (auth.role() = 'authenticated' and bucket_id = 'catalog');
create policy "Authenticated can delete catalog images"
  on storage.objects for delete
  using (auth.role() = 'authenticated' and bucket_id = 'catalog');

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE on admin access without Supabase Auth:
-- The Next.js admin panel uses an env-password gate (middleware.ts).
-- For the Supabase service_role key (SUPABASE_SERVICE_ROLE_KEY), all RLS
-- policies are bypassed automatically. Admin API routes use createServiceClient().
-- ─────────────────────────────────────────────────────────────────────────────
