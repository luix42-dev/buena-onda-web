import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'

export const runtime = 'edge'

const CompleteSchema = z.object({
  orderId: z.string().uuid(),
  paymentIntentId: z.string().min(1),
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CompleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { orderId, paymentIntentId } = parsed.data
  const stripe = getStripe()
  const supabase = createServiceRoleClient()
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

  if (paymentIntent.status !== 'succeeded') {
    return NextResponse.json({ error: 'PAYMENT_NOT_CONFIRMED' }, { status: 409 })
  }

  // Read-only: fulfillment (marking the order paid and the item sold) happens
  // exclusively in the Stripe webhook via fulfillOrder(). This endpoint just
  // reports back whatever state the webhook has landed so far.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, item_id, status, item:items(id, title, availability)')
    .eq('id', orderId)
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 })
  }

  const item = Array.isArray(order.item) ? order.item[0] : order.item
  if (!item) {
    return NextResponse.json({ error: 'ITEM_NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({
    orderId: order.id,
    itemId: order.item_id,
    orderStatus: order.status,
    availability: item.availability,
  })
}
