import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { POST as newsletter } from '../app/api/newsletter/route'
import { POST as notify } from '../app/api/notify/route'
import { POST as reserve } from '../app/api/reserve/route'
import { POST as contact } from '../app/api/contact/route'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service-role'
process.env.RESEND_API_KEY = 'fixture-resend'
const itemId = '11111111-1111-4111-8111-111111111111'

after(() => {
  globalThis.fetch = originalFetch
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY']) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})

function request(path: string, body: unknown) {
  return new NextRequest(`https://store.invalid${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', cookie: 'sb-forged-auth-token=untrusted-browser-value' } })
}
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }) }
function describe(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  assert.ok(['database.invalid', 'api.resend.com'].includes(url.hostname), 'fixtures refuse all live network access')
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  if (url.hostname === 'database.invalid') assert.equal(headers.get('authorization'), 'Bearer fixture-service-role')
  return { url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null }
}

test('newsletter ignores forged browser auth and does not disclose existing membership', async () => {
  let duplicate = false
  globalThis.fetch = async (input, init) => {
    const { url, body } = describe(input, init)
    assert.equal(url.pathname, '/rest/v1/newsletter_subscribers')
    assert.equal(body.email, 'person@example.invalid')
    return duplicate ? response({ code: '23505', message: 'duplicate key' }, 409) : response(null, 201)
  }
  const first = await newsletter(request('/api/newsletter', { email: 'PERSON@example.invalid' }))
  duplicate = true
  const second = await newsletter(request('/api/newsletter', { email: 'PERSON@example.invalid' }))
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.deepEqual(await first.json(), await second.json())
})

test('notification requests verify a public item and normalize email before insert', async () => {
  let inserted = false
  globalThis.fetch = async (input, init) => {
    const { url, method, body } = describe(input, init)
    if (url.pathname === '/rest/v1/items') {
      assert.equal(url.searchParams.get('status'), 'eq.published')
      assert.equal(url.searchParams.get('id'), `eq.${itemId}`)
      return response([{ id: itemId }])
    }
    assert.equal(url.pathname, '/rest/v1/item_notify_requests')
    assert.equal(method, 'POST')
    assert.deepEqual(body, { item_id: itemId, email: 'person@example.invalid' })
    inserted = true
    return response(null, 201)
  }
  assert.equal((await notify(request('/api/notify', { itemId, email: 'PERSON@example.invalid' }))).status, 200)
  assert.equal(inserted, true)
})

test('reservation emails use the canonical product title and escape submitted text', async () => {
  let sent = false
  globalThis.fetch = async (input, init) => {
    const { url, method, body } = describe(input, init)
    if (url.pathname === '/rest/v1/items') {
      assert.equal(url.searchParams.get('status'), 'eq.published')
      return response([{ id: itemId, title: 'Canonical turntable' }])
    }
    if (url.pathname === '/rest/v1/item_notify_requests') return response(method === 'GET' ? [] : null, method === 'GET' ? 200 : 201)
    assert.equal(url.hostname, 'api.resend.com')
    assert.equal(body.subject, 'Reserve request: Canonical turntable')
    assert.ok(!body.html.includes('<script>'))
    assert.ok(body.html.includes('&lt;script&gt;'))
    sent = true
    return response({ id: 'fixture-email' })
  }
  const result = await reserve(request('/api/reserve', { itemId, itemTitle: 'Forged title', email: 'person@example.invalid', message: '<script>alert(1)</script>' }))
  assert.equal(result.status, 200)
  assert.equal(sent, true)
})

test('reservations and notifications refuse unpublished or missing item IDs before writing', async () => {
  let reads = 0
  globalThis.fetch = async (input, init) => {
    const { url, method } = describe(input, init)
    assert.equal(url.pathname, '/rest/v1/items')
    assert.equal(method, 'GET')
    reads++
    return response([])
  }
  const body = { itemId, email: 'person@example.invalid' }
  assert.equal((await reserve(request('/api/reserve', body))).status, 404)
  assert.equal((await notify(request('/api/notify', body))).status, 404)
  assert.equal(reads, 2)
})

test('valid contact submissions still deliver escaped email content', async () => {
  globalThis.fetch = async (input, init) => {
    const { url, body } = describe(input, init)
    assert.equal(url.hostname, 'api.resend.com')
    assert.ok(!body.html.includes('<script>'))
    assert.ok(body.html.includes('&lt;script&gt;'))
    return response({ id: 'fixture-contact' })
  }
  assert.equal((await contact(request('/api/contact', { name: 'Visitor', email: 'visitor@example.invalid', subject: 'Question', message: '<script>alert(1)</script> Please send details.' }))).status, 200)
})
