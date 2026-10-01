import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { NextRequest } from 'next/server'
import { getStripe } from '../lib/stripe'
import { POST as checkout } from '../app/api/checkout/route'
import { GET as intent } from '../app/api/checkout/intent/route'
import { POST as webhook } from '../app/api/webhooks/stripe/route'

// No network or live payment credentials are permitted in this fixture suite.
process.env.STRIPE_SECRET_KEY = 'sk_test_fixture_only'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture_only'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only'
process.env.NEXT_PUBLIC_SITE_URL = 'https://store.invalid'
process.env.RESEND_API_KEY = 'fixture-only'
delete process.env.TELEGRAM_BOT_TOKEN
delete process.env.TELEGRAM_CHAT_ID
const db = new PGlite()
const originalFetch = globalThis.fetch
const stripe = getStripe()
const itemId = '11111111-1111-4111-8111-111111111111'
const address = { line1: 'Fixture street', city: 'Fixture city', state: 'FL', postal_code: '00000', country: 'US' }
let emails = 0
let sequence = 0
let sessionParams: any
let intentParams: any
let failShipping = false
const originals = {
  create: stripe.checkout.sessions.create, expire: stripe.checkout.sessions.expire,
  intent: stripe.paymentIntents.create, update: stripe.paymentIntents.update,
}

function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }) }

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create type order_status as enum ('pending','paid','failed','canceled');
    create table items (id uuid primary key, title text, slug text, catalog_number text, price numeric,
      status text, availability text, sourcing_model text, updated_at timestamptz default now());
    create table orders (id uuid primary key default gen_random_uuid(), item_id uuid references items,
      customer_email text, customer_name text, stripe_session_id text unique not null,
      stripe_payment_intent_id text, status order_status default 'pending', amount_total integer,
      currency text, created_at timestamptz default now(), updated_at timestamptz default now());
  `)
  await db.exec(readFileSync('supabase/migrations/20261001120000_checkout_payment_only.sql', 'utf8'))
  // Exercise the actual routes, Supabase client and SQL, replacing only HTTP/processor transport.
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (url.hostname === 'api.resend.com') { emails++; return response({ id: `email_${emails}` }) }
    assert.equal(url.hostname, 'database.invalid', 'fixture refuses all other network access')
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : null
    try {
      if (url.pathname.includes('/rpc/')) {
        const result = await db.query(`select * from fulfill_stripe_checkout_session($1,$2,$3,$4,$5,$6)`, [
          body.p_stripe_session_id, body.p_stripe_payment_intent_id, body.p_customer_email,
          body.p_customer_name, body.p_amount_total, body.p_currency,
        ])
        return response(result.rows)
      }
      const table = url.pathname.split('/').pop()!
      assert.ok(['items', 'orders', 'checkout_recovery_log'].includes(table))
      const values: unknown[] = []
      const conditions: string[] = []
      for (const [key, value] of url.searchParams) {
        if (['select','limit','order'].includes(key)) continue
        assert.match(key, /^[a-z_]+$/)
        assert.ok(value.startsWith('eq.'))
        values.push(value.slice(3)); conditions.push(`${key} = $${values.length}`)
      }
      const where = conditions.length ? ` where ${conditions.join(' and ')}` : ''
      let rows: any[]
      if (method === 'POST') {
        const entries = Object.entries(body)
        rows = (await db.query(`insert into ${table} (${entries.map(([k]) => k).join(',')}) values (${entries.map((_, i) => '$' + (i + 1)).join(',')}) returning *`, entries.map(([,v]) => v))).rows
      } else if (method === 'PATCH') {
        if (failShipping && body.shipping_address) return response({ message: 'fixture write failure', code: 'XX001' }, 500)
        const set = Object.entries(body).map(([k,v]) => { values.push(v); return `${k}=$${values.length}` })
        rows = (await db.query(`update ${table} set ${set.join(',')} ${where} returning *`, values)).rows
      } else {
        rows = (await db.query(`select * from ${table}${where}`, values)).rows
      }
      const accept = new Headers(init?.headers).get('accept') ?? ''
      return response(accept.includes('object+json') ? rows[0] ?? null : rows)
    } catch (error) { return response({ message: (error as Error).message, code: 'FIXTURE_SQL' }, 400) }
  }
  stripe.checkout.sessions.create = (async (params: any) => {
    assert.ok(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))
    sessionParams = params
    return { id: `cs_test_${++sequence}`, url: 'https://checkout.invalid', payment_intent: `pi_fixture_${sequence}` }
  }) as any
  stripe.checkout.sessions.expire = (async () => ({})) as any
  stripe.paymentIntents.create = (async (params: any) => { intentParams = params; return { id: `pi_fixture_${++sequence}`, client_secret: 'fixture_secret' } }) as any
  stripe.paymentIntents.update = (async () => ({})) as any
})

after(async () => {
  globalThis.fetch = originalFetch
  stripe.checkout.sessions.create = originals.create; stripe.checkout.sessions.expire = originals.expire
  stripe.paymentIntents.create = originals.intent; stripe.paymentIntents.update = originals.update
  await db.close()
})

async function reset(availability = 'available') {
  emails = 0; failShipping = false
  await db.exec('truncate checkout_recovery_log, orders, items cascade')
  await db.query(`insert into items (id,title,slug,catalog_number,price,status,availability,sourcing_model)
    values ($1,'Canonical chair','chair','BO-101',123.45,'published',$2,'direct')`, [itemId, availability])
}
async function createCheckout() {
  const r = await checkout(new NextRequest('https://store.invalid/api/checkout', { method: 'POST', body: JSON.stringify({ itemId, title: 'Forged', price: 1 }) }))
  assert.equal(r.status, 200)
  return (await db.query<any>('select * from orders order by created_at desc limit 1')).rows[0]
}
function eventFor(order: any, overrides: Record<string, unknown> = {}) {
  return { id: `evt_fixture_${order.stripe_session_id}`, object: 'event', livemode: false, type: 'checkout.session.completed', data: { object: {
    id: order.stripe_session_id, payment_intent: order.stripe_payment_intent_id, payment_status: 'paid',
    metadata: { item_id: itemId }, amount_total: 12345, currency: 'usd',
    customer_details: { email: 'fixture@example.invalid', name: 'Fixture' },
    shipping_details: { name: 'Fixture', address }, ...overrides,
  } } }
}
async function deliver(event: any, signature?: string) {
  const payload = JSON.stringify(event)
  return webhook(new NextRequest('https://store.invalid/api/webhooks/stripe', { method: 'POST', body: payload,
    headers: { 'stripe-signature': signature ?? stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! }) } }))
}

test('hosted checkout uses canonical pricing, title, SKU, shipping, and never writes inventory', async () => {
  await reset(); await createCheckout(); await createCheckout()
  assert.equal(sessionParams.line_items[0].price_data.unit_amount, 12345)
  assert.equal(sessionParams.line_items[0].price_data.product_data.name, 'Canonical chair')
  assert.equal(sessionParams.line_items[0].price_data.product_data.metadata.sku, 'BO-101')
  assert.deepEqual(sessionParams.shipping_address_collection.allowed_countries, ['US'])
  assert.equal((await db.query<any>('select availability from items')).rows[0].availability, 'available')
})

test('reserved and sold pieces return structured unavailable responses without orders', async () => {
  for (const availability of ['reserved','sold']) {
    await reset(availability)
    const r = await checkout(new NextRequest('https://store.invalid/api/checkout', { method: 'POST', body: JSON.stringify({ itemId }) }))
    assert.equal(r.status, 409)
    assert.deepEqual(await r.json(), { error: 'unavailable', items: [{ id: itemId, title: 'Canonical chair' }] })
    assert.equal((await db.query('select * from orders')).rows.length, 0)
  }
})

test('embedded intent creation preserves availability and uses canonical product description/SKU', async () => {
  await reset()
  assert.equal((await intent(new NextRequest(`https://store.invalid/api/checkout/intent?itemId=${itemId}`))).status, 200)
  assert.equal(intentParams.amount, 12345); assert.equal(intentParams.metadata.sku, 'BO-101')
  assert.match(intentParams.description, /Canonical chair/)
  assert.equal((await db.query<any>('select availability from items')).rows[0].availability, 'available')
})

test('signed completion persists shipping, sells once, and concurrent replays notify once', async () => {
  await reset(); const order = await createCheckout(); const event = eventFor(order)
  const replies = await Promise.all([deliver(event), deliver(event), deliver({ ...event, id: 'evt_other_same_session' })])
  assert.deepEqual(replies.map(r => r.status), [200,200,200])
  const rows = (await db.query<any>('select * from orders')).rows
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'paid')
  assert.equal(rows[0].shipping_address.line1, address.line1)
  assert.equal((await db.query<any>('select availability from items')).rows[0].availability, 'sold')
  assert.equal(emails, 1)
})

test('second paid session for the same item records actionable reconciliation and no fulfillment', async () => {
  await reset(); const first = await createCheckout(); const second = await createCheckout()
  assert.equal((await deliver(eventFor(first))).status, 200)
  assert.equal((await deliver(eventFor(second))).status, 200)
  assert.equal(emails, 1)
  const log = (await db.query<any>('select * from checkout_recovery_log')).rows[0]
  assert.equal(log.details.severity, 'high'); assert.equal(log.details.existingOrderId, first.id)
  assert.equal(log.details.eventId, eventFor(second).id); assert.deepEqual(log.details.productIds, [itemId])
  assert.match(log.details.action, /manually refund/)
})

test('bad signature, unpaid completion and expiry cannot mutate inventory', async () => {
  await reset(); const order = await createCheckout()
  assert.equal((await deliver(eventFor(order), 'invalid')).status, 400)
  assert.equal((await deliver({ ...eventFor(order), livemode: true })).status, 400)
  assert.equal((await deliver(eventFor(order, { payment_status: 'unpaid' }))).status, 200)
  assert.equal((await deliver({ ...eventFor(order), type: 'checkout.session.expired' })).status, 200)
  assert.equal((await db.query<any>('select availability from items')).rows[0].availability, 'available')
  assert.equal(emails, 0)
})

test('database rejects fulfillment without shipping and denies public execution', async () => {
  await reset(); const order = await createCheckout()
  await assert.rejects(db.query('select * from fulfill_stripe_checkout_session($1,$2,$3,$4,$5,$6)',
    [order.stripe_session_id, order.stripe_payment_intent_id, null, null, 12345, 'usd']), /shipping_address_required/)
  const permissions = await db.query<any>(`select has_function_privilege('anon',
    'fulfill_stripe_checkout_session(text,text,text,text,integer,text)', 'execute') as allowed`)
  assert.equal(permissions.rows[0].allowed, false)
})

test('processor session failure leaves inventory available and creates no order', async () => {
  await reset(); const create = stripe.checkout.sessions.create
  stripe.checkout.sessions.create = (async () => { throw new Error('fixture processor unavailable') }) as any
  try {
    const r = await checkout(new NextRequest('https://store.invalid/api/checkout', { method: 'POST', body: JSON.stringify({ itemId }) }))
    assert.equal(r.status, 500)
    assert.equal((await db.query('select * from orders')).rows.length, 0)
    assert.equal((await db.query<any>('select availability from items')).rows[0].availability, 'available')
  } finally { stripe.checkout.sessions.create = create }
})

test('shipping write failure retries before sale; replay recovers address and sends once', async () => {
  await reset(); const order = await createCheckout(); failShipping = true
  assert.equal((await deliver(eventFor(order))).status, 500)
  assert.equal((await db.query<any>('select availability from items')).rows[0].availability, 'available')
  assert.equal(emails, 0); failShipping = false
  assert.equal((await deliver(eventFor(order))).status, 200); assert.equal(emails, 1)
})

test('mismatched metadata/amount or absent shipping fail closed before inventory mutation', async () => {
  await reset(); const order = await createCheckout()
  for (const override of [{ metadata: { item_id: 'wrong' } }, { amount_total: 1 }, { shipping_details: null }]) {
    assert.equal((await deliver(eventFor(order, override))).status, 500)
  }
  assert.equal((await db.query<any>('select availability from items')).rows[0].availability, 'available')
  assert.equal(emails, 0)
})

test('Elements successful intent persists actual processor shipping and replays safely', async () => {
  await reset()
  await intent(new NextRequest(`https://store.invalid/api/checkout/intent?itemId=${itemId}`))
  const order = (await db.query<any>('select * from orders')).rows[0]
  const event = { id: 'evt_elements', livemode: false, type: 'payment_intent.succeeded', data: { object: {
    id: order.stripe_payment_intent_id, status: 'succeeded', amount: 12345, currency: 'usd',
    receipt_email: 'fixture@example.invalid', metadata: { item_id: itemId, checkout_surface: 'terminal_elements' },
    shipping: { name: 'Fixture', address },
  } } }
  assert.equal((await deliver(event)).status, 200); assert.equal((await deliver(event)).status, 200)
  assert.equal((await db.query<any>('select shipping_address from orders')).rows[0].shipping_address.line1, address.line1)
  assert.equal(emails, 1)
})
