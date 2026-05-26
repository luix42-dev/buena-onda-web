import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /studio/auth/start
 * Body: { email: string }
 *
 * Always returns { ok: true } so callers can't enumerate the allowed email.
 * Only sends a magic-link OTP when the submitted email matches
 * STUDIO_ALLOWED_EMAIL exactly (case-insensitive trim).
 */
export async function POST(request: NextRequest) {
  const ok = NextResponse.json({ ok: true })

  let email = ''
  try {
    const body = await request.json()
    if (typeof body?.email === 'string') email = body.email.trim().toLowerCase()
  } catch {
    return ok
  }

  if (!email || !email.includes('@')) return ok

  const allowed = process.env.STUDIO_ALLOWED_EMAIL?.trim().toLowerCase()
  if (!allowed) {
    console.warn('[studio/auth/start] STUDIO_ALLOWED_EMAIL is unset — all sign-ins are silently rejected')
    return ok
  }
  if (email !== allowed) return ok

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${request.nextUrl.origin}/studio/auth/callback`,
    },
  })
  if (error) {
    console.error('[studio/auth/start] OTP send failed:', error.message)
  }
  return ok
}
