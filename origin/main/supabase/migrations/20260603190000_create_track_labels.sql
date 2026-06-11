create table if not exists track_labels (
  filename     text primary key,
  display_name text not null,
  created_at   timestamptz default now()
);
