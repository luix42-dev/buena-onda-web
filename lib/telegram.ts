export type TelegramSendResult =
  | { ok: true; messageId: number }
  | { ok: false; reason: string }

export function hasTelegramConfig() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return { ok: false, reason: 'Telegram env vars missing' }
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      reason: payload?.description ?? `Telegram send failed with ${response.status}`,
    }
  }

  return { ok: true, messageId: payload.result.message_id }
}
