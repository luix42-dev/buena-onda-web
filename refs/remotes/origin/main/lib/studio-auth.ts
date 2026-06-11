import { NextResponse, type NextRequest } from 'next/server'

const STUDIO_COOKIE = 'studio_session'

export function isStudioAuthorized(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim()
  const adminCookie = request.cookies.get('bo_admin')?.value

  if (adminPassword && adminCookie === adminPassword) return true

  const studioPassword = process.env.STUDIO_PASSWORD?.trim()
  const studioCookie = request.cookies.get(STUDIO_COOKIE)?.value

  if (!studioPassword) return !adminPassword

  return studioCookie === studioPassword
}

export function unauthorizedStudioResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
