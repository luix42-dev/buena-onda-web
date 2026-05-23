import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /studio/auth/callback?code=...&from=...
 *
 * Exchanges the OTP code for a Supabase session and redirects to the
 * post-login destination. On error redirects back to /studio/login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('from') || '/studio/catalog'

  if (!code) {
    return NextResponse.redirect(`${origin}/studio/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      `${origin}/studio/login?error=${encodeURIComponent(error.message)}`,
    )
  }
  return NextResponse.redirect(`${origin}${next}`)
}
