import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { classifyOrder, reconcileHold, type HoldOrder, type HoldVerdict } from '@/lib/checkout-holds'
import { stripeHoldApi, supabaseHoldStore } from '@/lib/checkout-holds-adapters'
import { fulfillCheckoutSession, fulfillElementsPaymentIntent } from '@/lib/order-fulfillment'

const LOOKBACK_DAYS = 30

export type ReconcileReport = {
  fulfilled: string[] // order ids whose missed payment was applied
  canceled: string[] // pending orders Stripe confirmed can no longer pay
  released: string[] // item ids given back to the shop
  protected: Array<{ itemId: string; reason: string }>
  unresolved: Array<{ orderId: string; state: string }>
}

async function fulfillPaidOrder(stripe: Stripe, order: HoldOrder) {
  if (order.stripe_session_id.startsWith('elements_')) {
    const intentId = order.stripe_payment_intent_id ?? order.stripe_session_id.slice('elements_'.length)
    return fulfillElementsPaymentIntent(await stripe.paymentIntents.retrieve(intentId))
  }
  return fulfillCheckoutSession(await stripe.checkout.sessions.retrieve(order.stripe_session_id))
}

type LogRow = { item_id?: string | null; order_id?: string | null; action: string; reason?: string | null }

// Best effort: the log table arrives with migration 20260923120000.
async function logRecovery(supabase: SupabaseClient, source: string, rows: LogRow[]) {
  if (!rows.length) return
  const { error } = await supabase.from('checkout_recovery_log').insert(rows.map(row => ({ source, ...row })))
  if (error) console.warn('[reconcile] recovery log unavailable:', error.message)
}

/**
 * Repair missed webhook outcomes and release abandoned holds. Safe to run at
 * any time and any number of times: every decision is re-verified with Stripe
 * and every write is conditional.
 */
export async function reconcileCheckouts(
  supabase: SupabaseClient,
  stripe: Stripe,
  now = Date.now(),
  source: 'cron' | 'studio' = 'cron',
): Promise<ReconcileReport> {
  const report: ReconcileReport = { fulfilled: [], canceled: [], released: [], protected: [], unresolved: [] }
  const store = supabaseHoldStore(supabase)
  const stripeApi = stripeHoldApi(stripe)

  const since = new Date(now - LOOKBACK_DAYS * 86_400_000).toISOString()
  const { data: pending, error } = await supabase
    .from('orders')
    .select('id, item_id, status, stripe_session_id, stripe_payment_intent_id, created_at')
    .eq('status', 'pending')
    .gte('created_at', since)
    .order('created_at')
  if (error) throw error

  for (const order of (pending ?? []) as HoldOrder[]) {
    const state = await classifyOrder(order, stripeApi, now)
    if (state === 'paid') {
      const result = await fulfillPaidOrder(stripe, order)
      if (result.status === 'paid') report.fulfilled.push(order.id)
      else report.unresolved.push({ orderId: order.id, state: result.itemAlreadySold ? 'paid_after_sold' : 'fulfil_failed' })
    } else if (state === 'dead') {
      if (await store.setOrderStatusIf(order.id, 'pending', 'canceled')) report.canceled.push(order.id)
    } else if (state === 'ambiguous') {
      report.unresolved.push({ orderId: order.id, state })
    }
  }

  const { data: reserved, error: reservedError } = await supabase
    .from('items')
    .select('id')
    .eq('availability', 'reserved')
  if (reservedError) throw reservedError

  for (const { id } of reserved ?? []) {
    const verdict: HoldVerdict = await reconcileHold(store, stripeApi, id, now)
    if (verdict.action === 'released') {
      report.released.push(id)
      report.canceled.push(...verdict.canceledOrderIds)
    } else if (verdict.action === 'protect') {
      report.protected.push({ itemId: id, reason: verdict.reason })
    }
  }

  const pendingById = new Map(((pending ?? []) as HoldOrder[]).map(order => [order.id, order.item_id]))
  await logRecovery(supabase, source, [
    ...report.fulfilled.map(id => ({ order_id: id, item_id: pendingById.get(id), action: 'fulfilled', reason: 'missed_webhook' })),
    ...report.canceled.map(id => ({ order_id: id, item_id: pendingById.get(id), action: 'canceled', reason: 'stripe_confirmed_unpayable' })),
    ...report.released.map(id => ({ item_id: id, action: 'released', reason: 'abandoned_checkout' })),
    ...report.unresolved.map(entry => ({ order_id: entry.orderId, item_id: pendingById.get(entry.orderId), action: 'protected', reason: entry.state })),
  ])

  return report
}
