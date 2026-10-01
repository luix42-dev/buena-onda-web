import { NextRequest, NextResponse } from 'next/server'
import { reconcileCheckouts } from '@/lib/checkout-reconcile'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Recover missed verified payments and inspect legacy reservations only.
// New checkouts never reserve inventory. Vercel Cron supplies CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await reconcileCheckouts(createServiceRoleClient(), getStripe())
    console.log('[reconcile-checkouts]', JSON.stringify(report))
    return NextResponse.json(report)
  } catch (error) {
    console.error('[reconcile-checkouts] failed:', error)
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
