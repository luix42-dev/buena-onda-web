import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfillCheckoutSession, fulfillElementsPaymentIntent, type FulfillOrderResult } from '@/lib/order-fulfillment'
import { getStripe } from '@/lib/stripe'
import { reconcileHold } from '@/lib/checkout-holds'
import { stripeHoldApi, supabaseHoldStore } from '@/lib/checkout-holds-adapters'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'

function isPaid(session: Stripe.Checkout.Session) {
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
}

function isElementsIntent(paymentIntent: Stripe.PaymentIntent) {
  return paymentIntent.metadata?.checkout_surface === 'terminal_elements'
}

/** Close the order and give the item back if nothing else can still pay for it. */
async function releaseForDeadOrder(stripeSessionId: string, status: 'canceled' | 'failed', stripe: Stripe) {
  const supabase = createServiceRoleClient()
  const { data: order } = await supabase
    .from('orders')
    .update({ status })
    .eq('stripe_session_id', stripeSessionId)
    .eq('status', 'pending')
    .select('item_id')
    .maybeSingle()

  const itemId =
    order?.item_id ??
    (await supabase.from('orders').select('item_id').eq('stripe_session_id', stripeSessionId).maybeSingle()).data?.item_id
  if (!itemId) return null

  return reconcileHold(supabaseHoldStore(supabase), stripeHoldApi(stripe), itemId)
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is required' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  const rawBody = await request.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  let sourceId = ''
  let fulfillment: FulfillOrderResult | null = null

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session
        sourceId = session.id
        // An async payment method completes the session before money moves;
        // the hold stays in place until async_payment_succeeded/failed.
        if (!isPaid(session)) return NextResponse.json({ received: true, awaiting_payment: true })
        fulfillment = await fulfillCheckoutSession(session)
        break
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session
        const verdict = await releaseForDeadOrder(
          session.id,
          event.type === 'checkout.session.expired' ? 'canceled' : 'failed',
          stripe,
        )
        return NextResponse.json({ received: true, hold: verdict?.action ?? 'none' })
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // Hosted Checkout payment intents are fulfilled through their session.
        if (!isElementsIntent(paymentIntent)) return NextResponse.json({ received: true })
        sourceId = paymentIntent.id
        fulfillment = await fulfillElementsPaymentIntent(paymentIntent)
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        if (!isElementsIntent(paymentIntent)) return NextResponse.json({ received: true })
        const verdict = await releaseForDeadOrder(`elements_${paymentIntent.id}`, 'canceled', stripe)
        return NextResponse.json({ received: true, hold: verdict?.action ?? 'none' })
      }

      default:
        return NextResponse.json({ received: true })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('order_not_found')) {
      // Delivered before the checkout route stored the order: ask Stripe to
      // retry. The daily reconciliation also picks it up.
      console.warn(`Stripe webhook arrived before order was stored for ${sourceId}`)
      return NextResponse.json({ error: 'Order not stored yet' }, { status: 503 })
    }

    console.error('Stripe webhook fulfillment error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  if (!fulfillment) return NextResponse.json({ received: true })

  if (fulfillment.itemAlreadySold) {
    console.warn(`Stripe event for ${sourceId} completed after item was already sold — refund needed`)
  }

  return NextResponse.json({
    received: true,
    telegram: fulfillment.telegram,
    email: fulfillment.email,
  })
}
