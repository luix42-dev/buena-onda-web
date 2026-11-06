import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { validateTestOrigin, createTestContext, testHeadRequest } = require('../docs/cruise/mobile-20261105/preview-access.cjs')
const preview = 'https://buena-onda-6b1ajiqm2-luis-manjarres-projects.vercel.app'
const hostname = new URL(preview).hostname
const fixtureSecret = 'unit-test-bypass-not-a-real-credential'
const validCookies = [{ name: '_vercel_jwt', domain: hostname, secure: true, httpOnly: true }]

async function withSecret(run: () => Promise<void>, value: string | undefined = fixtureSecret) {
  const before = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  if (value === undefined) delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  else process.env.VERCEL_AUTOMATION_BYPASS_SECRET = value
  try { await run() } finally {
    if (before === undefined) delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    else process.env.VERCEL_AUTOMATION_BYPASS_SECRET = before
  }
}

function browserMock({ cookies = validCookies, statuses = [200, 200], error, errorAt = 1 }: {
  cookies?: typeof validCookies; statuses?: number[]; error?: Error; errorAt?: number
} = {}) {
  const calls: { url: string; options: Record<string, any> }[] = []
  const optionsSeen: Record<string, any>[] = []
  let closed = false
  const context = {
    request: { get: async (url: string, options: Record<string, any>) => {
      calls.push({ url, options })
      if (error && calls.length === errorAt) throw error
      return { status: () => statuses[calls.length - 1] }
    } },
    cookies: async () => cookies,
    close: async () => { closed = true },
  }
  return { context, calls, optionsSeen, closed: () => closed,
    newContext: async (options: Record<string, any>) => { optionsSeen.push(options); return context } }
}

test('preview credentials are limited to reviewed exact origins, never hostname lookalikes', () => {
  assert.equal(validateTestOrigin(`${preview}/`).origin, preview)
  assert.equal(validateTestOrigin('https://www.buenaondalifestyle.com').preview, false)
  assert.equal(validateTestOrigin('http://localhost:3071').preview, false)
  for (const bad of [
    'https://attacker-vercel.app.example.test',
    'https://attacker.vercel.app',
    'https://buena-onda-unknown-luis-manjarres-projects.vercel.app',
    `${preview}.example.test`,
    `${preview}:8443`,
    preview.replace('https:', 'http:'),
    preview.replace('https://', 'https://user:password@'),
    `${preview}/api`, `${preview}/..`, `${preview}?to=vercel.app`, `${preview}#fragment`,
    ` ${preview}`, 'https://www.buenaondalifestyle.com.example.test',
  ]) assert.throws(() => validateTestOrigin(bad), bad)
})

test('browser bootstrap sends secret once without redirects, then verifies cookie-only access', async () => {
  await withSecret(async () => {
    const browser = browserMock({ statuses: [307, 200] })
    const options = { viewport: { width: 390, height: 844 } }
    assert.equal(await createTestContext(browser, preview, options), browser.context)
    assert.deepEqual(browser.optionsSeen, [options])
    assert.equal(browser.calls.length, 2)
    assert(browser.calls.every(call => call.url === preview && call.options.maxRedirects === 0))
    assert.deepEqual(browser.calls[0].options.headers, {
      'x-vercel-protection-bypass': fixtureSecret, 'x-vercel-set-bypass-cookie': 'true',
    })
    assert.equal(browser.calls[1].options.headers, undefined)
    assert.equal(browser.closed(), false)
  })
})

test('browser refuses broad, script-readable, insecure or absent authentication cookies', async () => {
  await withSecret(async () => {
    for (const cookies of [[], [{ ...validCookies[0], domain: '.vercel.app' }],
      [{ ...validCookies[0], domain: `.${hostname}` }], [{ ...validCookies[0], secure: false }],
      [{ ...validCookies[0], httpOnly: false }]]) {
      const browser = browserMock({ cookies })
      await assert.rejects(createTestContext(browser, preview), /Preview authentication failed/)
      assert.equal(browser.closed(), true)
      assert.equal(browser.calls.length, 1)
    }
  })
})

test('a cookie plus an SSO redirect does not count as authenticated preview access', async () => {
  await withSecret(async () => {
    const browser = browserMock({ statuses: [302, 302] })
    await assert.rejects(createTestContext(browser, preview), /Preview authentication failed/)
    assert.equal(browser.closed(), true)
    assert.equal(browser.calls[1].options.maxRedirects, 0)
    assert.equal(browser.calls[1].options.headers, undefined)
  })
})

test('browser rejects global bypass headers and untrusted origins before creating a context', async () => {
  await withSecret(async () => {
    const browser = browserMock()
    await assert.rejects(createTestContext(browser, preview, {
      extraHTTPHeaders: { 'X-Vercel-Protection-Bypass': fixtureSecret },
    }), /browser-wide headers/)
    await assert.rejects(createTestContext(browser, 'https://other.vercel.app'))
    assert.equal(browser.optionsSeen.length, 0)
    assert.equal(browser.calls.length, 0)
  })
})

test('browser failure discards request error logs that could contain credentials', async () => {
  await withSecret(async () => {
    for (const errorAt of [1, 2]) {
      const browser = browserMock({ error: new Error(`Request headers: ${fixtureSecret}`), errorAt })
      await assert.rejects(createTestContext(browser, preview), (error: Error) => {
        assert(!error.message.includes(fixtureSecret))
        return /Preview authentication failed/.test(error.message)
      })
      assert.equal(browser.closed(), true)
    }
  })
})

test('production and local browser checks never receive preview credential headers', async () => {
  await withSecret(async () => {
    for (const origin of ['https://www.buenaondalifestyle.com', 'http://127.0.0.1:3071']) {
      const browser = browserMock()
      await createTestContext(browser, origin, { viewport: { width: 390, height: 844 } })
      assert.equal(browser.calls.length, 0)
      assert.equal(browser.optionsSeen[0].extraHTTPHeaders, undefined)
    }
  })
})

test('HTTP checks keep manual redirects and never forward a credential to another origin', async () => {
  await withSecret(async () => {
    const calls: { url: string; options: RequestInit }[] = []
    const fetchMock = async (url: string, options: RequestInit) => {
      calls.push({ url, options })
      return new Response(null, { status: 302, headers: { Location: 'https://example.test/' } })
    }
    await testHeadRequest(preview, '/radio?fallback=1', fetchMock)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, `${preview}/radio?fallback=1`)
    assert.equal(calls[0].options.method, 'HEAD')
    assert.equal(calls[0].options.redirect, 'manual')
    assert.deepEqual(calls[0].options.headers, { 'x-vercel-protection-bypass': fixtureSecret })
    await testHeadRequest('https://www.buenaondalifestyle.com', '/', fetchMock)
    assert.deepEqual(calls[1].options.headers, {})
    for (const path of ['//attacker.vercel.app/', '/\\attacker.vercel.app/', 'https://attacker.vercel.app/']) {
      await assert.rejects(testHeadRequest(preview, path, fetchMock), /validated test origin/)
    }
    await assert.rejects(testHeadRequest('https://attacker.vercel.app', '/', fetchMock))
    assert.equal(calls.length, 2)
    await assert.rejects(testHeadRequest(preview, '/', async () => { throw new Error(fixtureSecret) }), (error: Error) => {
      assert(!error.message.includes(fixtureSecret))
      return /HTTP verification request failed/.test(error.message)
    })
  })
})

test('protected preview checks fail closed when the bypass secret is missing', async () => {
  const saved = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  try {
    const browser = browserMock()
    await assert.rejects(createTestContext(browser, preview), /is required/)
    assert.equal(browser.optionsSeen.length, 0)
    await assert.rejects(testHeadRequest(preview, '/', async () => { throw new Error('Must not fetch') }), /is required/)
  } finally {
    if (saved !== undefined) process.env.VERCEL_AUTOMATION_BYPASS_SECRET = saved
  }
})
