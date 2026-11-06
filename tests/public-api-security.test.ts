import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { POST as intake } from '../app/api/intake/route'
import { POST as telegram } from '../app/api/telegram/webhook/route'
import { POST as contact } from '../app/api/contact/route'
import { POST as newsletter } from '../app/api/newsletter/route'
import { POST as notify } from '../app/api/notify/route'
import { POST as reserve } from '../app/api/reserve/route'
import { POST as posts } from '../app/api/posts/route'
import { POST as episodes } from '../app/api/episodes/route'
import { POST as drops } from '../app/api/drops/route'
import { GET as intentGet, POST as intentPost } from '../app/api/checkout/intent/route'
import { createStudioSession, STUDIO_COOKIE } from '../lib/studio-auth'
import { readLimitedJson, readLimitedText, publicWriteGuard, RequestBodyError } from '../lib/api/request-security'
import { isAllowedChat } from '../lib/telegram/bot'
import { isSameOrigin as cruiseSameOrigin } from '../lib/cruise/studio-auth'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }
globalThis.fetch = async () => { throw new Error('Security fixtures forbid external network calls') }
after(() => {
  globalThis.fetch = originalFetch
  for (const key of ['STUDIO_PASSWORD', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_CHAT_ID']) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})

function request(path: string, body: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://store.invalid${path}`, { method: 'POST', body, headers })
}

test('intake and legacy CMS writes reject unauthenticated callers before parsing or network access', async () => {
  for (const [path, handler] of [['/api/intake', intake], ['/api/posts', posts], ['/api/episodes', episodes], ['/api/drops', drops]] as const) {
    assert.equal((await handler(request(path, '{'))).status, 401)
    assert.equal((await handler(request(path, '{}', { cookie: 'studio_session=raw-password' }))).status, 401)
  }
})

test('intake requires same origin and rejects active content disguised as an image', async () => {
  process.env.STUDIO_PASSWORD = 'fixture-studio-password-only'
  const cookie = `${STUDIO_COOKIE}=${await createStudioSession()}`
  assert.equal((await intake(request('/api/intake', '{}', { cookie, origin: 'https://evil.invalid' }))).status, 401)
  const headers = { cookie, origin: 'https://store.invalid', host: 'store.invalid' }
  const svg = `data:image/svg+xml;base64,${Buffer.from('<svg onload="alert(1)"></svg>').toString('base64')}`
  assert.equal((await intake(request('/api/intake', JSON.stringify({ image: svg }), headers))).status, 400)
  const forged = `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`
  assert.equal((await intake(request('/api/intake', JSON.stringify({ image: forged }), headers))).status, 400)
  assert.equal((await intake(request('/api/intake', 'null', headers))).status, 400)
})

test('Telegram fails closed without a configured secret or valid secret header', async () => {
  delete process.env.TELEGRAM_WEBHOOK_SECRET
  const forged = JSON.stringify({ message: { chat: { id: 123 }, text: 'publish' } })
  assert.equal((await telegram(request('/api/telegram/webhook', forged))).status, 401)
  process.env.TELEGRAM_WEBHOOK_SECRET = 'short'
  assert.equal((await telegram(request('/api/telegram/webhook', forged, { 'x-telegram-bot-api-secret-token': 'short' }))).status, 401)
  process.env.TELEGRAM_WEBHOOK_SECRET = 'fixture-telegram-secret-with-32-characters'
  assert.equal((await telegram(request('/api/telegram/webhook', forged, { 'x-telegram-bot-api-secret-token': 'wrong' }))).status, 401)
  assert.equal((await telegram(request('/api/telegram/webhook', '{}', { 'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET }))).status, 200)
  assert.equal((await telegram(request('/api/telegram/webhook', 'null', { 'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET }))).status, 400)
})

test('Telegram chat authorization has no built-in fallback identity', () => {
  delete process.env.TELEGRAM_CHAT_ID
  assert.equal(isAllowedChat(685672295), false)
  process.env.TELEGRAM_CHAT_ID = '123'
  assert.equal(isAllowedChat(123), true)
  assert.equal(isAllowedChat(456), false)
})

test('bounded reader rejects chunked oversized UTF-8 bodies without trusting Content-Length', async () => {
  const encoded = new TextEncoder().encode(JSON.stringify({ text: 'é'.repeat(50) }))
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoded.slice(0, 20)); controller.enqueue(encoded.slice(20)); controller.close() } })
  const chunked = new Request('https://store.invalid', { method: 'POST', body: stream, duplex: 'half' } as RequestInit)
  await assert.rejects(readLimitedJson(chunked, 60), (error: unknown) => error instanceof RequestBodyError && error.status === 413)
  await assert.rejects(readLimitedText(request('/', 'small', { 'content-length': '10000' }), 10), (error: unknown) => error instanceof RequestBodyError && error.status === 413)
  assert.deepEqual(await readLimitedJson(request('/', '{"ok":true}'), 20), { ok: true })
})

test('forms reject malformed and oversized JSON before contacting email or database providers', async () => {
  for (const handler of [contact, newsletter, notify, reserve]) {
    assert.equal((await handler(request('/api/form', '{'))).status, 400)
    assert.equal((await handler(request('/api/form', JSON.stringify({ data: 'x'.repeat(20_000) })))).status, 413)
  }
})

test('checkout intent GET cannot create processor intents or database orders', async () => {
  assert.equal((await intentGet()).status, 405)
  assert.equal((await intentPost(request('/api/checkout/intent', '{}'))).status, 409)
})

test('public write guard refuses browser cross-site requests and returns bounded retry responses', () => {
  const guard = publicWriteGuard(2, 0)
  assert.equal(guard(request('/', '{}', { 'sec-fetch-site': 'cross-site' }))?.status, 403)
  assert.equal(guard(request('/', '{}')), null)
  assert.equal(guard(request('/', '{}')), null)
  const limited = guard(request('/', '{}'))
  assert.equal(limited?.status, 429)
  assert.equal(limited?.headers.get('retry-after'), '60')
})

test('Cruise moderation checks full origin and ignores spoofed forwarded hosts', () => {
  assert.equal(cruiseSameOrigin(new Headers({ origin: 'https://evil.invalid', 'x-forwarded-host': 'evil.invalid' }), 'https://store.invalid/api/cruise/plots/moderate'), false)
  assert.equal(cruiseSameOrigin(new Headers({ origin: 'http://store.invalid' }), 'https://store.invalid/api/cruise/plots/moderate'), false)
  assert.equal(cruiseSameOrigin(new Headers({ origin: 'https://store.invalid' }), 'https://store.invalid/api/cruise/plots/moderate'), true)
})
