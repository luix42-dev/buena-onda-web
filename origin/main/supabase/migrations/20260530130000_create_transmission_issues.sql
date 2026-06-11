create table if not exists transmission_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  body text,
  excerpt text,
  status text not null default 'draft' check (status in ('draft', 'live')),
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table transmission_issues enable row level security;

drop policy if exists "Read live issues" on transmission_issues;
create policy "Read live issues" on transmission_issues
  for select using (status = 'live');

drop policy if exists "Full access for authenticated" on transmission_issues;
create policy "Full access for authenticated" on transmission_issues
  for all using (auth.role() = 'authenticated');

create index if not exists idx_transmission_status on transmission_issues(status);
create index if not exists idx_transmission_published on transmission_issues(published_at);
