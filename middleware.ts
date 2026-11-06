import { NextResponse, type NextRequest } from 'next/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Deployment-scoped comparison mode: browsing and radio reads only.
  // Never collect demo impressions or expose checkout/admin writes in a preview.
  if (process.env.CRUISE_COMPARISON_PREVIEW === '1') {
    if (!['GET', 'HEAD'].includes(request.method)) return NextResponse.json({ error: 'Read-only Cruise comparison' }, { status: 403 })
    if (pathname.startsWith('/api/') && pathname !== '/api/radio/tracks') return NextResponse.json({ error: 'Unavailable in comparison preview' }, { status: 403 })
    if (pathname === '/studio' || pathname.startsWith('/studio/')) return new NextResponse(null, { status: 404 })
  }
  if (['/studio/login', '/studio/auth/start', '/studio/logout'].includes(pathname)) return NextResponse.next()
  const protectedApi = pathname === '/api/studio' || pathname.startsWith('/api/studio/') || pathname === '/api/admin' || pathname.startsWith('/api/admin/')
  const protectedPage = pathname === '/studio' || pathname.startsWith('/studio/')
  if (!protectedApi && !protectedPage) return NextResponse.next()
  if (await isStudioAuthorized(request)) return NextResponse.next()
  if (protectedApi) return unauthorizedStudioResponse()
  const url = request.nextUrl.clone()
  url.pathname = '/studio/login'; url.search = ''; url.searchParams.set('from', pathname)
  const response = NextResponse.redirect(url)
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  return response
}

export const config = { matcher: ['/studio/:path*', '/api/studio/:path*', '/api/admin/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'] }
