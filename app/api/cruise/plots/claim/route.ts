import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'
import { clientIp, createRateLimiter } from '@/lib/cruise/rate-limit'
import { CLAIM_CHECKOUT_TTL_SECONDS, PLOT_CURRENCY } from '@/lib/cruise/plot-fulfillment'
import { MAX_PLOT, cleanOwner, isHousePlot, isSeedPlot, mergePlots, priceCents, KIND_LABEL, type PlotRow } from '@/components/cruise/master/plots'

// Node.js runtime: the Stripe SDK's Node build is the supported path here.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({ plot: z.number().int().min(1).max(MAX_PLOT), expectedCents: z.number().int().positive().max(100_000_000), email: z.string().email().max(254), owner: z.unknown() })
// Best effort per instance (see lib/cruise/rate-limit.ts): 5 checkout starts per IP per minute.
const limiter = createRateLimiter({ capacity: 5, refillPerMinute: 5 })

/**
 * Starts a one-off Stripe Checkout for an open plot (claim) or a claimed plot (buyout).
 * Nothing is written to cruise_plots here; the Stripe webhook is the only writer of ownership,
 * and paid claims land pending a studio content review.
 * Claims stay off until CRUISE_PLOTS_ENABLED=1 is set, so no one can pay before you are ready.
 */
export async function POST(request: NextRequest) {
  if (process.env.CRUISE_PLOTS_ENABLED !== '1' || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Claims are not open yet' }, { status: 503 })
  if (!limiter.take(clientIp(request.headers))) return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429, headers: { 'retry-after': '60' } })
  if (Number(request.headers.get('content-length') ?? 0) > 4_096) return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  let parsed
  try { parsed = Body.safeParse(await request.json()) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!parsed.success) return NextResponse.json({ error: 'Invalid claim' }, { status: 400 })
  const { plot: number, expectedCents, email } = parsed.data
  if (!isSeedPlot(number) || isHousePlot(number)) return NextResponse.json({ error: 'This plot is not for sale' }, { status: 409 })
  const owner = cleanOwner(parsed.data.owner)
  if (!owner) return NextResponse.json({ error: 'Name (2–32 chars), https website and #hex colour only' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data: rows, error } = await db.from('cruise_plots').select('number,status,owner_name,value_cents,visits,clicks,claimed_at,review_state').eq('number', number)
  if (error || !rows?.length) return NextResponse.json({ error: 'Avenue unavailable' }, { status: 503 })
  // Server-authoritative price: a pending or pulled claim is still 'claimed' and priced as a buyout of its value.
  const plot = mergePlots(rows as PlotRow[]).find(p => p.number === number)
  const price = plot ? priceCents(plot) : null
  if (!plot || price === null) return NextResponse.json({ error: 'This plot is not for sale' }, { status: 409 })
  if (price !== expectedCents) return NextResponse.json({ error: 'Price changed', price }, { status: 409 })

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
  const metadata = {
    kind: 'cruise_plot', plot_number: String(plot.number), expected_cents: String(price), prior_value_cents: String(plot.valueCents),
    owner_name: owner.name, owner_tagline: owner.tagline ?? '', owner_url: owner.url ?? '', owner_color: owner.color ?? '',
  }
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      // Short-lived session shrinks the window in which a second buyer can pay a stale price.
      expires_at: Math.floor(Date.now() / 1000) + CLAIM_CHECKOUT_TTL_SECONDS,
      line_items: [{ quantity: 1, price_data: { currency: PLOT_CURRENCY, unit_amount: price, product_data: { name: `Cruise plot #${plot.number} · ${KIND_LABEL[plot.kind]}`, description: `${plot.status === 'claimed' ? 'Buyout' : 'Claim'} on Ocean Drive for “${owner.name}” (shown after content review)` } } }],
      success_url: `${site}/cruise/miami-test?avenue=1&claimed=${plot.number}`,
      cancel_url: `${site}/cruise/miami-test?avenue=1`,
      metadata,
      payment_intent_data: { metadata: { kind: 'cruise_plot', plot_number: String(plot.number) } },
    })
    return NextResponse.json({ checkoutUrl: session.url })
  } catch (e) {
    console.error('[cruise/claim] Stripe checkout create failed:', e instanceof Error ? e.message : 'unknown')
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 })
  }
}
