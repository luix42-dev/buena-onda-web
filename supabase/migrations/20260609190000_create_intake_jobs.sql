create table if not exists intake_jobs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  job_type text not null
    check (job_type in ('intake', 'closeup', 'recolor')),
  telegram_update_id bigint,
  source_storage_path text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'done', 'failed')),
  chat_id text not null,
  telegram_message_id bigint not null,
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intake_jobs_status_created_idx
  on intake_jobs (status, created_at);

create index if not exists intake_jobs_item_id_idx
  on intake_jobs (item_id);

create index if not exists intake_jobs_job_type_idx
  on intake_jobs (job_type);

create unique index if not exists intake_jobs_intake_update_id_uidx
  on intake_jobs (telegram_update_id)
  where job_type = 'intake' and telegram_update_id is not null;

drop trigger if exists intake_jobs_updated_at on intake_jobs;
create trigger intake_jobs_updated_at
  before update on intake_jobs
  for each row execute function update_updated_at();

alter table intake_jobs enable row level security;
