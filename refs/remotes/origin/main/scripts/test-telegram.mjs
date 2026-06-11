import 'dotenv/config'

const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

console.log(`TELEGRAM_BOT_TOKEN=${token ? 'PRESENT_MASKED' : 'MISSING'}`)
console.log(`TELEGRAM_CHAT_ID=${chatId ? 'PRESENT_MASKED' : 'MISSING'}`)

if (!token || !chatId) process.exit(1)

const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: 'Buena Onda — system check.',
    disable_web_page_preview: true,
  }),
})

const payload = await response.json()
console.log(JSON.stringify(payload, null, 2))
if (!payload.ok) process.exit(1)
