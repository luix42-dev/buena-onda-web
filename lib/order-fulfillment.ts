import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendTelegramMessage, type TelegramSendResult } from '@/lib/telegram'
import { sendOrderConfirmationEmail, type EmailSendResult } from '@/lib/email'
import { formatShippingLines, shippingFromSession, type ShippingAddress } from '@/lib/shipping'

type FulfillOrderInput = {
  itemId: string
  eventId?: string
  stripeSessionId: string
  stripePaymentIntentId: string | null
  customerEmail: string | null
  customerName: string | null
  amountTotal: number
  currency: string
  shipping?: ShippingAddress | null
}

export type FulfillOrderResult = {
  orderId: string | null
  itemId: string | null
  status: string | null
  itemAlreadySold: boolean
  alreadyFulfilled: boolean
  telegram: TelegramSendResult
  email: EmailSendResult
}

function formatAmount(amountTotal: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountTotal / 100)
}

// Persist before the paid transition. Failures retry instead of losing the address.
async function persistShipping(
  supabase: ReturnType<typeof createServiceRoleClient>,
  stripeSessionId: string,
  shipping: ShippingAddress,
) {
  const { error } = await supabase
    .from('orders')
    .update({ shipping_name: shipping.name, shipping_phone: shipping.phone, shipping_address: shipping })
    .eq('stripe_session_id', stripeSessionId)
  if (error) throw new Error(`shipping_persistence_failed: ${error.code}`)
}

export async function fulfillOrder(input: FulfillOrderInput): Promise<FulfillOrderResult> {
  const supabase = createServiceRoleClient()

  const { data: priorOrder, error: priorError } = await supabase
    .from('orders')
    .select('id,item_id,status,amount_total,currency,shipping_address')
    .eq('stripe_session_id', input.stripeSessionId)
    .maybeSingle()
  if (priorError) throw priorError
  if (!priorOrder) throw new Error('order_not_found')
  if (!input.itemId || priorOrder.item_id !== input.itemId ||
      priorOrder.amount_total !== input.amountTotal || priorOrder.currency !== input.currency) {
    throw new Error('payment_order_mismatch')
  }
  const shipping = input.shipping ?? priorOrder.shipping_address
  if (!shipping?.line1) throw new Error('shipping_address_required')
  await persistShipping(supabase, input.stripeSessionId, shipping)

  const { data, error } = await supabase.rpc('fulfill_stripe_checkout_session', {
    p_stripe_session_id: input.stripeSessionId,
    p_stripe_payment_intent_id: input.stripePaymentIntentId,
    p_customer_email: input.customerEmail,
    p_customer_name: input.customerName,
    p_amount_total: input.amountTotal,
    p_currency: input.currency,
  })

  if (error) throw error

  const fulfillment = data?.[0]
  let telegram: TelegramSendResult = { ok: false, reason: 'No paid fulfillment' }
  let email: EmailSendResult = { ok: false, reason: 'No paid fulfillment' }

  if (typeof fulfillment?.already_fulfilled !== 'boolean') {
    throw new Error('fulfillment_rpc_upgrade_required')
  }
  const alreadyFulfilled = fulfillment.already_fulfilled
  if (fulfillment.item_already_sold) {
    const { data: existingOrder, error: lookupError } = await supabase.from('orders')
      .select('id').eq('item_id', input.itemId).eq('status', 'paid').maybeSingle()
    if (lookupError) throw lookupError
    const details = {
      severity: 'high', eventId: input.eventId ?? null,
      sessionId: input.stripeSessionId, productIds: [input.itemId],
      existingOrderId: existingOrder?.id ?? null,
      action: 'Investigate duplicate payment and manually refund the losing payment; do not fulfill twice.',
    }
    console.error('[payment-reconciliation]', JSON.stringify(details))
    const { error: logError } = await supabase.from('checkout_recovery_log').insert({
      source: 'webhook', item_id: input.itemId, order_id: priorOrder.id,
      action: 'paid_after_sold', reason: 'manual_refund_required', details,
    })
    if (logError) throw logError
  }
  const isFirstTimeFulfillment = fulfillment?.status_out === 'paid' && !alreadyFulfilled

  if (isFirstTimeFulfillment && fulfillment?.item_id) {
    const { data: item } = await supabase
      .from('items')
      .select('title')
      .eq('id', fulfillment.item_id)
      .single()

    const itemTitle = item?.title ?? 'Catalog item'

    telegram = await sendTelegramMessage(
      [
        `Order received: ${itemTitle} - ${formatAmount(input.amountTotal, input.currency)}`,
        shipping
          ? `Deliver to:\n${formatShippingLines(shipping).join('\n')}`
          : 'No delivery address on this order: check the studio.',
      ].join('\n'),
    )

    email = await sendOrderConfirmationEmail(
      itemTitle,
      input.customerEmail,
      input.amountTotal,
      input.currency,
      shipping,
    )
  }

  return {
    orderId: fulfillment?.order_id ?? null,
    itemId: fulfillment?.item_id ?? null,
    status: fulfillment?.status_out ?? null,
    itemAlreadySold: Boolean(fulfillment?.item_already_sold),
    alreadyFulfilled,
    telegram,
    email,
  }
}

export function fulfillCheckoutSession(session: Stripe.Checkout.Session, eventId?: string) {
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    throw new Error('payment_not_confirmed')
  }
  const paymentIntent = session.payment_intent
  return fulfillOrder({
    itemId: session.metadata?.item_id ?? '',
    eventId,
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id ?? null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    customerName: session.customer_details?.name ?? null,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    shipping: shippingFromSession(session),
  })
}

export function fulfillElementsPaymentIntent(paymentIntent: Stripe.PaymentIntent, eventId?: string) {
  if (paymentIntent.status !== 'succeeded') throw new Error('payment_not_confirmed')
  return fulfillOrder({
    itemId: paymentIntent.metadata?.item_id ?? '',
    eventId,
    stripeSessionId: `elements_${paymentIntent.id}`,
    stripePaymentIntentId: paymentIntent.id,
    customerEmail: paymentIntent.receipt_email ?? null,
    customerName: null,
    amountTotal: paymentIntent.amount,
    currency: paymentIntent.currency,
    shipping: shippingFromSession({ shipping_details: paymentIntent.shipping }),
  })
}
