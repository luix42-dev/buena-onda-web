import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'

const baseUrl = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3002'
const token = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing')
if (!chatId) throw new Error('TELEGRAM_CHAT_ID is missing')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    body,
  })
  const payload = await response.json()
  if (!response.ok || !payload.ok) {
    throw new Error(`${method} failed: ${JSON.stringify(payload)}`)
  }
  return payload.result
}

async function postUpdate(update) {
  const response = await fetch(`${baseUrl}/api/telegram/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(update),
  })
  const payload = await response.json()
  if (!response.ok || !payload.ok) {
    throw new Error(`webhook failed: ${response.status} ${JSON.stringify(payload)}`)
  }
  return payload
}

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
)
const photoPath = '/tmp/bo-telegram-test.png'
await fs.writeFile(photoPath, tinyPng)

const form = new FormData()
form.set('chat_id', chatId)
form.set('caption', 'Telegram photo intake test')
form.set('photo', new Blob([tinyPng], { type: 'image/png' }), 'bo-telegram-test.png')
const sentPhoto = await telegram('sendPhoto', form)
const highestPhoto = [...sentPhoto.photo].sort((a, b) => (b.file_size ?? b.width * b.height) - (a.file_size ?? a.width * a.height))[0]

const photoResult = await postUpdate({
  update_id: Date.now(),
  message: {
    message_id: sentPhoto.message_id + 1,
    from: { id: Number(chatId) },
    chat: { id: Number(chatId) },
    caption: 'Telegram photo intake test',
    photo: [highestPhoto],
  },
})

const transmissionResult = await postUpdate({
  update_id: Date.now() + 1,
  message: {
    message_id: sentPhoto.message_id + 2,
    from: { id: Number(chatId) },
    chat: { id: Number(chatId) },
    text: '/transmission https://buenaondalifestyle.com',
  },
})

const marketplaceResult = await postUpdate({
  update_id: Date.now() + 2,
  message: {
    message_id: sentPhoto.message_id + 3,
    from: { id: Number(chatId) },
    chat: { id: Number(chatId) },
    text: '/catalog https://www.facebook.com/marketplace/item/123',
  },
})

const photoRecordId = photoResult.result?.record?.id
const transmissionRecordId = transmissionResult.result?.record?.id

const [{ data: photoRecord }, { data: transmissionRecord }] = await Promise.all([
  supabase.from('items').select('id,title,status,cover_image_url,details').eq('id', photoRecordId).single(),
  supabase.from('transmission_issues').select('id,title,status').eq('id', transmissionRecordId).single(),
])

console.log(JSON.stringify({
  photo: {
    record: photoRecord,
    image: photoResult.result?.image,
    replyMessageId: photoResult.result?.reply?.message_id,
  },
  transmission: {
    record: transmissionRecord,
    replyMessageId: transmissionResult.result?.reply?.message_id,
  },
  marketplace: {
    rejected: marketplaceResult.result?.rejected === true,
    replyMessageId: marketplaceResult.result?.reply?.message_id,
  },
}, null, 2))
