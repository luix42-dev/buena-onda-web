// Inventory holds for one-of-one items.
//
// A checkout takes a short, explicit hold on an item (availability='reserved')
// so two buyers cannot pay for the same piece. Correctness never depends on a
// release event firing: every hold is owned by the order row created with it,
// expires HOLD_MINUTES after it was taken, and is re-verified against Stripe
// before it is released. Releases are conditional on the item row being
// unchanged since it was inspected, so cleanup can never release a newer hold.
//
// Store and Stripe access are injected so the rules are testable without a
// database or network.

export const STRIPE_SESSION_MINUTES = 31 // Stripe minimum is 30
export const HOLD_MINUTES = 35 // must outlive the Stripe session
const HOLD_ORIGIN_WINDOW_MS = 2 * 60 * 1000

export type Availability = 'available' | 'reserved' | 'sold'
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'canceled'

export type HoldItem = {
  id: string
  availability: Availability
  updated_at: string
}

export type HoldOrder = {
  id: string
  item_id: string
  status: OrderStatus
  stripe_session_id: string
  stripe_payment_intent_id: string | null
  created_at: string
}

export interface HoldStore {
  getItem(itemId: string): Promise<HoldItem | null>
  listOrders(itemId: string): Promise<HoldOrder[]>
  /** Conditional update; returns the new row or null when the guard did not match. */
  setAvailabilityIf(
    itemId: string,
    guard: { availability: Availability; updated_at: string },
    next: Availability,
  ): Promise<HoldItem | null>
  /** Conditional update; returns true when the order was still in `from`. */
  setOrderStatusIf(orderId: string, from: OrderStatus, to: OrderStatus): Promise<boolean>
}

type SessionView = { status: 'open' | 'complete' | 'expired' | null; payment_status: string }
type IntentView = { status: string }

export interface HoldStripe {
  liveMode: boolean
  getSession(id: string): Promise<SessionView>
  expireSession(id: string): Promise<void>
  getIntent(id: string): Promise<IntentView>
  cancelIntent(id: string): Promise<void>
}

export type OrderState =
  | 'live' // inside its hold window, buyer may still be paying
  | 'paid' // Stripe says paid; fulfilment must run (webhook missed or delayed)
  | 'awaiting_payment' // async payment in flight, keep protected
  | 'dead' // Stripe confirms it can no longer be paid
  | 'test_mode' // test-mode object, cannot affect live inventory
  | 'ambiguous' // could not verify, keep protected and surface to admin

export type HoldVerdict =
  | { action: 'none'; reason: 'not_reserved' | 'missing_item' }
  | { action: 'protect'; reason: 'manual_hold' | 'order_protected' | 'paid_not_sold'; orders: Array<{ id: string; state: OrderState }> }
  | { action: 'released'; canceledOrderIds: string[] }
  | { action: 'raced' } // item changed while we looked; nothing released

function isTestModeId(id: string) {
  return /_test_/.test(id)
}

function isTestModeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /test mode/i.test(message)
}

function sessionState(session: SessionView): OrderState | null {
  if (session.status === 'complete') {
    return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
      ? 'paid'
      : 'awaiting_payment'
  }
  if (session.status === 'expired') return 'dead'
  return null
}

const INTENT_PAID = new Set(['succeeded'])
const INTENT_IN_FLIGHT = new Set(['processing', 'requires_capture'])

function intentState(intent: IntentView): OrderState | null {
  if (INTENT_PAID.has(intent.status)) return 'paid'
  if (INTENT_IN_FLIGHT.has(intent.status)) return 'awaiting_payment'
  if (intent.status === 'canceled') return 'dead'
  return null
}

/**
 * Decide whether a pending order can still take payment. Stale open sessions
 * and intents are expired/canceled first, so an old checkout link cannot pay
 * for an item after its hold is released.
 */
export async function classifyOrder(
  order: HoldOrder,
  stripe: HoldStripe,
  now: number,
): Promise<OrderState> {
  const intentId = order.stripe_session_id.startsWith('elements_')
    ? order.stripe_payment_intent_id ?? order.stripe_session_id.slice('elements_'.length)
    : null
  const objectId = intentId ?? order.stripe_session_id

  if (stripe.liveMode && isTestModeId(objectId)) return 'test_mode'
  if (order.status === 'paid') return 'paid'
  if (order.status !== 'pending') return 'dead'
  if (now - Date.parse(order.created_at) < HOLD_MINUTES * 60 * 1000) return 'live'

  try {
    if (intentId) {
      const state = intentState(await stripe.getIntent(intentId))
      if (state) return state
      try {
        await stripe.cancelIntent(intentId)
        return 'dead'
      } catch {
        return intentState(await stripe.getIntent(intentId)) ?? 'ambiguous'
      }
    }

    const state = sessionState(await stripe.getSession(order.stripe_session_id))
    if (state) return state
    try {
      await stripe.expireSession(order.stripe_session_id)
      return 'dead'
    } catch {
      // Expire fails when the buyer completed payment in the meantime.
      return sessionState(await stripe.getSession(order.stripe_session_id)) ?? 'ambiguous'
    }
  } catch (error) {
    return isTestModeError(error) ? 'test_mode' : 'ambiguous'
  }
}

/** A hold is checkout-owned when an order was created right after it was taken. */
export function holdOwner(item: HoldItem, orders: HoldOrder[]): HoldOrder | null {
  const holdAt = Date.parse(item.updated_at)
  const owner = [...orders]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .find(order => {
      const delta = Date.parse(order.created_at) - holdAt
      return delta >= -5000 && delta <= HOLD_ORIGIN_WINDOW_MS
    })
  return owner ?? null
}

/**
 * Inspect a reserved item and release it only when every order that could
 * still pay for it is verified dead. Anything uncertain stays protected.
 */
export async function reconcileHold(
  store: HoldStore,
  stripe: HoldStripe,
  itemId: string,
  now = Date.now(),
): Promise<HoldVerdict> {
  const item = await store.getItem(itemId)
  if (!item) return { action: 'none', reason: 'missing_item' }
  if (item.availability !== 'reserved') return { action: 'none', reason: 'not_reserved' }

  const orders = await store.listOrders(itemId)
  const owner = holdOwner(item, orders)
  if (!owner) return { action: 'protect', reason: 'manual_hold', orders: [] }

  const open = orders.filter(order => order.status === 'pending' || order.status === 'paid')
  const states: Array<{ id: string; state: OrderState }> = []
  for (const order of open) {
    states.push({ id: order.id, state: await classifyOrder(order, stripe, now) })
  }

  if (states.some(entry => entry.state === 'paid')) {
    return { action: 'protect', reason: 'paid_not_sold', orders: states }
  }
  if (states.some(entry => entry.state !== 'dead' && entry.state !== 'test_mode')) {
    return { action: 'protect', reason: 'order_protected', orders: states }
  }

  const canceledOrderIds: string[] = []
  for (const entry of states) {
    if (entry.state !== 'dead') continue
    if (await store.setOrderStatusIf(entry.id, 'pending', 'canceled')) canceledOrderIds.push(entry.id)
  }

  const released = await store.setAvailabilityIf(
    itemId,
    { availability: 'reserved', updated_at: item.updated_at },
    'available',
  )
  return released ? { action: 'released', canceledOrderIds } : { action: 'raced' }
}

export type AcquireResult =
  | { ok: true; hold: HoldItem }
  | { ok: false; reason: 'sold' | 'held' | 'raced' | 'missing_item' }

/** Atomically take the hold for a new checkout. */
export async function acquireHold(
  store: HoldStore,
  stripe: HoldStripe,
  itemId: string,
  now = Date.now(),
): Promise<AcquireResult> {
  let item = await store.getItem(itemId)
  if (!item) return { ok: false, reason: 'missing_item' }
  if (item.availability === 'sold') return { ok: false, reason: 'sold' }

  if (item.availability === 'reserved') {
    const verdict = await reconcileHold(store, stripe, itemId, now)
    if (verdict.action !== 'released') return { ok: false, reason: 'held' }
    item = await store.getItem(itemId)
    if (!item || item.availability !== 'available') return { ok: false, reason: 'held' }
  }

  const hold = await store.setAvailabilityIf(
    itemId,
    { availability: 'available', updated_at: item.updated_at },
    'reserved',
  )
  return hold ? { ok: true, hold } : { ok: false, reason: 'raced' }
}

/** Give back a hold this request took, e.g. when session creation failed. */
export async function releaseOwnHold(store: HoldStore, hold: HoldItem) {
  return store.setAvailabilityIf(
    hold.id,
    { availability: 'reserved', updated_at: hold.updated_at },
    'available',
  )
}

export function stripeSessionExpiresAt(now = Date.now()) {
  return Math.floor(now / 1000) + STRIPE_SESSION_MINUTES * 60
}
