import 'dotenv/config'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing')

const url = process.env.TELEGRAM_WEBHOOK_URL ?? 'https://buena-onda-web.vercel.app/api/telegram/webhook'

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response.json()
}

const setWebhook = await telegram('setWebhook', { url })
const info = await telegram('getWebhookInfo', {})

console.log(JSON.stringify({ setWebhook, info }, null, 2))
