import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { HOLD_MINUTES, holdOwner, type HoldItem, type HoldOrder } from '@/lib/checkout-holds'
import { shippingFromSession, type ShippingAddress } from '@/lib/shipping'

export type AttentionKind =
  | 'missing_address'
  | 'awaiting_delivery'
  | 'refund_check'
  | 'payment_sync'
  | 'manual_hold'
  | 'lapsed_hold'

export type AttentionEntry = { kind: AttentionKind; title: string; detail: string; slug?: string | null }

export type StudioOrder = {
  id: string
  created_at: string
  status: string
  amount_total: number
  currency: string
  customer_name: string | null
  customer_email: string | null
  item_title: string
  item_slug: string | null
  channel: 'checkout' | 'elements'
  shipping: ShippingAddress | null
  fulfillment_status: string | null
  tracking_number: string | null
}

export type HoldRow = { id: string; title: string; slug: string | null; kind: 'checkout' | 'lapsed' | 'manual'; until: string | null }

export type RecoveryRow = { created_at: string; source: string; action: string; reason: string | null; item_title: string | null }

export type OrdersDashboard = {
  attention: AttentionEntry[]
  orders: StudioOrder[]
  holds: HoldRow[]
  inventory: { available: number; reserved: number; sold: number }
  testOrders: number
  recovery: RecoveryRow[] | null // null until the recovery-log migration is applied
  fulfillmentTracked: boolean
}

type OrderRow = HoldOrder & {
  amount_total: number
  currency: string
  customer_name: string | null
  customer_email: string | null
  shipping_address?: ShippingAddress | null
  fulfillment_status?: string | null
  tracking_number?: string | null
  item: { title: string; slug: string | null; availability: string } | null
}

const isTestId = (id: string) => /_test_/.test(id)

type ShippingLookup = { shipping: ShippingAddress | null; foreign: boolean }

// `foreign` = the Stripe object does not exist on this account (test mode or a
// previous account); such orders are history, not work.
async function shippingFor(stripe: Stripe, order: OrderRow): Promise<ShippingLookup> {
  if (order.shipping_address) return { shipping: order.shipping_address, foreign: false }
  try {
    if (order.stripe_session_id.startsWith('cs_')) {
      return { shipping: shippingFromSession(await stripe.checkout.sessions.retrieve(order.stripe_session_id)), foreign: false }
    }
    if (order.stripe_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
      return { shipping: shippingFromSession({ shipping_details: intent.shipping }), foreign: false }
    }
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'resource_missing') return { shipping: null, foreign: true }
    console.warn('[studio/orders] shipping lookup failed for', order.id, error instanceof Error ? error.message : error)
  }
  return { shipping: null, foreign: false }
}

export async function loadOrdersDashboard(supabase: SupabaseClient, stripe: Stripe, now = Date.now()): Promise<OrdersDashboard> {
  const liveMode = (process.env.STRIPE_SECRET_KEY ?? '').includes('_live_')

  const { data: orderRows, error: ordersError } = await supabase
    .from('orders')
    .select('*, item:items(title, slug, availability)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (ordersError) throw ordersError

  const all = (orderRows ?? []) as OrderRow[]
  const isTestOrder = (order: OrderRow) =>
    liveMode && (isTestId(order.stripe_session_id) || isTestId(order.stripe_payment_intent_id ?? ''))
  const live = all.filter(order => !isTestOrder(order))
  const fulfillmentTracked = all.some(order => 'fulfillment_status' in order)

  const visible = live.filter(order => order.status !== 'canceled').slice(0, 50)
  const orders: StudioOrder[] = []
  let foreignOrders = 0
  for (const order of visible) {
    const lookup = order.status === 'paid' ? await shippingFor(stripe, order) : { shipping: null, foreign: false }
    if (lookup.foreign) {
      foreignOrders++
      continue
    }
    orders.push({
      id: order.id,
      created_at: order.created_at,
      status: order.status,
      amount_total: order.amount_total,
      currency: order.currency,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      item_title: order.item?.title ?? 'Unknown item',
      item_slug: order.item?.slug ?? null,
      channel: order.stripe_session_id.startsWith('elements_') ? 'elements' : 'checkout',
      shipping: lookup.shipping,
      fulfillment_status: order.fulfillment_status ?? null,
      tracking_number: order.tracking_number ?? null,
    })
  }

  const attention: AttentionEntry[] = []
  for (const order of orders) {
    if (order.status === 'paid' && !order.shipping) {
      attention.push({ kind: 'missing_address', title: order.item_title, detail: 'Paid, but no delivery address on file. Contact the buyer.', slug: order.item_slug })
    } else if (order.status === 'paid' && (!fulfillmentTracked || order.fulfillment_status === 'unfulfilled')) {
      attention.push({ kind: 'awaiting_delivery', title: order.item_title, detail: `Paid ${new Date(order.created_at).toLocaleDateString('en-US')}. Arrange delivery.`, slug: order.item_slug })
    }
    if (order.status === 'failed') {
      attention.push({ kind: 'refund_check', title: order.item_title, detail: 'Payment arrived after the piece was already sold, or failed. Check Stripe and refund if charged.', slug: order.item_slug })
    }
  }

  const stale = now - HOLD_MINUTES * 60_000
  for (const order of live) {
    if (order.status === 'pending' && Date.parse(order.created_at) < stale && order.item?.availability !== 'reserved' && Date.parse(order.created_at) > now - 30 * 86_400_000) {
      attention.push({ kind: 'payment_sync', title: order.item?.title ?? 'Unknown item', detail: 'Checkout never settled. The daily reconciliation (or “Reconcile now”) will close it.', slug: order.item?.slug })
    }
  }

  const { data: reserved, error: reservedError } = await supabase
    .from('items')
    .select('id, title, slug, availability, updated_at')
    .eq('availability', 'reserved')
  if (reservedError) throw reservedError

  const holds: HoldRow[] = []
  for (const item of (reserved ?? []) as Array<HoldItem & { title: string; slug: string | null }>) {
    const owner = holdOwner(item, all.filter(order => order.item_id === item.id))
    const lapsed = Date.parse(item.updated_at) < stale
    const kind: HoldRow['kind'] = !owner ? 'manual' : lapsed ? 'lapsed' : 'checkout'
    holds.push({
      id: item.id,
      title: item.title,
      slug: item.slug,
      kind,
      until: kind === 'checkout' ? new Date(Date.parse(item.updated_at) + HOLD_MINUTES * 60_000).toISOString() : null,
    })
    if (kind === 'manual') {
      attention.push({ kind: 'manual_hold', title: item.title, detail: 'On hold with no active checkout. Release it in Catalog if the hold is no longer needed.', slug: item.slug })
    } else if (kind === 'lapsed') {
      attention.push({ kind: 'lapsed_hold', title: item.title, detail: 'Checkout hold has lapsed. It is released after Stripe confirms the session cannot be paid.', slug: item.slug })
    }
  }

  const count = async (availability: string) => {
    const { count: n } = await supabase.from('items').select('id', { count: 'exact', head: true }).eq('availability', availability).neq('status', 'archived')
    return n ?? 0
  }
  const [available, reservedCount, sold] = await Promise.all([count('available'), count('reserved'), count('sold')])

  const { data: logRows, error: logError } = await supabase
    .from('checkout_recovery_log')
    .select('created_at, source, action, reason, item:items(title)')
    .order('created_at', { ascending: false })
    .limit(25)
  const recovery = logError
    ? null
    : ((logRows ?? []) as unknown as Array<{ created_at: string; source: string; action: string; reason: string | null; item: { title: string } | null }>).map(row => ({
        created_at: row.created_at,
        source: row.source,
        action: row.action,
        reason: row.reason,
        item_title: row.item?.title ?? null,
      }))

  return {
    attention,
    orders,
    holds,
    inventory: { available, reserved: reservedCount, sold },
    testOrders: all.length - live.length + foreignOrders,
    recovery,
    fulfillmentTracked,
  }
}
