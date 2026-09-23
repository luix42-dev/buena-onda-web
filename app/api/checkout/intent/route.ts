import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'
import { acquireHold, releaseOwnHold } from '@/lib/checkout-holds'
import { stripeHoldApi, supabaseHoldStore } from '@/lib/checkout-holds-adapters'

export const runtime = 'edge'

const QuerySchema = z.object({
  itemId: z.string().uuid(),
})

function formatUnavailable() {
  return NextResponse.json({ error: 'ITEM_UNAVAILABLE' }, { status: 400 })
}

function isDirectPurchaseModel(value: string | null | undefined) {
  return value === 'direct' || value === 'direct_purchase'
}

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse({
    itemId: request.nextUrl.searchParams.get('itemId'),
  })

  if (!parsed.success) {
    return formatUnavailable()
  }

  const supabase = createServiceRoleClient()
  const stripe = getStripe()

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, title, price, status, availability, sourcing_model')
    .eq('id', parsed.data.itemId)
    .single()

  const amount = Math.round(Number(item?.price) * 100)

  if (
    itemError ||
    !item ||
    item.status !== 'published' ||
    item.availability === 'sold' ||
    !isDirectPurchaseModel(item.sourcing_model) ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return formatUnavailable()
  }

  const holdStore = supabaseHoldStore(supabase)
  const acquired = await acquireHold(holdStore, stripeHoldApi(stripe), item.id)
  if (!acquired.ok) {
    return formatUnavailable()
  }
  const hold = acquired.hold

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
    metadata: {
      item_id: item.id,
      item_title: item.title,
      checkout_surface: 'terminal_elements',
      hold_started_at: hold.updated_at,
    },
  }).catch(async error => {
    await releaseOwnHold(holdStore, hold).catch(() => null)
    throw error
  })

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      item_id: item.id,
      customer_email: null,
      customer_name: null,
      stripe_session_id: `elements_${paymentIntent.id}`,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
      amount_total: amount,
      currency: 'usd',
    })
    .select('id')
    .single()

  if (orderError || !order) {
    const canceled = await stripe.paymentIntents.cancel(paymentIntent.id).then(() => true, () => false)
    if (canceled) await releaseOwnHold(holdStore, hold).catch(() => null)
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
  }

  await stripe.paymentIntents.update(paymentIntent.id, {
    metadata: {
      item_id: item.id,
      item_title: item.title,
      order_id: order.id,
      checkout_surface: 'terminal_elements',
    },
  })

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    itemTitle: item.title,
    itemPrice: amount / 100,
    orderId: order.id,
  })
}
