/**
 * THE AVENUE — every visible surface on the Cruise is a numbered plot.
 * Shared by the client scene, the HUD and the API routes (no browser or server imports here).
 *
 * Economics (Claim Avenue–style, "Build it. Brand it. Defend it."):
 *  - Open plots are claimed at their floor price.
 *  - A claimed plot can be bought out at 1.5x its current value; the value then steps up.
 *  - Visits are drive-bys counted on the street (an anonymous, unverified counter), plus explore clicks.
 *  - New claims and buyouts are held for a content review; until approved the plot shows as
 *    claimed with a neutral "in review" sign and is priced as a buyout (never at the floor).
 *  - 'house' plots belong to the Buena Onda ecosystem and are not for sale.
 * Nothing here is fabricated social proof: seeds are open or house plots only.
 */

export type PlotKind = 'billboard' | 'storefront' | 'banner' | 'sign' | 'lamp' | 'bench'
export type PlotStatus = 'open' | 'claimed' | 'house'
export type PlotOwner = { name: string; tagline?: string; url?: string; color?: string; accent?: string }
export type Plot = {
  number: number
  kind: PlotKind
  /** Street station in metres and side: -1 = ocean side, 1 = shop side. */
  s: number
  side: -1 | 1
  status: PlotStatus
  owner?: PlotOwner
  valueCents: number
  visits: number
  clicks: number
  claimedAt?: string
  /** Claimed, but the owner's content is awaiting review or was pulled: owner content is withheld. */
  pending?: boolean
}
export type PlotEvent = { plot: number; type: 'claimed' | 'bought_out'; name: string; cents: number; at: string }

export const FLOOR_CENTS: Record<PlotKind, number> = {
  billboard: 25_000, storefront: 15_000, banner: 10_000, sign: 7_500, bench: 1_500, lamp: 500,
}
export const KIND_LABEL: Record<PlotKind, string> = {
  billboard: 'Billboard', storefront: 'Storefront', banner: 'Street banner', sign: 'Roadside sign', bench: 'Beach bench', lamp: 'Lamp-post flag',
}
export const BUYOUT_MULTIPLIER = 1.5
export const MAX_PLOT = 30
/** Shown instead of owner content while a claim is awaiting review (or was pulled by an operator). */
export const PENDING_OWNER: PlotOwner = Object.freeze({ name: 'Sign in review', tagline: 'New sign coming soon', color: '#16122b' }) as PlotOwner

export function priceCents(plot: Pick<Plot, 'kind' | 'status' | 'valueCents'>) {
  if (plot.status === 'house') return null
  if (plot.status === 'open') return FLOOR_CENTS[plot.kind]
  return Math.max(FLOOR_CENTS[plot.kind], Math.ceil((plot.valueCents * BUYOUT_MULTIPLIER) / 100) * 100)
}
export const dollars = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: cents % 100 ? 2 : 0 })}`

const LAMP_STATIONS = [16, 43, 70, 97, 124, 151, 178, 205]
/** Plot 10 (ocean-side lamp at s=43) was removed: its post stood in front of billboard #1. The number stays retired. */
const RETIRED_PLOTS = new Set([10])
const house = (owner: PlotOwner, cents: number) => ({ status: 'house' as const, owner, valueCents: cents })

/** Geometry-bound seed. The API overlays ownership/value/visits from the database on top of this. */
export const SEED_PLOTS: Plot[] = [
  { number: 1, kind: 'billboard', s: 56, side: -1, status: 'open', valueCents: 0, visits: 0, clicks: 0 },
  { number: 2, kind: 'storefront', s: 95, side: 1, ...house({ name: 'Buena Onda Record Store', tagline: 'Vinyl · tapes · good vibes', url: '/objects', color: '#2aa79f' }, 0), visits: 0, clicks: 0 },
  { number: 3, kind: 'storefront', s: 155, side: 1, ...house({ name: 'Branches Vintage', tagline: 'Good clothes · brighter days', url: 'https://branchesvintage.com', color: '#f7b2bb' }, 0), visits: 0, clicks: 0 },
  { number: 4, kind: 'banner', s: 62, side: 1, ...house({ name: 'Vice Nights', tagline: 'Friday · music by the ocean', url: '/events', color: '#ff4f9a' }, 0), visits: 0, clicks: 0 },
  { number: 5, kind: 'sign', s: 84, side: 1, ...house({ name: 'Buena Onda Record Store', tagline: '0.3 mi ahead', url: '/objects', color: '#2aa79f' }, 0), visits: 0, clicks: 0 },
  { number: 6, kind: 'sign', s: 144, side: 1, ...house({ name: 'Branches Vintage', tagline: 'On your right', url: 'https://branchesvintage.com', color: '#f7b2bb' }, 0), visits: 0, clicks: 0 },
  ...LAMP_STATIONS.flatMap((s, i) => [1, -1].map((side, j): Plot => (
    { number: 7 + i * 2 + j, kind: 'lamp', s, side: side as -1 | 1, status: 'open', valueCents: 0, visits: 0, clicks: 0 }
  ))).filter(p => !RETIRED_PLOTS.has(p.number)),
  ...LAMP_STATIONS.map((s, i) => ({
    number: 23 + i, kind: 'bench' as const, s: s + 4, side: -1 as const, status: 'open' as const, valueCents: 0, visits: 0, clicks: 0,
  })),
]

export type PlotRow = Partial<Plot & {
  owner_name: string | null; owner_tagline: string | null; owner_url: string | null; owner_color: string | null
  value_cents: number; claimed_at: string | null
  /** 'none' | 'pending' | 'approved' | 'pulled'. Rows without it (legacy) count as approved. */
  review_state: string | null; approved: boolean | null
}>

/** Owner content is public only when the claim has been approved by a studio operator. */
export function isRowApproved(r: Pick<PlotRow, 'review_state' | 'approved'>) {
  if (r.review_state != null) return r.review_state === 'approved'
  return r.approved !== false
}

export function mergePlots(rows: PlotRow[]) {
  const byNumber = new Map(rows.map(r => [Number(r.number), r]))
  return SEED_PLOTS.map(seed => {
    const r = byNumber.get(seed.number); if (!r || seed.status === 'house') return { ...seed, visits: Number(r?.visits ?? seed.visits), clicks: Number(r?.clicks ?? seed.clicks) }
    const claimed = r.status === 'claimed' && !!r.owner_name
    const visible = claimed && isRowApproved(r)
    return {
      ...seed,
      status: claimed ? 'claimed' : 'open',
      owner: visible ? { name: r.owner_name!, tagline: r.owner_tagline ?? undefined, url: r.owner_url ?? undefined, color: r.owner_color ?? undefined } : claimed ? { ...PENDING_OWNER } : undefined,
      ...(claimed && !visible ? { pending: true } : {}),
      valueCents: Number(r.value_cents ?? 0), visits: Number(r.visits ?? 0), clicks: Number(r.clicks ?? 0), claimedAt: r.claimed_at ?? undefined,
    } satisfies Plot
  })
}

export const isSeedPlot = (n: number) => SEED_PLOTS.some(p => p.number === n)
export const isHousePlot = (n: number) => SEED_PLOTS.some(p => p.number === n && p.status === 'house')

/** Validates owner input for claims. Keep in sync with the DB check constraints. */
export function cleanOwner(input: unknown): PlotOwner | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const text = (v: unknown, max: number) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max) : ''
  const name = text(o.name, 32); if (name.length < 2) return null
  const url = text(o.url, 200); if (url && !/^https:\/\/[^\s]+\.[^\s]+$/i.test(url)) return null
  const color = text(o.color, 7); if (color && !/^#[0-9a-f]{6}$/i.test(color)) return null
  return { name, tagline: text(o.tagline, 48) || undefined, url: url || undefined, color: color || undefined }
}

/**
 * Launch phase. Eyes first, ads later.
 *  - 'hidden'  (default): the street is pure Buena Onda. Open plots wear house art, no prices, no ticker,
 *                         no Avenue UI. Drive-bys are still counted silently: that is the audience proof.
 *  - 'preview': the Avenue UI is visible (for sponsor demos); claims stay off server-side.
 *  - 'open'   : full marketplace (also requires CRUISE_PLOTS_ENABLED=1 on the server).
 * Set NEXT_PUBLIC_CRUISE_AVENUE at build time. `?avenue=preview` previews it on any build.
 */
export type AvenuePhase = 'hidden' | 'preview' | 'open'
export function avenuePhase(search = typeof location === 'undefined' ? '' : location.search): AvenuePhase {
  const q = new URLSearchParams(search).get('avenue')
  if (q === 'preview' || q === '1') return 'preview'
  const env = process.env.NEXT_PUBLIC_CRUISE_AVENUE
  return env === 'open' || env === 'preview' ? env : 'hidden'
}
