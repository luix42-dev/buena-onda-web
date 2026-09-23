import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendTelegramMessage, type TelegramSendResult } from '@/lib/telegram'
import { sendOrderConfirmationEmail, type EmailSendResult } from '@/lib/email'
import { formatShippingLines, shippingFromSession, type ShippingAddress } from '@/lib/shipping'

type FulfillOrderInput = {
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

// Columns come from supabase/migrations/20260923120000_order_fulfillment_fields.sql.
// Until that migration is applied the address stays in Stripe (the studio reads it there).
async function persistShipping(
  supabase: ReturnType<typeof createServiceRoleClient>,
  stripeSessionId: string,
  shipping: ShippingAddress,
) {
  const { error } = await supabase
    .from('orders')
    .update({ shipping_name: shipping.name, shipping_phone: shipping.phone, shipping_address: shipping })
    .eq('stripe_session_id', stripeSessionId)
  if (error) console.warn('[fulfillment] shipping not persisted:', error.message)
}

export async function fulfillOrder(input: FulfillOrderInput): Promise<FulfillOrderResult> {
  const supabase = createServiceRoleClient()

  // Fallback for databases where the RPC predates the already_fulfilled flag:
  // a replayed event for an order that was already paid must not notify again.
  const { data: priorOrder } = await supabase
    .from('orders')
    .select('status')
    .eq('stripe_session_id', input.stripeSessionId)
    .maybeSingle()
  const wasAlreadyPaid = priorOrder?.status === 'paid'

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

  const alreadyFulfilled = Boolean(fulfillment?.already_fulfilled ?? wasAlreadyPaid)
  const isFirstTimeFulfillment = fulfillment?.status_out === 'paid' && !alreadyFulfilled

  if (isFirstTimeFulfillment && fulfillment?.item_id) {
    const { data: item } = await supabase
      .from('items')
      .select('title')
      .eq('id', fulfillment.item_id)
      .single()

    const itemTitle = item?.title ?? 'Catalog item'
    const shipping = input.shipping ?? null
    if (shipping) await persistShipping(supabase, input.stripeSessionId, shipping)

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

export function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent
  return fulfillOrder({
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id ?? null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    customerName: session.customer_details?.name ?? null,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? 'usd',
    shipping: shippingFromSession(session),
  })
}

export function fulfillElementsPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  return fulfillOrder({
    stripeSessionId: `elements_${paymentIntent.id}`,
    stripePaymentIntentId: paymentIntent.id,
    customerEmail: paymentIntent.receipt_email ?? null,
    customerName: null,
    amountTotal: paymentIntent.amount,
    currency: paymentIntent.currency,
    shipping: shippingFromSession({ shipping_details: paymentIntent.shipping }),
  })
}
