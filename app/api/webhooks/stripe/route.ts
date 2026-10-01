import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfillCheckoutSession, fulfillElementsPaymentIntent, type FulfillOrderResult } from '@/lib/order-fulfillment'
import { getStripe } from '@/lib/stripe'
export const runtime = 'nodejs'

function isPaid(session: Stripe.Checkout.Session) {
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
}

function isElementsIntent(paymentIntent: Stripe.PaymentIntent) {
  return paymentIntent.metadata?.checkout_surface === 'terminal_elements'
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

  if (event.livemode !== (process.env.STRIPE_SECRET_KEY ?? '').includes('_live_')) {
    return NextResponse.json({ error: 'Payment environment mismatch' }, { status: 400 })
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
        // fulfillment waits for async_payment_succeeded.
        if (!isPaid(session)) return NextResponse.json({ received: true, awaiting_payment: true })
        fulfillment = await fulfillCheckoutSession(session, event.id)
        break
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        // No inventory was reserved; expiry/failure cannot release inventory.
        return NextResponse.json({ received: true })
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // Hosted Checkout payment intents are fulfilled through their session.
        if (!isElementsIntent(paymentIntent)) return NextResponse.json({ received: true })
        sourceId = paymentIntent.id
        fulfillment = await fulfillElementsPaymentIntent(paymentIntent, event.id)
        break
      }

      case 'payment_intent.canceled': {
        return NextResponse.json({ received: true })
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
