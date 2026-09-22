import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfillOrder } from '@/lib/order-fulfillment'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

function getPaymentIntentId(paymentIntent: Stripe.Checkout.Session['payment_intent']) {
  return typeof paymentIntent === 'string' ? paymentIntent : null
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null
  const customerName = session.customer_details?.name ?? null
  const paymentIntentId = getPaymentIntentId(session.payment_intent)
  const amountTotal = session.amount_total ?? 0
  const currency = session.currency ?? 'usd'

  return fulfillOrder({
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    customerEmail,
    customerName,
    amountTotal,
    currency,
  })
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  return fulfillOrder({
    stripeSessionId: `elements_${paymentIntent.id}`,
    stripePaymentIntentId: paymentIntent.id,
    customerEmail: paymentIntent.receipt_email ?? null,
    customerName: null,
    amountTotal: paymentIntent.amount,
    currency: paymentIntent.currency,
  })
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

  if (event.type === 'checkout.session.expired') {
    // Nothing to release: the checkout route no longer reserves inventory
    // before redirecting to Stripe, so an expired session has no side effects.
    return NextResponse.json({ received: true })
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true })
  }

  const sourceId =
    event.type === 'checkout.session.completed'
      ? (event.data.object as Stripe.Checkout.Session).id
      : (event.data.object as Stripe.PaymentIntent).id

  let fulfillment: Awaited<ReturnType<typeof fulfillOrder>>
  try {
    fulfillment =
      event.type === 'checkout.session.completed'
        ? await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        : await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('order_not_found')) {
      console.warn(`Stripe webhook completed before order was stored for ${sourceId}`)
      return NextResponse.json({ received: true })
    }

    console.error('Stripe webhook fulfillment error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  if (fulfillment.itemAlreadySold) {
    console.warn(`Stripe event for ${sourceId} completed after item was already sold`)
  }

  return NextResponse.json({
    received: true,
    telegram: fulfillment.telegram,
    email: fulfillment.email,
  })
}
