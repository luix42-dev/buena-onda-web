import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { HOLD_MINUTES, holdOwner, type Availability, type HoldItem, type HoldOrder, type HoldStore, type HoldStripe, type OrderStatus } from '@/lib/checkout-holds'

export function supabaseHoldStore(supabase: SupabaseClient): HoldStore {
  return {
    async getItem(itemId) {
      const { data, error } = await supabase
        .from('items')
        .select('id, availability, updated_at')
        .eq('id', itemId)
        .maybeSingle()
      if (error) throw error
      return (data as HoldItem | null) ?? null
    },

    async listOrders(itemId) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, item_id, status, stripe_session_id, stripe_payment_intent_id, created_at')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as HoldOrder[]
    },

    async setAvailabilityIf(itemId, guard, next: Availability) {
      // updated_at is bumped by the items_updated_at trigger, so it doubles as
      // the hold's start time and as an optimistic-concurrency token.
      const { data, error } = await supabase
        .from('items')
        .update({ availability: next })
        .eq('id', itemId)
        .eq('availability', guard.availability)
        .eq('updated_at', guard.updated_at)
        .select('id, availability, updated_at')
      if (error) throw error
      return ((data ?? [])[0] as HoldItem | undefined) ?? null
    },

    async setOrderStatusIf(orderId, from: OrderStatus, to: OrderStatus) {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: to })
        .eq('id', orderId)
        .eq('status', from)
        .select('id')
      if (error) throw error
      return (data ?? []).length > 0
    },
  }
}

export function stripeHoldApi(stripe: Stripe): HoldStripe {
  return {
    liveMode: (process.env.STRIPE_SECRET_KEY ?? '').includes('_live_'),
    async getSession(id) {
      const session = await stripe.checkout.sessions.retrieve(id)
      return { status: session.status, payment_status: session.payment_status }
    },
    async expireSession(id) {
      await stripe.checkout.sessions.expire(id)
    },
    async getIntent(id) {
      const intent = await stripe.paymentIntents.retrieve(id)
      return { status: intent.status }
    },
    async cancelIntent(id) {
      await stripe.paymentIntents.cancel(id)
    },
  }
}

/**
 * True when a checkout hold has run past its window. The buy button can be
 * shown again; the checkout route re-verifies with Stripe before taking it.
 * Manual holds set in the studio never lapse.
 */
export async function isLapsedCheckoutHold(supabase: SupabaseClient, item: HoldItem, now = Date.now()) {
  if (item.availability !== 'reserved') return false
  if (now - Date.parse(item.updated_at) < HOLD_MINUTES * 60 * 1000) return false
  const orders = await supabaseHoldStore(supabase).listOrders(item.id)
  return holdOwner(item, orders) !== null
}
