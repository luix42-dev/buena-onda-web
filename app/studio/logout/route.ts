import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /studio/logout
 * Clears the Supabase session and redirects to the studio login screen.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(`${request.nextUrl.origin}/studio/login`, { status: 303 })
}
