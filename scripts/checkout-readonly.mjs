// Read-only audit: no sessions, charges, orders or inventory writes.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { writeFileSync } from 'node:fs'
dotenv.config({ path: '.env.local', quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const report = { at: new Date().toISOString(), mode: process.env.STRIPE_SECRET_KEY?.includes('_live_') ? 'live-read-only' : 'test-read-only' }
const reserved = await db.from('items').select('id,availability,updated_at').eq('availability', 'reserved')
if (reserved.error) throw new Error(reserved.error.message)
report.reserved = reserved.data
report.classifications = []
const reservedIds = new Set(reserved.data.map(i => i.id))
report.processorHistory = { sessions: 0, intents: 0, matching: [], accountScope: 'local-key; production sensitive key cannot be read for comparison' }
for await (const session of stripe.checkout.sessions.list({ limit: 100 })) {
  report.processorHistory.sessions++
  if (reservedIds.has(session.metadata?.item_id)) report.processorHistory.matching.push({
    id: session.id, itemId: session.metadata.item_id, status: session.status, paymentStatus: session.payment_status,
  })
}
for await (const intent of stripe.paymentIntents.list({ limit: 100 })) {
  report.processorHistory.intents++
  if (reservedIds.has(intent.metadata?.item_id)) report.processorHistory.matching.push({
    id: intent.id, itemId: intent.metadata.item_id, paymentStatus: intent.status,
  })
}
for (const item of reserved.data) {
  const orders = await db.from('orders').select('id,status,stripe_session_id,stripe_payment_intent_id').eq('item_id', item.id)
  if (orders.error) throw new Error(orders.error.message)
  const evidence = []
  for (const order of orders.data) {
    try {
      const p = order.stripe_session_id.startsWith('elements_')
        ? await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id)
        : await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      evidence.push({ orderId: order.id, orderStatus: order.status, processorStatus: p.status, paymentStatus: p.payment_status ?? p.status })
    } catch { evidence.push({ orderId: order.id, orderStatus: order.status, processorStatus: 'access-unavailable' }) }
  }
  // Missing order rows cannot rule out orphaned processor payments.
  report.classifications.push({ itemId: item.id, classification: evidence.some(e => e.orderStatus === 'paid' || ['paid','succeeded'].includes(e.paymentStatus)) ? 'paid-verify-before-sold' : 'ambiguous', evidence })
}
const shipping = await db.from('orders').select('id,shipping_address').eq('status', 'paid')
report.shippingSchema = shipping.error?.message ?? 'present'
report.paidOrders = shipping.data?.length ?? null
report.paidOrdersWithAddress = shipping.data?.filter(o => o.shipping_address?.line1).length ?? null
try {
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
  report.webhooks = endpoints.data.map(e => ({ id: e.id, url: e.url, status: e.status, events: e.enabled_events }))
  const events = await stripe.events.list({ type: 'checkout.session.completed', limit: 10 })
  report.recentEvents = events.data.map(e => ({ id: e.id, pendingWebhooks: e.pending_webhooks, created: e.created }))
} catch (e) { report.stripeAccess = e.code ?? e.type ?? 'unavailable' }
for (const path of ['/', '/api/webhooks/stripe']) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}${path}`)
  report[path] = r.status
}
const invalid = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/stripe`, { method: 'POST', body: '{}' })
report.unsignedWebhookPost = invalid.status
writeFileSync('docs/checkout-remediation/production-readonly.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
