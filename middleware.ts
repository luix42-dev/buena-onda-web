import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_COOKIE = 'bo_admin'
const LOGIN_PATH   = '/admin/login'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard /admin routes (excluding the login page itself)
  if (!pathname.startsWith('/admin') || pathname === LOGIN_PATH) {
    return NextResponse.next()
  }

  const token    = request.cookies.get(ADMIN_COOKIE)?.value
  const expected = process.env.ADMIN_PASSWORD

  // If no password configured, allow through (dev mode)
  if (!expected) return NextResponse.next()

  if (token !== expected) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
