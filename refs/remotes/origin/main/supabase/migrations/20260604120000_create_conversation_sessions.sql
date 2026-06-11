create table if not exists conversation_sessions (
  id         uuid        default gen_random_uuid() primary key,
  chat_id    text        unique not null,
  draft      jsonb       default '{}'::jsonb,
  messages   jsonb       not null default '[]'::jsonb,
  state      text        not null default 'idle' check (state in ('idle', 'drafting', 'awaiting_confirmation')),
  updated_at timestamptz default now() not null
);

create index if not exists conversation_sessions_state_idx on conversation_sessions (state);
create index if not exists conversation_sessions_updated_at_idx on conversation_sessions (updated_at desc);

drop trigger if exists conversation_sessions_updated_at on conversation_sessions;
create trigger conversation_sessions_updated_at
  before update on conversation_sessions
  for each row execute function update_updated_at();

alter table conversation_sessions enable row level security;
