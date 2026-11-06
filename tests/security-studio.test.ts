import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { createStudioSession, isStudioAuthorized, STUDIO_COOKIE } from '../lib/studio-auth'
import { POST as login } from '../app/studio/auth/start/route'
import { POST as reconcile } from '../app/api/admin/checkout/reconcile/route'

test('admin handlers reject cross-origin and missing-origin mutations with a valid cookie', async () => {
  const saved = process.env.STUDIO_PASSWORD
  process.env.STUDIO_PASSWORD = 'security-test-password'
  try {
    const cookie = `${STUDIO_COOKIE}=${await createStudioSession()}`
    for (const origin of [undefined, 'https://other.example.test', 'null']) {
      const req = new NextRequest('https://studio.example.test/api/admin/checkout/reconcile', {
        method: 'POST', headers: { cookie, ...(origin ? { origin } : {}) },
      })
      assert.equal(await isStudioAuthorized(req), false)
      // Invoke handler directly; middleware cannot be the only protection.
      assert.equal((await reconcile(req)).status, 401)
    }
    const valid = new NextRequest('https://studio.example.test/api/admin/items', {
      method: 'POST', headers: { cookie, origin: 'https://studio.example.test' },
    })
    assert.equal(await isStudioAuthorized(valid), true)
    assert.equal(await isStudioAuthorized(new NextRequest('https://studio.example.test/api/admin/items', { headers: { cookie } })), true)
  } finally { if (saved === undefined) delete process.env.STUDIO_PASSWORD; else process.env.STUDIO_PASSWORD = saved }
})

test('login bounds streamed input and throttles repeated guesses', async () => {
  const saved = process.env.STUDIO_PASSWORD
  process.env.STUDIO_PASSWORD = 'security-test-password'
  const req = (body: string, ip: string) => new NextRequest('https://studio.example.test/studio/auth/start', {
    method: 'POST', headers: { origin: 'https://studio.example.test', 'x-forwarded-for': ip }, body,
  })
  try {
    assert.equal((await login(req(JSON.stringify({ password: 'x'.repeat(5000) }), '192.0.2.1'))).status, 400)
    for (let i = 0; i < 10; i++) assert.equal((await login(req('{"password":"wrong"}', '192.0.2.2'))).status, 401)
    const throttled = await login(req('{"password":"wrong"}', '192.0.2.2'))
    assert.equal(throttled.status, 429)
    assert.equal(throttled.headers.get('retry-after'), '60')
  } finally { if (saved === undefined) delete process.env.STUDIO_PASSWORD; else process.env.STUDIO_PASSWORD = saved }
})
