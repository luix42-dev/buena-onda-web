const PREVIEW_HOSTS = new Set([
  'buena-onda-asrl32fac-luis-manjarres-projects.vercel.app',
  'buena-onda-d8ll9booe-luis-manjarres-projects.vercel.app',
  'buena-onda-eanogeb05-luis-manjarres-projects.vercel.app',
  'buena-onda-ibnbzrp7s-luis-manjarres-projects.vercel.app',
  'buena-onda-6b1ajiqm2-luis-manjarres-projects.vercel.app',
])
const PRODUCTION_HOSTS = new Set(['www.buenaondalifestyle.com', 'buenaondalifestyle.com'])
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const BYPASS_HEADER = 'x-vercel-protection-bypass'

// Add a preview hostname only after verifying its deployment belongs to the
// Buena Onda Vercel project. A shared hostname suffix is not proof of ownership.
function validateTestOrigin(base) {
  let url
  try { url = new URL(base) } catch { throw new Error('Expected a trusted test origin') }
  if (typeof base !== 'string' || ![url.origin, `${url.origin}/`].includes(base) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Expected a plain origin without credentials, path, query or fragment')
  }
  const preview = PREVIEW_HOSTS.has(url.hostname)
  const production = PRODUCTION_HOSTS.has(url.hostname)
  const local = LOOPBACK_HOSTS.has(url.hostname)
  if ((preview || production) && (url.protocol !== 'https:' || url.port)) {
    throw new Error('Hosted tests require HTTPS on the default port')
  }
  if ((!preview && !production && !local) || (local && !['http:', 'https:'].includes(url.protocol))) {
    throw new Error('Test origin is not in the reviewed hostname allowlist')
  }
  return { origin: url.origin, hostname: url.hostname, preview }
}

function previewHeaders(target) {
  if (!target.preview) return {}
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  if (!secret) throw new Error('VERCEL_AUTOMATION_BYPASS_SECRET is required for a protected preview')
  return { [BYPASS_HEADER]: secret }
}

async function createTestContext(browser, base, options = {}) {
  const target = validateTestOrigin(base)
  if (Object.keys(options.extraHTTPHeaders ?? {}).some(name =>
    [BYPASS_HEADER, 'x-vercel-set-bypass-cookie'].includes(name.toLowerCase()))) {
    throw new Error('Preview credentials must not be configured as browser-wide headers')
  }
  const headers = previewHeaders(target)
  const context = await browser.newContext(options)
  if (!target.preview) return context
  try {
    // Shared context cookies establish browser access. This request never follows
    // redirects, and neither browser resources nor the verification GET get a secret header.
    const response = await context.request.get(target.origin, {
      headers: { ...headers, 'x-vercel-set-bypass-cookie': 'true' },
      maxRedirects: 0,
      timeout: 30_000,
    })
    const cookies = await context.cookies()
    if (![200, 301, 302, 303, 307, 308].includes(response.status()) || !cookies.length ||
        cookies.some(cookie => cookie.domain !== target.hostname || !cookie.secure || !cookie.httpOnly)) {
      throw new Error('Invalid preview authentication cookie')
    }
    const verification = await context.request.get(target.origin, { maxRedirects: 0, timeout: 30_000 })
    if (verification.status() !== 200) throw new Error('Cookie-only preview access failed')
    return context
  } catch {
    await context.close().catch(() => undefined)
    // Playwright errors can include request headers. Never propagate those logs.
    throw new Error('Preview authentication failed; verify the allowlisted deployment and current bypass secret')
  }
}

async function testHeadRequest(base, path, fetchImpl = globalThis.fetch) {
  const target = validateTestOrigin(base)
  const url = new URL(path, target.origin)
  if (!path.startsWith('/') || path.startsWith('//') || url.origin !== target.origin) {
    throw new Error('HTTP check path must remain on the validated test origin')
  }
  const headers = previewHeaders(target)
  try {
    return await fetchImpl(url.href, {
      method: 'HEAD', redirect: 'manual', headers, signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new Error('HTTP verification request failed; request diagnostics were omitted to protect credentials')
  }
}

module.exports = { validateTestOrigin, createTestContext, testHeadRequest }
