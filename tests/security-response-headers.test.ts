import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match'

async function configuredHeaders(path: string) {
  const { default: config } = await import('../next.config.mjs')
  assert.ok(config.headers, 'Security headers must be configured')
  const result = new Headers()
  for (const rule of await config.headers()) {
    if (getPathMatch(rule.source)(path)) {
      for (const header of rule.headers) result.set(header.key, header.value)
    }
  }
  return { headers: result, config }
}

test('effective header rules prevent MIME sniffing and hostile framing while allowing the Cast receiver', async () => {
  for (const path of ['/', '/cruise', '/cruise/receiver', '/drive', '/api/radio/tracks']) {
    const { headers, config } = await configuredHeaders(path)
    assert.equal(config.poweredByHeader, false)
    assert.equal(headers.get('x-content-type-options'), 'nosniff')
    const hsts = headers.get('strict-transport-security') || ''
    assert.ok(Number(/max-age=(\d+)/.exec(hsts)?.[1]) >= 31_536_000)
    const directives = new Map((headers.get('content-security-policy') || '').split(';').map(value => {
      const [name, ...sources] = value.trim().split(/\s+/)
      return [name, sources] as const
    }))
    assert.deepEqual(directives.get('frame-ancestors'), ["'self'"])
    assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN')
    assert.deepEqual(directives.get('object-src'), ["'none'"])
    assert.deepEqual(directives.get('base-uri'), ["'self'"])
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  }
})

test('root and nested private routes cannot be cached by a shared intermediary', async () => {
  for (const path of ['/studio', '/studio/login', '/studio/orders', '/api/admin', '/api/admin/items', '/api/studio', '/api/studio/orders']) {
    const { headers } = await configuredHeaders(path)
    const cache = headers.get('cache-control') || ''
    assert.match(cache, /\bprivate\b/, path)
    assert.match(cache, /\bno-store\b/, path)
  }
  for (const path of ['/', '/cruise', '/studio-public', '/api/admin-public']) {
    assert.doesNotMatch((await configuredHeaders(path)).headers.get('cache-control') || '', /\bprivate\b/, path)
  }
})
