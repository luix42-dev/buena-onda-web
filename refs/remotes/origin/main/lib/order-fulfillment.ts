import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendTelegramMessage, type TelegramSendResult } from '@/lib/telegram'

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
  telegram: TelegramSendResult
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

  if (fulfillment?.status_out === 'paid' && fulfillment?.item_id) {
    const { data: item } = await supabase
      .from('items')
      .select('title')
      .eq('id', fulfillment.item_id)
      .single()

    telegram = await sendTelegramMessage(
      `Order received: ${item?.title ?? 'Catalog item'} - ${formatAmount(input.amountTotal, input.currency)}`,
    )
  }

  return {
    orderId: fulfillment?.order_id ?? null,
    itemId: fulfillment?.item_id ?? null,
    status: fulfillment?.status_out ?? null,
    itemAlreadySold: Boolean(fulfillment?.item_already_sold),
    telegram,
  }
}
