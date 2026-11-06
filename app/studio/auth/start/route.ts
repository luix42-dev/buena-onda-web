export const runtime = 'edge'
import { NextResponse, type NextRequest } from 'next/server'
import { createStudioSession, isStudioSameOrigin, STUDIO_COOKIE, STUDIO_SESSION_SECONDS, timingSafeEqualString } from '@/lib/studio-auth'
import { clientIp, createRateLimiter } from '@/lib/cruise/rate-limit'

// Defense in depth per server instance; production also needs an edge/WAF limit.
const loginAttempts = createRateLimiter({ capacity: 10, refillPerMinute: 1 })

async function readLoginBody(request: NextRequest) {
  const reader = request.body?.getReader()
  if (!reader) throw new Error('Missing body')
  const decoder = new TextDecoder()
  let length = 0, text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > 4096) { await reader.cancel(); throw new Error('Body too large') }
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } finally { reader.releaseLock() }
}

/**
 * POST /studio/auth/start
 * Body: { password: string, from?: string }
 */
export async function POST(request: NextRequest) {
  if (!isStudioSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 })
  if (!loginAttempts.take(clientIp(request.headers))) {
    return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, {
      status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
    })
  }
  let password = ''
  let from = '/studio'

  try {
    const body = await readLoginBody(request)
    if (typeof body?.password === 'string') password = body.password
    if (typeof body?.from === 'string' && (body.from === '/studio' || body.from.startsWith('/studio/'))) {
      from = body.from
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const expected = process.env.STUDIO_PASSWORD?.trim()
  if (!expected) {
    console.warn('[studio/auth/start] STUDIO_PASSWORD is unset')
    return NextResponse.json({ error: 'Studio password is not configured' }, { status: 503 })
  }

  if (!timingSafeEqualString(password, expected)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true, redirectTo: from }, { headers: { 'Cache-Control': 'no-store' } })
  response.cookies.set(STUDIO_COOKIE, await createStudioSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STUDIO_SESSION_SECONDS,
  })

  return response
}
