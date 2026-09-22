import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendTelegramMessage, type TelegramSendResult } from '@/lib/telegram'
import { sendOrderConfirmationEmail, type EmailSendResult } from '@/lib/email'

type FulfillOrderInput = {
  stripeSessionId: string
  stripePaymentIntentId: string | null
  customerEmail: string | null
  customerName: string | null
  amountTotal: number
  currency: string
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

export async function fulfillOrder(input: FulfillOrderInput): Promise<FulfillOrderResult> {
  const supabase = createServiceRoleClient()
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

  const isFirstTimeFulfillment =
    fulfillment?.status_out === 'paid' && !fulfillment?.already_fulfilled

  if (isFirstTimeFulfillment && fulfillment?.item_id) {
    const { data: item } = await supabase
      .from('items')
      .select('title')
      .eq('id', fulfillment.item_id)
      .single()

    const itemTitle = item?.title ?? 'Catalog item'

    telegram = await sendTelegramMessage(
      `Order received: ${itemTitle} - ${formatAmount(input.amountTotal, input.currency)}`,
    )

    email = await sendOrderConfirmationEmail(
      itemTitle,
      input.customerEmail,
      input.amountTotal,
      input.currency,
    )
  }

  return {
    orderId: fulfillment?.order_id ?? null,
    itemId: fulfillment?.item_id ?? null,
    status: fulfillment?.status_out ?? null,
    itemAlreadySold: Boolean(fulfillment?.item_already_sold),
    alreadyFulfilled: Boolean(fulfillment?.already_fulfilled),
    telegram,
    email,
  }
}
