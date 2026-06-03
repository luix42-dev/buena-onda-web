import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendTelegramMessage } from '@/lib/telegram'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'

export const runtime = 'edge'

const CompleteSchema = z.object({
  orderId: z.string().uuid(),
  paymentIntentId: z.string().min(1),
  email: z.string().email().optional(),
})

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

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

  const { orderId, paymentIntentId, email } = parsed.data
  const stripe = getStripe()
  const supabase = createServiceRoleClient()
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

  if (paymentIntent.status !== 'succeeded') {
    return NextResponse.json({ error: 'PAYMENT_NOT_CONFIRMED' }, { status: 409 })
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, item_id, amount_total, currency, status, stripe_payment_intent_id, item:items(id, title, availability)')
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

  if (order.status !== 'paid') {
    const { error: itemError } = await supabase
      .from('items')
      .update({ availability: 'sold' })
      .eq('id', order.item_id)
      .in('availability', ['available', 'reserved'])

    if (itemError) {
      return NextResponse.json({ error: 'Could not mark item sold' }, { status: 500 })
    }

    const { error: paidError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        customer_email: email ?? paymentIntent.receipt_email ?? null,
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq('id', order.id)

    if (paidError) {
      return NextResponse.json({ error: 'Could not mark order paid' }, { status: 500 })
    }
  }

  const amountText = formatAmount(order.amount_total, order.currency)
  const telegram = await sendTelegramMessage(`Order confirmed: ${item.title} - ${amountText}`)

  return NextResponse.json({
    orderId: order.id,
    itemId: order.item_id,
    availability: 'sold',
    telegram,
  })
}
