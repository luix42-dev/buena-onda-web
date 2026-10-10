import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { createStudioSession, hasStudioAccess, isStudioSameOrigin, STUDIO_COOKIE, STUDIO_SESSION_SECONDS } from '../lib/studio-auth'
import { middleware, config } from '../middleware'
import { POST as login } from '../app/studio/auth/start/route'
import { POST as logout } from '../app/studio/logout/route'

async function withPassword(password: string | undefined, run: () => Promise<void>) {
  const saved = process.env.STUDIO_PASSWORD
  if (password === undefined) delete process.env.STUDIO_PASSWORD
  else process.env.STUDIO_PASSWORD = password
  try { await run() } finally { if (saved === undefined) delete process.env.STUDIO_PASSWORD; else process.env.STUDIO_PASSWORD = saved }
}
const request = (path: string, token?: string) => new NextRequest(`https://studio.example.test${path}`, { headers: token ? { cookie: `${STUDIO_COOKIE}=${token}` } : {} })
const post = (path: string, origin: string | null, body = {}) => new NextRequest(`https://studio.example.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body) })

test('same-origin uses actual Host despite Next localhost normalization, never forwarded host', () => {
  const local = (origin: string) => new NextRequest('http://localhost:3041/studio/auth/start', { method: 'POST', headers: { host: '127.0.0.1:3041', origin, 'x-forwarded-host': 'evil.example.test' } })
  assert.equal(isStudioSameOrigin(local('http://127.0.0.1:3041')), true)
  assert.equal(isStudioSameOrigin(local('http://localhost:3041')), false)
  assert.equal(isStudioSameOrigin(local('http://evil.example.test')), false)
  assert.equal(isStudioSameOrigin(local('https://127.0.0.1:3041')), false)
})

test('signed session is opaque, unique, expiring and rejects raw password/tampering/rotation', async () => {
  await withPassword('TEST-private-password', async () => {
    const now = Date.now(), token = await createStudioSession(now)
    assert.ok(!token.includes('TEST-private-password'))
    assert.notEqual(token, await createStudioSession(now))
    assert.equal(await hasStudioAccess(token, now), true)
    assert.equal(await hasStudioAccess('TEST-private-password'), false)
    assert.equal(await hasStudioAccess(undefined), false)
    assert.equal(await hasStudioAccess(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')), false)
    assert.equal(await hasStudioAccess(token, now + STUDIO_SESSION_SECONDS * 1000), false)
    assert.equal(await hasStudioAccess(await createStudioSession(now + 120_000), now), false)
    process.env.STUDIO_PASSWORD = 'TEST-rotated-password'
    assert.equal(await hasStudioAccess(token), false)
  })
})

test('missing password fails closed for signed cookies, Studio pages and both API namespaces', async () => {
  let token = ''
  await withPassword('TEST-configured', async () => { token = await createStudioSession() })
  for (const absent of [undefined, '   ']) await withPassword(absent, async () => {
    assert.equal(await hasStudioAccess(token), false)
    assert.equal((await middleware(request('/studio', token))).status, 307)
    assert.equal((await middleware(request('/studio/orders', token))).status, 307)
    for (const path of ['/api/studio', '/api/studio/items', '/api/admin/items']) assert.equal((await middleware(request(path, token))).status, 401)
    assert.equal((await middleware(request('/studio/login'))).headers.get('x-middleware-next'), '1')
  })
  assert.ok(config.matcher.includes('/api/studio/:path*'))
  assert.ok(config.matcher.includes('/api/admin/:path*'))
})

test('middleware permits valid sessions and leaves original Cruise outside guard', async () => {
  await withPassword('TEST-password', async () => {
    const token = await createStudioSession()
    for (const path of ['/studio', '/api/studio/items', '/api/admin/items']) {
      assert.equal((await middleware(request(path, token))).headers.get('x-middleware-next'), '1')
      assert.notEqual((await middleware(request(path, 'TEST-password'))).status, 200)
    }
    assert.equal((await middleware(request('/cruise'))).headers.get('x-middleware-next'), '1')
  })
})

test('login issues signed httpOnly cookie, rejects invalid login/origin; logout clears cookie', async () => {
  const origin = 'https://studio.example.test'
  await withPassword('TEST-password', async () => {
    for (const foreign of [null, 'https://evil.example.test']) {
      assert.equal((await login(post('/studio/auth/start', foreign, { password: 'TEST-password' }))).status, 403)
      assert.equal((await logout(post('/studio/logout', foreign))).status, 403)
    }
    assert.equal((await login(post('/studio/auth/start', origin, { password: 'wrong' }))).status, 401)
    const response = await login(post('/studio/auth/start', origin, { password: 'TEST-password', from: '//evil.test' }))
    assert.equal(response.status, 200)
    assert.equal((await response.json()).redirectTo, '/studio')
    const cookie = response.cookies.get(STUDIO_COOKIE)!
    assert.equal(await hasStudioAccess(cookie.value), true)
    assert.equal(cookie.httpOnly, true); assert.equal(cookie.sameSite, 'lax')
    assert.equal(cookie.maxAge, STUDIO_SESSION_SECONDS)
    const ended = await logout(post('/studio/logout', origin))
    assert.equal(ended.status, 303); assert.equal(ended.cookies.get(STUDIO_COOKIE)?.maxAge, 0)
  })
  await withPassword(undefined, async () => assert.equal((await login(post('/studio/auth/start', origin, { password: 'anything' }))).status, 503))
})
