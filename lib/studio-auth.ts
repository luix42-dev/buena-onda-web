import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function isStudioAuthorized(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim()
  const adminCookie = request.cookies.get('bo_admin')?.value

  if (adminPassword && adminCookie === adminPassword) return true

  const allowedEmail = process.env.STUDIO_ALLOWED_EMAIL?.trim().toLowerCase()
  if (!allowedEmail) {
    return !adminPassword
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email?.trim().toLowerCase()
    return !!user && email === allowedEmail
  } catch {
    return false
  }
}

export function unauthorizedStudioResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
