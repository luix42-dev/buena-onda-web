import { NextResponse, type NextRequest } from 'next/server'
import { reconcileCheckouts } from '@/lib/checkout-reconcile'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'
import { hasStudioAccess, studioCookieName, unauthorizedStudioResponse } from '@/lib/studio-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Studio "Reconcile now": same verified, conditional recovery as the daily cron.
export async function POST(request: NextRequest) {
  if (!hasStudioAccess(request.cookies.get(studioCookieName())?.value)) {
    return unauthorizedStudioResponse()
  }

  try {
    const report = await reconcileCheckouts(createServiceRoleClient(), getStripe(), Date.now(), 'studio')
    return NextResponse.json(report)
  } catch (error) {
    console.error('[admin/checkout/reconcile] failed:', error)
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
