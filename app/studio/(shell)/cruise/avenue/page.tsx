import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { STUDIO_COOKIE, hasCruiseStudioAccess } from '@/lib/cruise/studio-auth'
import { KIND_LABEL, SEED_PLOTS, dollars, priceCents, mergePlots, type PlotRow } from '@/components/cruise/master/plots'
import AvenueModerationClient, { type ModerationPlot, type ModerationEntry, type RefundEntry } from './AvenueModerationClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DbPlot = {
  number: number; status: string; owner_name: string | null; owner_tagline: string | null; owner_url: string | null; owner_color: string | null
  owner_email: string | null; value_cents: number; visits: number; clicks: number; review_state: string; approved: boolean
  claim_session_id: string | null; claimed_at: string | null; reviewed_at: string | null
}

async function load() {
  const db = createServiceRoleClient()
  const [plots, history, refunds] = await Promise.all([
    db.from('cruise_plots').select('number,status,owner_name,owner_tagline,owner_url,owner_color,owner_email,value_cents,visits,clicks,review_state,approved,claim_session_id,claimed_at,reviewed_at').order('number'),
    db.from('cruise_plot_moderation').select('id,plot,action,actor,reason,claim_session_id,at').order('at', { ascending: false }).limit(100),
    db.from('cruise_plot_refunds_needed').select('stripe_session_id,plot,reason,amount_cents,currency,email,detail,created_at,resolved_at,resolved_by').order('created_at', { ascending: false }).limit(100),
  ])
  const error = plots.error ?? history.error ?? refunds.error
  if (error) throw new Error(error.message)
  const rows = (plots.data ?? []) as DbPlot[]
  const publicView = new Map(mergePlots(rows as unknown as PlotRow[]).map(p => [p.number, p]))
  const list: ModerationPlot[] = rows.map(r => {
    const seed = SEED_PLOTS.find(p => p.number === r.number)
    const pub = publicView.get(r.number)
    const price = pub ? priceCents(pub) : null
    return {
      number: r.number, kind: seed ? KIND_LABEL[seed.kind] : 'Unknown', status: r.status, reviewState: r.review_state, approved: r.approved,
      ownerName: r.owner_name, ownerTagline: r.owner_tagline, ownerUrl: r.owner_url, ownerColor: r.owner_color, ownerEmail: r.owner_email,
      value: dollars(r.value_cents), nextPrice: price === null ? '—' : dollars(price), visits: Number(r.visits), clicks: Number(r.clicks),
      session: r.claim_session_id, claimedAt: r.claimed_at, reviewedAt: r.reviewed_at,
    }
  })
  return { plots: list, history: (history.data ?? []) as ModerationEntry[], refunds: (refunds.data ?? []) as RefundEntry[] }
}

export default async function AvenueModerationPage() {
  // Fails closed even if STUDIO_PASSWORD is unset (middleware.ts would let the request through).
  if (!hasCruiseStudioAccess(cookies().get(STUDIO_COOKIE)?.value)) notFound()
  let data: Awaited<ReturnType<typeof load>>
  try { data = await load() } catch (error) {
    return (
      <div style={{ padding: '2rem', color: '#E8176A', fontFamily: 'monospace' }}>
        <strong>Avenue data unavailable.</strong>
        <pre style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{error instanceof Error ? error.message : 'Unable to load plots'}</pre>
      </div>
    )
  }
  return <AvenueModerationClient {...data} />
}
