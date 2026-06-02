import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const ORDER_ID = 'f34f3f8e-53d5-414a-8b60-2b791954c298'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const { data: order, error } = await supabase
  .from('orders')
  .select('id, amount_total, currency, item:items(title)')
  .eq('id', ORDER_ID)
  .single()

if (error) throw error

const amount = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: String(order.currency ?? 'usd').toUpperCase(),
}).format(Number(order.amount_total ?? 0) / 100)

const token = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID
const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: `Order received: ${order.item?.title ?? 'Catalog item'} — ${amount}`,
    disable_web_page_preview: true,
  }),
})

const payload = await response.json()
console.log(JSON.stringify(payload, null, 2))
if (!payload.ok) process.exit(1)
