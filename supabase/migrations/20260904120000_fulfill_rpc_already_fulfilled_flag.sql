-- Adds an `already_fulfilled` signal to fulfill_stripe_checkout_session so callers
-- can tell a first-time transition to `paid` apart from a replayed webhook hitting
-- an order that was already paid. Function body only — no table/column changes.
--
-- Run this in the Supabase SQL Editor. Not executed automatically.

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
