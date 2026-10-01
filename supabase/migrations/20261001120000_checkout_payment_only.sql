begin;
-- Order fulfilment fields + checkout recovery log.
-- Adds the required shipping fields before enabling payment-only fulfillment.
-- Apply this transaction before deploying the repaired application.
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

-- Require atomic replay detection and restrict payment fulfillment to the server.
drop function if exists fulfill_stripe_checkout_session(text,text,text,text,integer,text);
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
  item_already_sold boolean,
  already_fulfilled boolean
)
language plpgsql
set search_path = public
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

  if v_order.amount_total <> p_amount_total or v_order.currency <> p_currency then
    raise exception 'payment_order_mismatch';
  end if;
  if v_order.shipping_address is null or nullif(v_order.shipping_address->>'line1', '') is null then
    raise exception 'shipping_address_required';
  end if;

  if v_order.status = 'paid' then
    order_id := v_order.id;
    item_id := v_order.item_id;
    status_out := v_order.status;
    item_already_sold := false;
    already_fulfilled := true;
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
    already_fulfilled := false;
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
    already_fulfilled := false;
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
  already_fulfilled := false;
  return next;
end;
$$;

revoke all on function fulfill_stripe_checkout_session(text,text,text,text,integer,text) from public, anon, authenticated;
grant execute on function fulfill_stripe_checkout_session(text,text,text,text,integer,text) to service_role;

commit;
