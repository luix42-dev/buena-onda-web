-- ─────────────────────────────────────────────────────────────────────────────
-- Buena Onda — Timeline table
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists timeline (
  id          uuid        default gen_random_uuid() primary key,
  slug        text        unique not null,
  year        text        not null,
  title       text        not null,
  summary     text        not null default '',
  story       text        not null default '',
  photo       text,
  photos      text[]      not null default '{}',
  sort_order  int         not null default 0,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index if not exists timeline_slug_idx  on timeline (slug);
create index if not exists timeline_order_idx on timeline (sort_order);

create trigger timeline_updated_at
  before update on timeline
  for each row execute function update_updated_at();

-- ── Seed: existing timeline data ──────────────────────────────────────────────
-- Safe to re-run: ON CONFLICT DO NOTHING skips existing slugs

insert into timeline (slug, year, title, summary, story, photo, photos, sort_order) values

('pre-2014', 'PRE-2014', 'The Signal',
 'Vice City, the 1980s obsession, the frequency that started it all.',
 $$It started with Grand Theft Auto: Vice City. That game broke something open in me: the pastel buildings, the FM stations bleeding from car windows, the way everything felt like it was happening at golden hour. I didn't know what to call it yet. I just knew it was the world I wanted to live in. And it was set in Miami, of all places.

From that moment, the 1980s became a frequency I'd tuned into and couldn't leave. Miami Vice. Vintage. The weight of things made to last.

I was in Venezuela then, with no idea where the thread was leading.$$,
 null, '{}', 0),

('2014', '2014', 'Founded: Caracas to New York',
 'A personal practice in analog culture became something with a name.',
 $$In 2014 I started Buena Onda. I was a graphic designer in Venezuela: making tote bags, sewing pouches, printing shirts. Small things. But they were mine.

Then I moved to the U.S. New York first. The brand paused in 2016 while I found my footing, but the frequency never went quiet.$$,
 null, '{}', 1),

('2017', '2017', 'Miami',
 'Miami was always the destination. Almost ten years now.',
 $$In 2017 I moved to Miami: the city the thread had always been pointing toward. Almost ten years here now.$$,
 null, '{}', 2),

('2018', '2018', 'The B Group',
 'Miami confirmed everything. First t-shirt capsule drops.',
 $$Miami confirmed what the game had been telling me. This city holds the 1980s in its bones: in the architecture, in the people, in the record stores and estate sales in Coral Gables. I kept going deeper. Curating. Learning what made something worth keeping.

Launched my first t-shirt capsule that year: The B Group.$$,
 null, '{}', 3),

('2019', '2019', 'Jolt Radio',
 'Found a home at Jolt Radio. It fit.',
 $$Jolt Radio was the best find I'd made in Miami. Met John and Pedro Caignet and clicked immediately over our shared pull toward the 1980s and analog culture.

That same year I started DJing. 80s Club was already moving with Oswave releasing episodes on SoundCloud, and I stepped into that world.$$,
 null, '{}', 4),

('2020', '2020', 'The Active Year',
 'Joined forces with Estefania Blanco. Merch, markets, and an 80s content machine.',
 $$Joined forces with my best friend Estefania Blanco and built an 80s content machine together. Started releasing my own merch and doing vintage markets with the Love Tempo crew.

The reach opened doors: Glitterwave, Neonblonde86, TurnBackTheBlockToThe80s, Adriane Avery, Veronicawheels. Met my good friend Jason Ho, who made the best ad Buena Onda has had.

Started #NeonHuntMiami that year too.$$,
 null, '{}', 5),

('2022', '2022', 'Open Decks',
 'Opened the store at Jolt Radio. Launched Open Decks.',
 $$Opened my store at Jolt Radio and launched Open Decks: a project that the Miami community made their own.$$,
 null, '{}', 6),

('2025', '2025', 'Onda Tropical',
 'A new event format. Latin American, Caribbean, and Afro-rooted dance music.',
 $$Launched Onda Tropical: a seasonal event format rooted in Latin American, Caribbean, and Afro-rooted dance music. The house expanded.$$,
 null, '{}', 7),

('2026', '2026', 'The Relaunch',
 'Buena Onda becomes an analog culture house.',
 $$The relaunch. Call it a content creator era — I've come around on the phrase. Buena Onda is an analog culture house: the declaration, and everything before this was the proof.$$,
 null, '{}', 8)

on conflict (slug) do nothing;
