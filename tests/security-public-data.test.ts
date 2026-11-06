import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPublicServiceClient } from '../lib/supabase/public'

test('public event reads use the public database identity and preserve ISR caching', async () => {
  const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://public-data.example.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'private-test-key'
  let requestInit: (RequestInit & { next?: { revalidate?: number } }) | undefined
  globalThis.fetch = async (_input, init) => {
    requestInit = init
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const { error } = await createPublicServiceClient().from('events').select('slug')
    assert.equal(error, null)
    const headers = new Headers(requestInit?.headers)
    assert.equal(headers.get('apikey'), 'public-test-key')
    assert.equal(headers.get('authorization'), 'Bearer public-test-key')
    assert.equal(requestInit?.next?.revalidate, 300)
  } finally {
    globalThis.fetch = originalFetch
    for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key] }
  }
})
