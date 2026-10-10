import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { SEED_PLOTS, mergePlots, type PlotEvent, type PlotRow } from '@/components/cruise/master/plots'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Public read of the Avenue. Falls back to the geometry seed if the table is not set up yet.
 * Reads every row (not only approved ones) so a claim awaiting review, or a pulled sign, still
 * shows as claimed — with its owner content withheld — and is never offered at the floor price.
 * owner_email and Stripe session ids are never selected here.
 */
export async function GET() {
  try {
    const db = createServiceRoleClient()
    const [{ data: rows, error }, { data: events, error: eventsError }] = await Promise.all([
      db.from('cruise_plots').select('number,status,owner_name,owner_tagline,owner_url,owner_color,value_cents,visits,clicks,claimed_at,review_state'),
      db.from('cruise_plot_events').select('plot,type,name,cents,at,name_approved').order('at', { ascending: false }).limit(12),
    ])
    if (error) throw error
    const safeEvents: PlotEvent[] = eventsError ? [] : (events ?? []).map(e => ({
      plot: e.plot, type: e.type, cents: e.cents, at: e.at,
      name: e.name_approved ? e.name : 'a new owner (in review)',
    }))
    return NextResponse.json({ plots: mergePlots((rows ?? []) as PlotRow[]), events: safeEvents, live: true }, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=120' } })
  } catch {
    return NextResponse.json({ plots: SEED_PLOTS, events: [], live: false })
  }
}
