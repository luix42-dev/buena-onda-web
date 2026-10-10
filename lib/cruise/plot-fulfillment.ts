import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const PLOT_CURRENCY = 'usd'
/** Stripe requires expires_at at least 30 minutes out; one extra minute absorbs clock skew. */
export const CLAIM_CHECKOUT_TTL_SECONDS = 31 * 60

export type PlotClaimOutcome = 'applied' | 'duplicate' | 'stale_price' | 'not_claimable' | 'invalid_claim'
  | 'amount_mismatch' | 'currency_mismatch' | 'processing_error'
export type PlotWebhookResult = { status: number; body: Record<string, unknown> }

export const isCruisePlotSession = (session: Pick<Stripe.Checkout.Session, 'metadata'>) => session.metadata?.kind === 'cruise_plot'

/** Postgres SQLSTATE classes that will fail the same way on every retry. */
const PERMANENT_SQLSTATE = /^(22|23|P0001)/

function email(session: Stripe.Checkout.Session) {
  return session.customer_details?.email ?? session.customer_email ?? null
}

async function flagRefund(db: SupabaseClient, session: Stripe.Checkout.Session, reason: PlotClaimOutcome, detail: string) {
  const plot = Number(session.metadata?.plot_number)
  const { error } = await db.rpc('cruise_plot_flag_refund', {
    p_session_id: session.id, p_plot: Number.isInteger(plot) ? plot : null, p_reason: reason,
    p_cents: session.amount_total ?? null, p_currency: session.currency ?? null, p_email: email(session), p_detail: detail.slice(0, 500),
  })
  if (error) throw new Error(`cruise_plot_flag_refund: ${error.message}`)
}

/**
 * Applies a paid Avenue claim/buyout. Called only from the Stripe webhook for paid sessions with
 * metadata.kind === 'cruise_plot'. The RPC is idempotent on the Stripe session id, refuses a
 * stale price (someone else bought the plot first) and records every paid-but-unapplied session
 * in cruise_plot_refunds_needed. Throws only for transient failures (the webhook then returns 500
 * so Stripe retries); permanent problems resolve to an outcome and are acknowledged.
 */
export async function fulfillPlotClaim(session: Stripe.Checkout.Session, db: SupabaseClient = createServiceRoleClient()): Promise<PlotClaimOutcome> {
  const m = session.metadata ?? {}
  const expected = Number(m.expected_cents)
  if ((session.currency ?? '').toLowerCase() !== PLOT_CURRENCY) {
    await flagRefund(db, session, 'currency_mismatch', `currency ${session.currency ?? 'none'} is not ${PLOT_CURRENCY}`)
    return 'currency_mismatch'
  }
  if (!Number.isInteger(expected) || expected <= 0 || session.amount_total !== expected) {
    await flagRefund(db, session, 'amount_mismatch', `amount_total ${session.amount_total ?? 'none'} vs expected ${m.expected_cents ?? 'none'}`)
    return 'amount_mismatch'
  }
  const { data, error } = await db.rpc('cruise_plot_apply_claim', {
    p_session_id: session.id,
    p_plot: Number(m.plot_number),
    p_paid_cents: expected,
    p_prior_value_cents: Number(m.prior_value_cents ?? 0),
    p_owner_name: m.owner_name ?? '', p_owner_tagline: m.owner_tagline || null, p_owner_url: m.owner_url || null, p_owner_color: m.owner_color || null,
    p_email: email(session),
    p_currency: PLOT_CURRENCY,
  })
  if (error) {
    if (error.code && PERMANENT_SQLSTATE.test(error.code)) {
      await flagRefund(db, session, 'processing_error', `${error.code}: ${error.message}`)
      return 'processing_error'
    }
    throw new Error(`cruise_plot_apply_claim: ${error.message}`)
  }
  return data as PlotClaimOutcome
}

/**
 * Webhook branch for cruise plot sessions. Never calls item/order fulfillment.
 * Paid completion/async success → apply; expiry/async failure/unpaid → acknowledge, no state change.
 */
export async function handleCruisePlotEvent(eventType: string, session: Stripe.Checkout.Session, db?: SupabaseClient): Promise<PlotWebhookResult> {
  if (eventType !== 'checkout.session.completed' && eventType !== 'checkout.session.async_payment_succeeded') {
    return { status: 200, body: { received: true, cruise_plot: 'ignored' } }
  }
  const paid = session.payment_status === 'paid'
  if (!paid) return { status: 200, body: { received: true, awaiting_payment: true, cruise_plot: 'awaiting_payment' } }
  try {
    const result = await fulfillPlotClaim(session, db)
    if (result !== 'applied' && result !== 'duplicate') {
      console.warn(`Cruise plot session ${session.id} not applied (${result}) — refund needed, recorded in cruise_plot_refunds_needed`)
    }
    return { status: 200, body: { received: true, cruise_plot: result } }
  } catch (error) {
    console.error(`Cruise plot fulfillment error for ${session.id}:`, error instanceof Error ? error.message : 'unknown')
    return { status: 500, body: { error: 'Webhook processing failed' } }
  }
}
