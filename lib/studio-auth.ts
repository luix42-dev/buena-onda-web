import { NextResponse, type NextRequest } from 'next/server'

const STUDIO_COOKIE = 'studio_session'

export function isStudioAuthorized(request: NextRequest) {
  const studioPassword = process.env.STUDIO_PASSWORD?.trim()
  const studioCookie = request.cookies.get(STUDIO_COOKIE)?.value

  if (!studioPassword) return true

  return studioCookie === studioPassword
}

export function unauthorizedStudioResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Stricter gate for screens and actions that expose customer data or change
 * orders: unlike isStudioAuthorized, a missing STUDIO_PASSWORD in production
 * denies access instead of opening the studio.
 */
export function hasStudioAccess(cookieValue: string | undefined) {
  const studioPassword = process.env.STUDIO_PASSWORD?.trim()
  if (!studioPassword) return process.env.NODE_ENV !== 'production'
  return cookieValue === studioPassword
}

export function studioCookieName() {
  return STUDIO_COOKIE
}
