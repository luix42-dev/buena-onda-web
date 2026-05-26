import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareSupabase } from '@/lib/supabase/middleware'

const ADMIN_COOKIE     = 'bo_admin'
const ADMIN_LOGIN_PATH = '/admin/login'
const STUDIO_LOGIN     = '/studio/login'

function isStudioPublic(pathname: string): boolean {
  return (
    pathname === STUDIO_LOGIN ||
    pathname.startsWith('/studio/auth/') ||
    pathname === '/studio/logout'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Studio guard — Supabase Auth + email allowlist ───────────────────
  if (pathname.startsWith('/studio')) {
    if (isStudioPublic(pathname)) return NextResponse.next()

    const { supabase, response } = createMiddlewareSupabase(request)
    const { data: { user } } = await supabase.auth.getUser()

    const allowed = process.env.STUDIO_ALLOWED_EMAIL?.trim().toLowerCase()
    const userEmail = user?.email?.trim().toLowerCase()
    const ok = !!user && !!allowed && userEmail === allowed

    if (!ok) {
      const url = request.nextUrl.clone()
      url.pathname = STUDIO_LOGIN
      url.search   = ''
      url.searchParams.set('from', pathname)
      return NextResponse.redirect(url)
    }
    return response
  }

  // ── Existing /admin guard — cookie + ADMIN_PASSWORD (unchanged) ──────
  if (!pathname.startsWith('/admin') || pathname === ADMIN_LOGIN_PATH) {
    return NextResponse.next()
  }

  const token    = request.cookies.get(ADMIN_COOKIE)?.value
  const expected = process.env.ADMIN_PASSWORD

  // If no password configured, allow through (dev mode)
  if (!expected) return NextResponse.next()

  if (token !== expected) {
    const url = request.nextUrl.clone()
    url.pathname = ADMIN_LOGIN_PATH
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/studio/:path*'],
}
