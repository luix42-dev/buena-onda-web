import { NextResponse, type NextRequest } from 'next/server'

export const STUDIO_COOKIE = 'studio_session'
export const STUDIO_SESSION_SECONDS = 12 * 60 * 60
const encoder = new TextEncoder()

export function timingSafeEqualString(a: string, b: string) {
  const x = encoder.encode(a), y = encoder.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

async function signingKey() {
  const password = process.env.STUDIO_PASSWORD?.trim()
  if (!password) return null
  return crypto.subtle.importKey('raw', encoder.encode(`buena-onda-studio-session-v1:${password}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

/** Edge-compatible signed bearer token; rotating STUDIO_PASSWORD revokes all sessions. */
export async function createStudioSession(now = Date.now()) {
  const key = await signingKey()
  if (!key) throw new Error('Studio password is not configured')
  const issued = Math.floor(now / 1000)
  const payload = `v1.${issued}.${issued + STUDIO_SESSION_SECONDS}.${crypto.randomUUID()}`
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return `${payload}.${Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('')}`
}

export function isStudioAuthorized(request: NextRequest) {
  // SameSite cookies also accompany requests from sibling subdomains. Check the
  // actual origin at the handler boundary, even when middleware is bypassed.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !isStudioSameOrigin(request)) {
    return Promise.resolve(false)
  }
  return hasStudioAccess(request.cookies.get(STUDIO_COOKIE)?.value)
}

export function unauthorizedStudioResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
}

/** Fails closed in every environment; raw password cookies are intentionally invalid. */
export async function hasStudioAccess(cookieValue: string | undefined | null, now = Date.now()) {
  if (!cookieValue || cookieValue.length > 256) return false
  const match = /^(v1\.(\d{10})\.(\d{10})\.[0-9a-f-]{36})\.([0-9a-f]{64})$/.exec(cookieValue)
  if (!match) return false
  const issued = Number(match[2]), expires = Number(match[3]), seconds = Math.floor(now / 1000)
  if (issued > seconds + 60 || expires <= seconds || expires - issued !== STUDIO_SESSION_SECONDS) return false
  const key = await signingKey()
  if (!key) return false
  try {
    const signature = Uint8Array.from(match[4].match(/../g)!, byte => parseInt(byte, 16))
    return await crypto.subtle.verify('HMAC', key, signature, encoder.encode(match[1]))
  } catch { return false }
}

export function studioCookieName() {
  return STUDIO_COOKIE
}

/** Login/logout are browser POSTs; never accept a cross-origin credential action. */
export function isStudioSameOrigin(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    // Next's local server can normalize request.url to localhost while the browser used
    // 127.0.0.1. Host is the browser request authority; do not accept x-forwarded-host.
    const host = request.headers.get('host') || requestUrl.host
    const expected = new URL(`${requestUrl.protocol}//${host}`)
    if (expected.host !== host || expected.username || expected.password) return false
    return new URL(request.headers.get('origin') || '').origin === expected.origin
  }
  catch { return false }
}
