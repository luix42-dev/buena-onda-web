import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripe } from '@/lib/stripe'
import { acquireHold, releaseOwnHold, stripeSessionExpiresAt } from '@/lib/checkout-holds'
import { stripeHoldApi, supabaseHoldStore } from '@/lib/checkout-holds-adapters'
import { shippingCountries } from '@/lib/shipping'

export const runtime = 'edge'

const CheckoutSchema = z.object({
  itemId: z.string().uuid().optional(),
  itemSlug: z.string().trim().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().trim().min(1).optional(),
})

function resolveSiteUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
}

function getPaymentIntentId(paymentIntent: Stripe.Checkout.Session['payment_intent']) {
  return typeof paymentIntent === 'string' ? paymentIntent : null
}

function isDirectPurchaseModel(value: string | null | undefined) {
  return value === 'direct' || value === 'direct_purchase'
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CheckoutSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, itemSlug, customerEmail, customerName } = parsed.data

  if (!itemId && !itemSlug) {
    return NextResponse.json({ error: 'itemId or itemSlug is required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const stripe = getStripe()
  const siteUrl = resolveSiteUrl(request)

  const itemQuery = supabase
    .from('items')
    .select('id, slug, title, price, status, availability, sourcing_model')
    .eq(itemId ? 'id' : 'slug', itemId ?? itemSlug!)
    .single()

  const { data: item, error: itemError } = await itemQuery
  if (itemError || !item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const amountTotal = Math.round(Number(item.price) * 100)

  if (
    item.status !== 'published' ||
    item.availability === 'sold' ||
    !isDirectPurchaseModel(item.sourcing_model) ||
    !Number.isFinite(amountTotal) ||
    amountTotal <= 0
  ) {
    return NextResponse.json({ error: 'Item is not available for checkout' }, { status: 409 })
  }

  const holdStore = supabaseHoldStore(supabase)
  const acquired = await acquireHold(holdStore, stripeHoldApi(stripe), item.id)
  if (!acquired.ok) {
    return acquired.reason === 'held' || acquired.reason === 'raced'
      ? NextResponse.json(
          { error: 'ITEM_ON_HOLD', message: 'Someone is checking out this piece right now. If they do not finish, it comes back within about 35 minutes.' },
          { status: 409 },
        )
      : NextResponse.json({ error: 'Item is not available for checkout' }, { status: 409 })
  }
  const hold = acquired.hold

  let checkoutSession: Stripe.Checkout.Session | null = null

  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      expires_at: stripeSessionExpiresAt(),
      shipping_address_collection: { allowed_countries: shippingCountries() },
      phone_number_collection: { enabled: true },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.title,
              metadata: {
                item_id: item.id,
                item_slug: item.slug,
              },
            },
            unit_amount: amountTotal,
          },
        },
      ],
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/items/${item.slug}`,
      customer_email: customerEmail,
      client_reference_id: item.id,
      metadata: {
        item_id: item.id,
        item_slug: item.slug,
        item_title: item.title,
        hold_started_at: hold.updated_at,
      },
      payment_intent_data: {
        metadata: {
          item_id: item.id,
          item_slug: item.slug,
        },
      },
    })

    if (!checkoutSession.url) {
      throw new Error('Stripe did not return a checkout URL')
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        item_id: item.id,
        customer_email: customerEmail ?? null,
        customer_name: customerName ?? null,
        stripe_session_id: checkoutSession.id,
        stripe_payment_intent_id: getPaymentIntentId(checkoutSession.payment_intent),
        status: 'pending',
        amount_total: amountTotal,
        currency: 'usd',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      const expired = await stripe.checkout.sessions.expire(checkoutSession.id).then(() => true, () => false)
      if (expired) await releaseOwnHold(holdStore, hold).catch(() => null)
      return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl: checkoutSession.url })
  } catch (error) {
    // The hold is only safe to give back once Stripe can no longer take payment.
    const expired = checkoutSession
      ? await stripe.checkout.sessions.expire(checkoutSession.id).then(() => true, () => false)
      : true
    if (expired) await releaseOwnHold(holdStore, hold).catch(() => null)

    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
