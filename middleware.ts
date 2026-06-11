import { NextResponse, type NextRequest } from 'next/server'

const STUDIO_LOGIN     = '/studio/login'
const STUDIO_COOKIE    = 'studio_session'

function isStudioPublic(pathname: string): boolean {
  return (
    pathname === STUDIO_LOGIN ||
    pathname === '/studio/auth/start' ||
    pathname === '/studio/logout'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Studio guard — password session cookie ───────────────────────────
  if (pathname.startsWith('/studio')) {
    if (isStudioPublic(pathname)) return NextResponse.next()

    const expected = process.env.STUDIO_PASSWORD?.trim()
    const token = request.cookies.get(STUDIO_COOKIE)?.value
    const ok = expected ? token === expected : true

    if (!ok) {
      const url = request.nextUrl.clone()
      url.pathname = STUDIO_LOGIN
      url.search   = ''
      url.searchParams.set('from', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/studio/:path*'],
}
