import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * Build a Supabase client bound to the incoming request's cookies, and a
 * companion response that the caller can return so any session refresh
 * cookies are written back. Pattern follows the official @supabase/ssr
 * Next.js middleware recipe.
 *
 * Usage:
 *   const { supabase, response } = createMiddlewareSupabase(request)
 *   const { data: { user } } = await supabase.auth.getUser()
 *   if (!user) return NextResponse.redirect(...)
 *   return response
 */
export function createMiddlewareSupabase(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next()
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, response }
}
