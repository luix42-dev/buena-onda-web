export type TelegramPhotoSize = {
  file_id: string
  file_unique_id?: string
  width: number
  height: number
  file_size?: number
}

export type TelegramMessage = {
  message_id: number
  from?: { id?: number }
  chat?: { id?: number | string }
  text?: string
  caption?: string
  photo?: TelegramPhotoSize[]
}

export type TelegramCallbackQuery = {
  id: string
  data?: string
  from?: { id?: number }
  message?: TelegramMessage
}

export type TelegramUpdate = {
  update_id?: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required')
  return token
}

export function allowedChatId() {
  return String(process.env.TELEGRAM_CHAT_ID ?? '685672295')
}

export function isAllowedChat(chatId: string | number | null | undefined) {
  return chatId != null && String(chatId) === allowedChatId()
}

export async function telegramApi(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) {
    throw new Error(data?.description ?? `${method} failed with ${response.status}`)
  }
  return data.result
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: {
    disableWebPreview?: boolean
    replyMarkup?: Record<string, unknown>
  } = {},
) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: options.disableWebPreview ?? true,
    reply_markup: options.replyMarkup,
  })
}

export async function sendTelegramMediaGroup(chatId: string | number, media: Array<Record<string, unknown>>) {
  return telegramApi('sendMediaGroup', {
    chat_id: chatId,
    media,
  })
}

export async function sendTelegramPhoto(chatId: string | number, photo: string, caption?: string) {
  return telegramApi('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
  })
}

export async function answerTelegramCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  })
}

export async function getTelegramFile(fileId: string) {
  const file = await telegramApi('getFile', { file_id: fileId })
  const filePath = file?.file_path
  if (!filePath) throw new Error('Telegram did not return file_path')
  return {
    filePath: String(filePath),
    filename: String(filePath).split('/').pop() ?? fileId,
  }
}

export async function downloadTelegramFile(fileId: string) {
  const file = await getTelegramFile(fileId)
  const response = await fetch(`https://api.telegram.org/file/bot${botToken()}/${file.filePath}`)
  if (!response.ok) throw new Error(`Telegram file download failed with ${response.status}`)
  return {
    filename: file.filename,
    contentType: response.headers.get('content-type') ?? 'image/jpeg',
    buffer: new Uint8Array(await response.arrayBuffer()),
  }
}
