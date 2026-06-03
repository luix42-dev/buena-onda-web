export const runtime = 'edge'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /studio/logout
 * Clears the studio session and redirects to the studio login screen.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(`${request.nextUrl.origin}/studio/login`, { status: 303 })
  response.cookies.set('studio_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
