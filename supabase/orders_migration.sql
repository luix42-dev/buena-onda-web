-- Buena Onda orders migration
-- Run this after the catalog schema so items(id) exists.

do $$ begin
  create type order_status as enum ('pending', 'paid', 'failed', 'canceled');
exception when duplicate_object then null; end $$;

create table if not exists orders (
  id                      uuid          default gen_random_uuid() primary key,
  item_id                 uuid          not null references items (id) on delete restrict,
  customer_email          text,
  customer_name           text,
  stripe_session_id       text          unique not null,
  stripe_payment_intent_id text,
  status                  order_status  default 'pending' not null,
  amount_total            integer       not null,
  currency                text          default 'usd' not null,
  created_at              timestamptz   default now() not null,
  updated_at              timestamptz   default now() not null
);

create index if not exists orders_item_id_idx      on orders (item_id);
create index if not exists orders_status_idx       on orders (status);
create index if not exists orders_created_at_idx   on orders (created_at desc);
create unique index if not exists orders_session_uidx on orders (stripe_session_id);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

alter table orders enable row level security;

create or replace function fulfill_stripe_checkout_session(
  p_stripe_session_id text,
  p_stripe_payment_intent_id text,
  p_customer_email text,
  p_customer_name text,
  p_amount_total integer,
  p_currency text
)
returns table (
  order_id uuid,
  item_id uuid,
  status_out text,
  item_already_sold boolean
)
language plpgsql
as $$
declare
  v_order orders%rowtype;
  v_item items%rowtype;
begin
  select *
    into v_order
    from orders
   where stripe_session_id = p_stripe_session_id
   for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if v_order.status = 'paid' then
    order_id := v_order.id;
    item_id := v_order.item_id;
    status_out := v_order.status;
    item_already_sold := false;
    return next;
    return;
  end if;

  select *
    into v_item
    from items
   where id = v_order.item_id
   for update;

  if not found then
    update orders
       set status = 'failed',
           customer_email = coalesce(p_customer_email, customer_email),
           customer_name = coalesce(p_customer_name, customer_name),
           stripe_payment_intent_id = coalesce(p_stripe_payment_intent_id, stripe_payment_intent_id),
           amount_total = p_amount_total,
           currency = p_currency,
           updated_at = now()
     where id = v_order.id;

    order_id := v_order.id;
    item_id := v_order.item_id;
    status_out := 'failed';
    item_already_sold := false;
    return next;
    return;
  end if;

  if v_item.availability = 'sold' then
    update orders
       set status = 'failed',
           customer_email = coalesce(p_customer_email, customer_email),
           customer_name = coalesce(p_customer_name, customer_name),
           stripe_payment_intent_id = coalesce(p_stripe_payment_intent_id, stripe_payment_intent_id),
           amount_total = p_amount_total,
           currency = p_currency,
           updated_at = now()
     where id = v_order.id;

    order_id := v_order.id;
    item_id := v_order.item_id;
    status_out := 'failed';
    item_already_sold := true;
    return next;
    return;
  end if;

  update items
     set availability = 'sold',
         status = 'sold_out'
   where id = v_item.id;

  update orders
     set status = 'paid',
         customer_email = coalesce(p_customer_email, customer_email),
         customer_name = coalesce(p_customer_name, customer_name),
         stripe_payment_intent_id = coalesce(p_stripe_payment_intent_id, stripe_payment_intent_id),
         amount_total = p_amount_total,
         currency = p_currency,
         updated_at = now()
   where id = v_order.id;

  order_id := v_order.id;
  item_id := v_order.item_id;
  status_out := 'paid';
  item_already_sold := false;
  return next;
end;
$$;
