export const runtime = 'edge'
import { NextResponse, type NextRequest } from 'next/server'
import { isStudioSameOrigin, STUDIO_COOKIE } from '@/lib/studio-auth'

/**
 * POST /studio/logout
 * Clears the studio session and redirects to the studio login screen.
 */
export async function POST(request: NextRequest) {
  if (!isStudioSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request refused' }, { status: 403 })
  const response = NextResponse.redirect(`${request.nextUrl.origin}/studio/login`, { status: 303 })
  response.cookies.set(STUDIO_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
