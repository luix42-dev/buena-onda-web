import { NextResponse, type NextRequest } from 'next/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (['/studio/login', '/studio/auth/start', '/studio/logout'].includes(pathname)) return NextResponse.next()
  const protectedApi = pathname === '/api/studio' || pathname.startsWith('/api/studio/') || pathname === '/api/admin' || pathname.startsWith('/api/admin/')
  const protectedPage = pathname === '/studio' || pathname.startsWith('/studio/')
  if (!protectedApi && !protectedPage) return NextResponse.next()
  if (await isStudioAuthorized(request)) return NextResponse.next()
  if (protectedApi) return unauthorizedStudioResponse()
  const url = request.nextUrl.clone()
  url.pathname = '/studio/login'; url.search = ''; url.searchParams.set('from', pathname)
  return NextResponse.redirect(url)
}

export const config = { matcher: ['/studio/:path*', '/api/studio/:path*', '/api/admin/:path*'] }
