import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const itemId = process.argv[2]
const amountTotal = Number(process.argv[3] ?? 100)

if (!itemId) throw new Error('Item id is required')
if (!Number.isFinite(amountTotal) || amountTotal <= 0) throw new Error('Amount must be positive cents')

if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.log(JSON.stringify({
    ok: false,
    red: 'STRIPE_SECRET_KEY is not a test key',
  }, null, 2))
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) throw new Error('Supabase service env is missing')

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
})

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) return { ok: false, reason: 'Telegram env vars missing' }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    return { ok: false, reason: payload?.description ?? `Telegram send failed with ${response.status}` }
  }
  return { ok: true, messageId: payload.result.message_id }
}

function formatAmount(cents, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

async function fulfillOrder(input) {
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
  let telegram = { ok: false, reason: 'No paid fulfillment' }

  if (fulfillment?.status_out === 'paid' && fulfillment?.item_id) {
    const { data: itemData } = await supabase
      .from('items')
      .select('title')
      .eq('id', fulfillment.item_id)
      .single()
    telegram = await sendTelegramMessage(
      `Order received: ${itemData?.title ?? 'Catalog item'} - ${formatAmount(input.amountTotal, input.currency)}`,
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

const { data: item, error: itemError } = await supabase
  .from('items')
  .select('id, title, slug, price, status, availability')
  .eq('id', itemId)
  .single()

if (itemError || !item) throw itemError ?? new Error('Item not found')

const { data: prepared, error: prepareError } = await supabase
  .from('items')
  .update({
    price: amountTotal / 100,
    status: 'published',
    availability: 'available',
  })
  .eq('id', itemId)
  .select('id, title, slug, price, status, availability')
  .single()

if (prepareError || !prepared) throw prepareError ?? new Error('Could not prepare item')

const paymentIntent = await stripe.paymentIntents.create({
  amount: amountTotal,
  currency: 'usd',
  payment_method: 'pm_card_visa',
  confirm: true,
  automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
  metadata: {
    item_id: prepared.id,
    item_slug: prepared.slug,
  },
})

const syntheticSessionId = `pi_test_${paymentIntent.id}`
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    item_id: prepared.id,
    customer_email: 'test@buena-onda.local',
    customer_name: 'Buena Onda Test',
    stripe_session_id: syntheticSessionId,
    stripe_payment_intent_id: paymentIntent.id,
    status: 'pending',
    amount_total: amountTotal,
    currency: 'usd',
  })
  .select('id')
  .single()

if (orderError || !order) throw orderError ?? new Error('Could not create order')

const fulfillment = await fulfillOrder({
  stripeSessionId: syntheticSessionId,
  stripePaymentIntentId: paymentIntent.id,
  customerEmail: 'test@buena-onda.local',
  customerName: 'Buena Onda Test',
  amountTotal,
  currency: 'usd',
})

const { data: soldItem, error: soldError } = await supabase
  .from('items')
  .select('availability, status')
  .eq('id', prepared.id)
  .single()

if (soldError) throw soldError

console.log(JSON.stringify({
  ok: true,
  stripeKey: 'sk_test',
  apiVersion: '2025-02-24.acacia',
  paymentIntentId: paymentIntent.id,
  paymentIntentStatus: paymentIntent.status,
  orderRecordId: order.id,
  fulfillment,
  availability: soldItem.availability,
  itemStatus: soldItem.status,
  resend: 'N - no Resend email is wired in checkout/webhook fulfillment',
}, null, 2))
