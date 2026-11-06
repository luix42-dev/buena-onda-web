// Read-only/denied-request smoke checks. Does not log in or contact payment providers.
import assert from 'node:assert/strict'

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3117'
const results = []
async function check(path, statuses, options = {}) {
  const response = await fetch(new URL(path, base), { ...options, redirect: 'manual' })
  assert.ok(statuses.includes(response.status), `${path}: expected ${statuses}, got ${response.status}`)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path)
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN', path)
  assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'self'/, path)
  assert.equal(response.headers.has('x-powered-by'), false, path)
  if (path.startsWith('/studio') || path.startsWith('/api/admin')) {
    assert.match(response.headers.get('cache-control') || '', /no-store/, path)
  }
  await response.body?.cancel()
  results.push({ path, status: response.status })
}

await check('/studio', [307])
await check('/studio/catalog', [307])
await check('/api/admin/items', [401])
await check('/api/admin/items', [401], {
  headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' },
})
await check('/api/intake', [401], { method: 'POST', body: '{}' })
await check('/api/checkout/intent', [405])
await check('/api/contact', [400], { method: 'POST', body: '{' })
await check('/api/contact', [413], { method: 'POST', body: 'x'.repeat(20_000) })
await check('/api/telegram/webhook', [401, 503], { method: 'POST', body: '{}' })
console.log(JSON.stringify({ base, passed: results.length, results }, null, 2))
