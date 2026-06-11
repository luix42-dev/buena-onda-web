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
