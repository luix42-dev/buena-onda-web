export const runtime = 'edge'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /studio/auth/start
 * Body: { password: string, from?: string }
 */
export async function POST(request: NextRequest) {
  let password = ''
  let from = '/studio'

  try {
    const body = await request.json()
    if (typeof body?.password === 'string') password = body.password
    if (typeof body?.from === 'string' && body.from.startsWith('/studio')) {
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

  if (password !== expected) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true, redirectTo: from })
  response.cookies.set('studio_session', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return response
}
