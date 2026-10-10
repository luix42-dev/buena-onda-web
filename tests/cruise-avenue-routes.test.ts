/**
 * Route-level tests for the Avenue API and the cruise branch of the Stripe webhook.
 *
 * The real route handlers run in this test process against a tiny PostgREST stand-in (enough of
 * the REST/RPC surface supabase-js uses) backed by @electric-sql/pglite with the real migration.
 * Stripe events are signed locally with stripe.webhooks.generateTestHeaderString and a throwaway
 * TEST secret that exists only in this process — no network call to Stripe is made and the dev
 * server is not involved. All data is TEST data.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { PGlite } from '@electric-sql/pglite'
import Stripe from 'stripe'
import { NextRequest } from 'next/server'

const MIGRATION = join(__dirname, '..', 'supabase', 'migrations', '20261009120000_cruise_avenue_plots.sql')
const WEBHOOK_SECRET = 'whsec_TEST_throwaway_local_only'
const STUDIO = 'TEST-studio-password'
let db: PGlite, server: Server, baseUrl = ''
const requested: string[] = []

const ident = (s: string) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`bad identifier ${s}`); return `"${s}"` }

/** Minimal PostgREST: GET /rest/v1/<table>?select=&col=eq.v&order=col.dir&limit=n and POST /rest/v1/rpc/<fn>. */
async function handle(method: string, url: URL, body: string) {
  const path = url.pathname.replace(/^\/rest\/v1\//, '')
  requested.push(`${method} ${url.pathname}`)
  try {
    if (method === 'POST' && path.startsWith('rpc/')) {
      const fn = ident(path.slice(4)); const args = body ? JSON.parse(body) as Record<string, unknown> : {}
      const keys = Object.keys(args)
      const r = await db.query<{ r: unknown }>(`select public.${fn}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(', ')}) as r`, keys.map(k => args[k]))
      return { status: 200, json: r.rows[0]?.r ?? null }
    }
    if (method === 'GET') {
      const table = ident(path)
      const cols = (url.searchParams.get('select') ?? '*').split(',').map(c => c === '*' ? '*' : ident(c)).join(', ')
      const where: string[] = []; const params: unknown[] = []
      let order = '', limit = ''
      for (const [k, v] of url.searchParams) {
        if (k === 'select') continue
        if (k === 'order') { const [c, dir] = v.split('.'); order = ` order by ${ident(c)} ${dir === 'desc' ? 'desc' : 'asc'}`; continue }
        if (k === 'limit') { limit = ` limit ${Number(v) | 0}`; continue }
        if (v.startsWith('eq.')) { params.push(v.slice(3)); where.push(`${ident(k)}::text = $${params.length}`) }
      }
      const r = await db.query(`select ${cols} from public.${table}${where.length ? ` where ${where.join(' and ')}` : ''}${order}${limit}`, params)
      return { status: 200, json: r.rows }
    }
    return { status: 405, json: { message: 'not supported by the test stand-in' } }
  } catch (e) {
    const err = e as { code?: string; message?: string }
    return { status: 400, json: { code: err.code ?? '', message: err.message ?? 'error', details: null, hint: null } }
  }
}

before(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create role service_role;`)
  await db.exec(readFileSync(MIGRATION, 'utf8'))
  server = createServer((req, res) => {
    let body = ''; req.on('data', c => { body += c }); req.on('end', async () => {
      const r = await handle(req.method ?? 'GET', new URL(req.url ?? '/', 'http://x'), body)
      res.writeHead(r.status, { 'content-type': 'application/json' }); res.end(JSON.stringify(r.json))
    })
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', () => r()))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: baseUrl,
    SUPABASE_SERVICE_ROLE_KEY: 'TEST-not-a-real-service-role-key',
    STRIPE_SECRET_KEY: 'sk_test_TEST_dummy_never_used_for_api_calls',
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    CRUISE_DRIVEBY_SALT: 'TEST-salt',
  })
})
after(async () => { await new Promise(r => server.close(r)); await db.close() })

const stripe = () => new Stripe('sk_test_TEST_dummy_never_used_for_api_calls')
let seq = 0
function session(over: Partial<Stripe.Checkout.Session> & { metadata?: Record<string, string> } = {}) {
  seq++
  return {
    id: `cs_test_TEST_${seq}`, object: 'checkout.session', mode: 'payment', currency: 'usd', amount_total: 500, payment_status: 'paid', status: 'complete',
    customer_email: 'buyer@example.test', customer_details: { email: 'buyer@example.test' },
    metadata: { kind: 'cruise_plot', plot_number: '9', expected_cents: '500', prior_value_cents: '0', owner_name: 'TEST Owner Nine', owner_tagline: 'TEST tagline', owner_url: 'https://example.test', owner_color: '#ff4f9a' },
    ...over,
  } as unknown as Stripe.Checkout.Session
}
async function sendEvent(type: string, obj: Stripe.Checkout.Session, opts: { badSig?: boolean; noSig?: boolean; id?: string } = {}) {
  const { POST } = await import('../app/api/webhooks/stripe/route')
  const payload = JSON.stringify({ id: opts.id ?? `evt_test_TEST_${++seq}`, object: 'event', type, livemode: false, api_version: '2025-02-24.acacia', created: Math.floor(Date.now() / 1000), data: { object: obj } })
  const header = stripe().webhooks.generateTestHeaderString({ payload, secret: opts.badSig ? 'whsec_TEST_wrong' : WEBHOOK_SECRET })
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (!opts.noSig) headers['stripe-signature'] = header
  const res = await POST(new NextRequest('http://localhost/api/webhooks/stripe', { method: 'POST', body: payload, headers }))
  return { status: res.status, body: await res.json() as Record<string, unknown> }
}
const plotRow = async (n: number) => (await db.query<{ status: string; review_state: string; owner_name: string | null; value_cents: number; visits: string }>(`select status, review_state, owner_name, value_cents, visits from public.cruise_plots where number = $1`, [n])).rows[0]
const refund = async (id: string) => (await db.query<{ reason: string }>(`select reason from public.cruise_plot_refunds_needed where stripe_session_id = $1`, [id])).rows[0]

test('webhook: missing or invalid signature → 400, no state change', async () => {
  const s = session()
  assert.equal((await sendEvent('checkout.session.completed', s, { noSig: true })).status, 400)
  assert.equal((await sendEvent('checkout.session.completed', s, { badSig: true })).status, 400)
  assert.equal((await plotRow(9)).status, 'open')
})

test('webhook: paid cruise session applies claim as pending; replay is duplicate; only cruise tables touched', async () => {
  requested.length = 0
  const s = session()
  const r1 = await sendEvent('checkout.session.completed', s)
  assert.deepEqual([r1.status, r1.body.cruise_plot], [200, 'applied'])
  const row = await plotRow(9)
  assert.deepEqual([row.status, row.review_state, row.owner_name, row.value_cents], ['claimed', 'pending', 'TEST Owner Nine', 500])
  const r2 = await sendEvent('checkout.session.completed', s)
  assert.deepEqual([r2.status, r2.body.cruise_plot], [200, 'duplicate'])
  assert.ok(requested.length > 0 && requested.every(p => /\/rest\/v1\/(rpc\/cruise_plot_|cruise_plot)/.test(p)), requested.join('\n'))
})

test('webhook: amount or currency mismatch → 200 + durable refund record, no ownership change', async () => {
  const a = session({ amount_total: 1, metadata: { ...session().metadata!, plot_number: '11' } })
  const ra = await sendEvent('checkout.session.completed', a)
  assert.deepEqual([ra.status, ra.body.cruise_plot], [200, 'amount_mismatch'])
  assert.equal((await refund(a.id)).reason, 'amount_mismatch')
  const c = session({ currency: 'eur', metadata: { ...session().metadata!, plot_number: '11' } })
  const rc = await sendEvent('checkout.session.completed', c)
  assert.deepEqual([rc.status, rc.body.cruise_plot], [200, 'currency_mismatch'])
  assert.equal((await refund(c.id)).reason, 'currency_mismatch')
  assert.equal((await plotRow(11)).status, 'open')
})

test('webhook: stale buyout → 200 stale_price + refund record; house plot → not_claimable (no Stripe retry storm)', async () => {
  const stale = session({ metadata: { ...session().metadata!, owner_name: 'TEST Late Buyer' } }) // plot 9 now worth 500, prior 0
  const r = await sendEvent('checkout.session.completed', stale)
  assert.deepEqual([r.status, r.body.cruise_plot], [200, 'stale_price'])
  assert.equal((await refund(stale.id)).reason, 'stale_price')
  assert.equal((await plotRow(9)).owner_name, 'TEST Owner Nine')
  const house = session({ amount_total: 7500, metadata: { ...session().metadata!, plot_number: '5', expected_cents: '7500' } })
  const rh = await sendEvent('checkout.session.completed', house)
  assert.deepEqual([rh.status, rh.body.cruise_plot], [200, 'not_claimable'])
  assert.equal((await plotRow(5)).status, 'house')
})

test('webhook: async payment — completed-unpaid waits, async_payment_succeeded applies', async () => {
  const meta = { ...session().metadata!, plot_number: '11' }
  const unpaid = session({ payment_status: 'unpaid', metadata: meta })
  const r1 = await sendEvent('checkout.session.completed', unpaid)
  assert.deepEqual([r1.status, r1.body.awaiting_payment], [200, true])
  assert.equal((await plotRow(11)).status, 'open')
  const r2 = await sendEvent('checkout.session.async_payment_succeeded', { ...unpaid, payment_status: 'paid' } as Stripe.Checkout.Session)
  assert.deepEqual([r2.status, r2.body.cruise_plot], [200, 'applied'])
  assert.equal((await plotRow(11)).review_state, 'pending')
})

test('webhook: expired / async_payment_failed cruise sessions are acknowledged with no state change', async () => {
  const meta = { ...session().metadata!, plot_number: '12' }
  for (const type of ['checkout.session.expired', 'checkout.session.async_payment_failed']) {
    const r = await sendEvent(type, session({ payment_status: 'unpaid', status: 'expired', metadata: meta }))
    assert.deepEqual([r.status, r.body.cruise_plot], [200, 'ignored'])
  }
  assert.equal((await plotRow(12)).status, 'open')
})

test('webhook: transient DB failure → 500 so Stripe retries', async () => {
  const saved = process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9' // nothing listens here
  try {
    const r = await sendEvent('checkout.session.completed', session({ metadata: { ...session().metadata!, plot_number: '13' } }))
    assert.equal(r.status, 500)
  } finally { process.env.NEXT_PUBLIC_SUPABASE_URL = saved }
  assert.equal((await plotRow(13)).status, 'open')
})

test('GET /api/cruise/plots: pending claim shows claimed with owner withheld, buyout price, no emails or session ids', async () => {
  const { GET } = await import('../app/api/cruise/plots/route')
  const res = await GET(); const text = await res.text(); const data = JSON.parse(text) as { plots: { number: number; status: string; pending?: boolean; owner?: { name: string } }[]; events: { name: string }[]; live: boolean }
  assert.equal(data.live, true)
  const p9 = data.plots.find(p => p.number === 9)!
  assert.equal(p9.status, 'claimed'); assert.equal(p9.pending, true); assert.equal(p9.owner?.name, 'Sign in review')
  assert.ok(!text.includes('TEST Owner Nine'), 'owner content of a pending claim must not be public')
  assert.ok(!text.includes('example.test') && !text.includes('@') && !text.includes('cs_test'), 'no emails, owner urls of pending claims, or session ids')
  assert.ok(data.events.length > 0 && data.events.every(e => e.name === 'a new owner (in review)'))
})

test('moderation API: fails closed without STUDIO_PASSWORD, needs cookie + same origin, approve is audited and goes live', async () => {
  const { POST } = await import('../app/api/cruise/plots/moderate/route')
  const sessionId = (await db.query<{ s: string }>(`select claim_session_id as s from public.cruise_plots where number = 9`)).rows[0].s
  const req = (cookie: string | null, origin: string | null, body: unknown) => new NextRequest('http://localhost:3040/api/cruise/plots/moderate', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', host: 'localhost:3040', ...(cookie ? { cookie: `studio_session=${cookie}` } : {}), ...(origin ? { origin } : {}) },
  })
  const approve = { action: 'approve', plot: 9, session: sessionId, actor: 'TEST op' }
  delete process.env.STUDIO_PASSWORD
  assert.equal((await POST(req('anything', 'http://localhost:3040', approve))).status, 401)
  assert.equal((await POST(req(null, 'http://localhost:3040', approve))).status, 401)
  process.env.STUDIO_PASSWORD = STUDIO
  assert.equal((await POST(req('wrong', 'http://localhost:3040', approve))).status, 401)
  assert.equal((await POST(req(STUDIO, null, approve))).status, 403)
  assert.equal((await POST(req(STUDIO, 'https://evil.test', approve))).status, 403)
  assert.equal((await POST(req(STUDIO, 'http://localhost:3040', { ...approve, session: 'cs_other' }))).status, 409)
  assert.equal((await POST(req(STUDIO, 'http://localhost:3040', approve))).status, 200)
  assert.equal((await plotRow(9)).review_state, 'approved')
  const audit = (await db.query<{ action: string; actor: string }>(`select action, actor from public.cruise_plot_moderation where plot = 9`)).rows
  assert.deepEqual(audit, [{ action: 'approve', actor: 'studio:TEST op' }])
  const { GET } = await import('../app/api/cruise/plots/route')
  const data = await (await GET()).json() as { plots: { number: number; owner?: { name: string } }[]; events: { plot: number; name: string }[] }
  assert.equal(data.plots.find(p => p.number === 9)!.owner?.name, 'TEST Owner Nine')
  assert.ok(data.events.some(e => e.plot === 9 && e.name === 'TEST Owner Nine'))
  // Pull hides it again; refund resolution works through the same route.
  assert.equal((await POST(req(STUDIO, 'http://localhost:3040', { action: 'pull', plot: 9, session: sessionId, reason: 'TEST policy' }))).status, 200)
  const stale = (await db.query<{ s: string }>(`select stripe_session_id as s from public.cruise_plot_refunds_needed where reason = 'stale_price' limit 1`)).rows[0].s
  assert.equal((await POST(req(STUDIO, 'http://localhost:3040', { action: 'refund_resolved', session: stale, reason: 'TEST refunded' }))).status, 200)
  delete process.env.STUDIO_PASSWORD
})

test('claim API: 503 when disabled; house/out-of-range refused; stale price 409 with server price; rate limited per IP', async () => {
  const { POST } = await import('../app/api/cruise/plots/claim/route')
  const req = (ip: string, body: unknown) => new NextRequest('http://localhost/api/cruise/plots/claim', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-forwarded-for': ip } })
  const good = { plot: 9, expectedCents: 500, email: 'buyer@example.test', owner: { name: 'TEST Brand' } }
  delete process.env.CRUISE_PLOTS_ENABLED
  assert.equal((await POST(req('192.0.2.1', good))).status, 503)
  process.env.CRUISE_PLOTS_ENABLED = '1'
  try {
    assert.equal((await POST(req('192.0.2.2', { ...good, plot: 3 }))).status, 409) // house
    assert.equal((await POST(req('192.0.2.2', { ...good, plot: 31 }))).status, 400) // > MAX_PLOT
    const stale = await POST(req('192.0.2.2', good)) // plot 9 is pulled but worth 500 → buyout is 800, never floor
    assert.equal(stale.status, 409); assert.equal((await stale.json() as { price: number }).price, 800)
    assert.equal((await POST(req('192.0.2.2', { ...good, owner: { name: 'TEST', url: 'http://x.test' } }))).status, 400)
    assert.equal((await POST(req('192.0.2.2', good))).status, 409) // 5th request still allowed
    assert.equal((await POST(req('192.0.2.2', good))).status, 429) // 6th within the minute
  } finally { delete process.env.CRUISE_PLOTS_ENABLED }
})

test('visit API: bounded payload, seed plots only, deduped per client, rate limited', async () => {
  const { POST } = await import('../app/api/cruise/plots/visit/route')
  const req = (ip: string, body: string, ua = 'TEST-UA') => new NextRequest('http://localhost/api/cruise/plots/visit', { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, 'user-agent': ua } })
  const v14 = Number((await plotRow(14)).visits), v2 = Number((await plotRow(2)).visits)
  assert.equal((await POST(req('198.51.100.1', JSON.stringify({ plots: [14, 14, 2, 99, '15', 0] })))).status, 204)
  assert.equal(Number((await plotRow(14)).visits), v14 + 1)
  assert.equal(Number((await plotRow(2)).visits), v2 + 1) // house plots count too
  assert.equal(Number((await plotRow(15)).visits), 0) // strings are not plot numbers
  assert.equal((await POST(req('198.51.100.1', JSON.stringify({ plots: [14] })))).status, 204)
  assert.equal(Number((await plotRow(14)).visits), v14 + 1) // deduped
  assert.equal((await POST(req('198.51.100.2', JSON.stringify({ plots: [14] })))).status, 204)
  assert.equal(Number((await plotRow(14)).visits), v14 + 2) // a different client counts
  assert.equal((await POST(req('198.51.100.3', JSON.stringify({ plots: [14], pad: 'x'.repeat(2000) })))).status, 413)
  assert.equal((await POST(req('198.51.100.3', JSON.stringify({ plots: Array.from({ length: 61 }, () => 1) })))).status, 400)
  assert.equal((await POST(req('198.51.100.3', 'not json'))).status, 400)
  const statuses: number[] = []
  for (let i = 0; i < 10; i++) statuses.push((await POST(req('198.51.100.4', JSON.stringify({ plots: [16] })))).status)
  assert.deepEqual(statuses.slice(0, 8), Array(8).fill(204)); assert.deepEqual(statuses.slice(8), [429, 429])
  const hashes = (await db.query<{ client_hash: string }>(`select client_hash from public.cruise_plot_drive_by_seen`)).rows
  assert.ok(hashes.every(h => /^[0-9a-f]{64}$/.test(h.client_hash) && !h.client_hash.includes('198.51')))
})
