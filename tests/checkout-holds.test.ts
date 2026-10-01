import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  HOLD_MINUTES,
  reconcileHold,
  type HoldItem,
  type HoldOrder,
  type HoldStore,
  type HoldStripe,
} from '../lib/checkout-holds'

const MIN = 60_000
const T0 = Date.parse('2026-09-01T12:00:00.000Z')

// In-memory stand-in for the items/orders tables. Like the items_updated_at
// trigger, every item write stamps updated_at with the store clock.
function memoryStore(clock: { now: number }) {
  const items = new Map<string, HoldItem>()
  const orders: HoldOrder[] = []
  const store: HoldStore & { items: typeof items; orders: typeof orders } = {
    items,
    orders,
    async getItem(id) {
      const item = items.get(id)
      return item ? { ...item } : null
    },
    async listOrders(id) {
      return orders.filter(order => order.item_id === id).map(order => ({ ...order }))
    },
    async setAvailabilityIf(id, guard, next) {
      const item = items.get(id)
      if (!item || item.availability !== guard.availability || item.updated_at !== guard.updated_at) return null
      const updated = { ...item, availability: next, updated_at: new Date(clock.now++).toISOString() }
      items.set(id, updated)
      return { ...updated }
    },
    async setOrderStatusIf(id, from, to) {
      const order = orders.find(o => o.id === id)
      if (!order || order.status !== from) return false
      order.status = to
      return true
    },
  }
  return store
}

type FakeSession = { status: 'open' | 'complete' | 'expired'; payment_status: string }

function fakeStripe() {
  const sessions = new Map<string, FakeSession>()
  const calls: string[] = []
  const api: HoldStripe & { sessions: typeof sessions; calls: typeof calls; onExpire?: (id: string) => void } = {
    sessions,
    calls,
    liveMode: true,
    async getSession(id) {
      calls.push(`get ${id}`)
      const s = sessions.get(id)
      if (!s) throw new Error('No such checkout.session')
      return { ...s }
    },
    async expireSession(id) {
      calls.push(`expire ${id}`)
      api.onExpire?.(id)
      const s = sessions.get(id)!
      if (s.status !== 'open') throw new Error('Session is not open')
      s.status = 'expired'
    },
    async getIntent() {
      return { status: 'requires_payment_method' }
    },
    async cancelIntent() {},
  }
  return api
}

function setup() {
  const clock = { now: T0 }
  const store = memoryStore(clock)
  const stripe = fakeStripe()
  store.items.set('item-1', { id: 'item-1', availability: 'available', updated_at: new Date(T0 - 60 * MIN).toISOString() })
  return { clock, store, stripe }
}

async function checkout(ctx: ReturnType<typeof setup>, sessionId: string, now = ctx.clock.now) {
  const legacy = { id: 'item-1', availability: 'reserved' as const, updated_at: new Date(now).toISOString() }
  ctx.store.items.set('item-1', legacy)
  ctx.clock.now = now + 1
  ctx.stripe.sessions.set(sessionId, { status: 'open', payment_status: 'unpaid' })
  ctx.store.orders.push({
    id: `order-${sessionId}`,
    item_id: 'item-1',
    status: 'pending',
    stripe_session_id: sessionId,
    stripe_payment_intent_id: null,
    created_at: new Date(Date.parse(legacy.updated_at) + 800).toISOString(),
  })
  return legacy
}

test('abandoned checkout: expired session releases the hold and cancels the order', async () => {
  const ctx = setup()
  await checkout(ctx, 'cs_live_a')
  ctx.stripe.sessions.get('cs_live_a')!.status = 'expired'
  const verdict = await reconcileHold(ctx.store, ctx.stripe, 'item-1', T0 + (HOLD_MINUTES + 1) * MIN)
  assert.equal(verdict.action, 'released')
  assert.equal(ctx.store.items.get('item-1')!.availability, 'available')
  assert.equal(ctx.store.orders[0].status, 'canceled')
})

test('cleanup racing with payment: buyer pays while cleanup tries to expire → stays protected', async () => {
  const ctx = setup()
  await checkout(ctx, 'cs_live_a')
  ctx.stripe.onExpire = id => {
    ctx.stripe.sessions.set(id, { status: 'complete', payment_status: 'paid' })
  }
  const verdict = await reconcileHold(ctx.store, ctx.stripe, 'item-1', T0 + (HOLD_MINUTES + 1) * MIN)
  assert.equal(verdict.action, 'protect')
  assert.equal(verdict.action === 'protect' && verdict.reason, 'paid_not_sold')
  assert.equal(ctx.store.items.get('item-1')!.availability, 'reserved')
  assert.equal(ctx.store.orders[0].status, 'pending')
})

test('async payment in flight keeps the hold', async () => {
  const ctx = setup()
  await checkout(ctx, 'cs_live_a')
  ctx.stripe.sessions.set('cs_live_a', { status: 'complete', payment_status: 'unpaid' })
  const verdict = await reconcileHold(ctx.store, ctx.stripe, 'item-1', T0 + 3 * 24 * 60 * MIN)
  assert.equal(verdict.action === 'protect' && verdict.reason, 'order_protected')
})

test('cleanup cannot release a newer hold taken while it was checking', async () => {
  const ctx = setup()
  await checkout(ctx, 'cs_live_a')
  ctx.stripe.sessions.get('cs_live_a')!.status = 'expired'
  ctx.stripe.getSession = async id => {
    // A new hold lands between inspection and release.
    const item = ctx.store.items.get('item-1')!
    ctx.store.items.set('item-1', { ...item, updated_at: new Date(ctx.clock.now++).toISOString() })
    return { status: 'expired', payment_status: 'unpaid', ...(id ? {} : {}) }
  }
  const verdict = await reconcileHold(ctx.store, ctx.stripe, 'item-1', T0 + (HOLD_MINUTES + 1) * MIN)
  assert.equal(verdict.action, 'raced')
  assert.equal(ctx.store.items.get('item-1')!.availability, 'reserved')
})

test('manual studio holds (no checkout order) are never auto-released', async () => {
  const ctx = setup()
  ctx.store.items.set('item-1', { id: 'item-1', availability: 'reserved', updated_at: new Date(T0 - 90 * 24 * 60 * MIN).toISOString() })
  const verdict = await reconcileHold(ctx.store, ctx.stripe, 'item-1', T0)
  assert.equal(verdict.action === 'protect' && verdict.reason, 'manual_hold')
  assert.equal(ctx.store.items.get('item-1')!.availability, 'reserved')
})

test('unverifiable Stripe state stays protected', async () => {
  const ctx = setup()
  await checkout(ctx, 'cs_live_a')
  ctx.stripe.sessions.delete('cs_live_a')
  const verdict = await reconcileHold(ctx.store, ctx.stripe, 'item-1', T0 + (HOLD_MINUTES + 1) * MIN)
  assert.equal(verdict.action, 'protect')
  assert.equal(ctx.store.items.get('item-1')!.availability, 'reserved')
})

test('a locally canceled order with a completed payment never releases legacy inventory', async () => {
  const ctx = setup()
  await checkout(ctx, 'cs_live_a')
  ctx.store.orders[0].status = 'canceled'
  ctx.stripe.sessions.set('cs_live_a', { status: 'complete', payment_status: 'paid' })
  const verdict = await reconcileHold(ctx.store, ctx.stripe, 'item-1', T0 + (HOLD_MINUTES + 1) * MIN)
  assert.equal(verdict.action === 'protect' && verdict.reason, 'paid_not_sold')
  assert.equal(ctx.store.items.get('item-1')!.availability, 'reserved')
})

test('duplicate / delayed expiry handling is a no-op once the item moved on', async () => {
  const ctx = setup()
  await checkout(ctx, 'cs_live_a')
  ctx.stripe.sessions.get('cs_live_a')!.status = 'expired'
  const later = T0 + (HOLD_MINUTES + 1) * MIN
  assert.equal((await reconcileHold(ctx.store, ctx.stripe, 'item-1', later)).action, 'released')
  assert.deepEqual(await reconcileHold(ctx.store, ctx.stripe, 'item-1', later), { action: 'none', reason: 'not_reserved' })
  // Sold items are never touched by a late event.
  ctx.store.items.set('item-1', { ...ctx.store.items.get('item-1')!, availability: 'sold' })
  assert.deepEqual(await reconcileHold(ctx.store, ctx.stripe, 'item-1', later), { action: 'none', reason: 'not_reserved' })
})

test('test-mode orders cannot authorize releasing live inventory', async () => {
  const ctx = setup()
  await checkout(ctx, 'cs_test_a')
  const verdict = await reconcileHold(ctx.store, ctx.stripe, 'item-1', T0 + (HOLD_MINUTES + 1) * MIN)
  assert.equal(verdict.action, 'protect')
  assert.equal(ctx.store.items.get('item-1')!.availability, 'reserved')
  assert.equal(ctx.store.orders[0].status, 'pending', 'test orders are left as they are')
})
