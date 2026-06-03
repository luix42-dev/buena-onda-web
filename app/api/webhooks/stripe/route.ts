import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { fulfillOrder } from '@/lib/order-fulfillment'
import { getStripe } from '@/lib/stripe'

export const runtime = 'edge'

function getPaymentIntentId(paymentIntent: Stripe.Checkout.Session['payment_intent']) {
  return typeof paymentIntent === 'string' ? paymentIntent : null
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

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null
  const customerName = session.customer_details?.name ?? null
  const paymentIntentId = getPaymentIntentId(session.payment_intent)
  const amountTotal = session.amount_total ?? 0
  const currency = session.currency ?? 'usd'

  let fulfillment: Awaited<ReturnType<typeof fulfillOrder>>
  try {
    fulfillment = await fulfillOrder({
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      customerEmail,
      customerName,
      amountTotal,
      currency,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('order_not_found')) {
      console.warn(`Stripe webhook completed before order was stored for session ${session.id}`)
      return NextResponse.json({ received: true })
    }

    console.error('Stripe webhook fulfillment error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  if (fulfillment.itemAlreadySold) {
    console.warn(`Stripe session ${session.id} completed after item was already sold`)
  }

  return NextResponse.json({ received: true, telegram: fulfillment.telegram })
}
