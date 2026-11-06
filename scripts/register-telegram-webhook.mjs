import 'dotenv/config'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing')
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) throw new Error('TELEGRAM_WEBHOOK_SECRET must be 32-256 letters, numbers, underscores or hyphens')

const url = process.env.TELEGRAM_WEBHOOK_URL ?? 'https://buena-onda-web.vercel.app/api/telegram/webhook'

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response.json()
}

const setWebhook = await telegram('setWebhook', { url, secret_token: secret })
if (!setWebhook.ok) throw new Error('Telegram webhook registration failed')
const info = await telegram('getWebhookInfo', {})

console.log(JSON.stringify({ setWebhook, info }, null, 2))
