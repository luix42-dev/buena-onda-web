-- Order fulfilment fields + checkout recovery log.
-- Additive and backward-compatible: existing code ignores the new columns, and
-- the app already tolerates their absence (addresses fall back to Stripe).
-- Run once in the Supabase SQL Editor.

alter table orders
  add column if not exists shipping_name      text,
  add column if not exists shipping_phone     text,
  add column if not exists shipping_address   jsonb,
  add column if not exists fulfillment_method text,
  add column if not exists fulfillment_status text not null default 'unfulfilled',
  add column if not exists tracking_number    text,
  add column if not exists tracking_url       text,
  add column if not exists fulfilled_at       timestamptz;

do $$ begin
  alter table orders
    add constraint orders_fulfillment_status_check
    check (fulfillment_status in ('unfulfilled', 'scheduled', 'delivered', 'shipped', 'picked_up'));
exception when duplicate_object then null; end $$;

create table if not exists checkout_recovery_log (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  source     text        not null,              -- webhook | cron | studio
  item_id    uuid        references items (id) on delete set null,
  order_id   uuid        references orders (id) on delete set null,
  action     text        not null,              -- released | protected | fulfilled | canceled
  reason     text,
  details    jsonb
);

create index if not exists checkout_recovery_log_created_idx on checkout_recovery_log (created_at desc);
alter table checkout_recovery_log enable row level security;
