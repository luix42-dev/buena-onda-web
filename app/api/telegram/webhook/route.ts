import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import sharp from 'sharp'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'media', 'upload')
const VALID_THEME_SLUGS = ['curated-vintage', 'analog-objects', 'sound-collection', 'buena-onda-original']

type TelegramPhotoSize = {
  file_id: string
  file_unique_id?: string
  width: number
  height: number
  file_size?: number
}

type TelegramMessage = {
  message_id: number
  from?: { id?: number }
  chat?: { id?: number | string }
  text?: string
  caption?: string
  photo?: TelegramPhotoSize[]
}

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required')
  return token
}

function allowedId() {
  return String(process.env.TELEGRAM_CHAT_ID ?? '685672295')
}

function isAllowed(message: TelegramMessage) {
  const allowed = allowedId()
  const chatId = message.chat?.id == null ? null : String(message.chat.id)
  const userId = message.from?.id == null ? null : String(message.from.id)
  return chatId === allowed && (!userId || userId === allowed)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `telegram-intake-${Date.now()}`
}

function titleFromText(value: string | undefined, fallback: string) {
  const firstLine = value?.split(/\r?\n/).find(line => line.trim())?.trim()
  return firstLine ? firstLine.slice(0, 90) : fallback
}

function parseJson(raw: string) {
  return JSON.parse(raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim())
}

function normalizeTags(tags: unknown) {
  const values = Array.isArray(tags) ? tags : []
  return [...new Set(values
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.replace(/#/g, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase())
    .map(tag => tag.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean))]
    .slice(0, 8)
}

async function telegramApi(method: string, payload: Record<string, unknown>) {
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

async function reply(chatId: string | number, text: string) {
  return telegramApi('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true })
}

async function getTelegramFile(fileId: string) {
  const file = await telegramApi('getFile', { file_id: fileId })
  const filePath = file?.file_path
  if (!filePath) throw new Error('Telegram did not return file_path')
  const response = await fetch(`https://api.telegram.org/file/bot${botToken()}/${filePath}`)
  if (!response.ok) throw new Error(`Telegram file download failed with ${response.status}`)
  return {
    filename: String(filePath).split('/').pop() ?? fileId,
    buffer: Buffer.from(await response.arrayBuffer()),
  }
}

async function processCatalogImage(buffer: Buffer, prefix = 'telegram') {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const output = await sharp(buffer)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
  const filename = `${prefix}-${Date.now()}-${randomUUID()}.webp`
  await fs.writeFile(path.join(UPLOAD_DIR, filename), output)
  return {
    url: `/media/upload/${filename}`,
    beforeSize: buffer.byteLength,
    afterSize: output.byteLength,
  }
}

async function fetchOpenGraph(url: string) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'BuenaOndaBot/1.0' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`URL fetch failed with ${response.status}`)
  const html = await response.text()
  const meta = (property: string) => {
    const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i')
    return html.match(pattern)?.[1]?.replace(/&amp;/g, '&') ?? ''
  }
  const title = meta('og:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || ''
  const description = meta('og:description') || meta('description')
  const image = meta('og:image')
  return { title, description, image }
}

async function enrichCatalogCopy(context: { note?: string; sourceUrl?: string; imageUrl?: string | null; filename?: string }) {
  const fallbackTitle = titleFromText(context.note, context.filename || 'Telegram Catalog Draft')
  const fallback = {
    title: fallbackTitle,
    description: context.note || 'Draft catalog intake from Telegram. Editorial copy pending.',
    provenance: null,
    tags: ['telegram', 'catalog', 'needs-review'],
    suggested_theme: 'analog-objects',
    confidence: 0.2,
  }

  try {
    const voice = await fs.readFile(path.join(process.cwd(), 'src', 'brand', 'voice_v2.md'), 'utf8')
    const tagsResponse = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(10_000) })
    const tagsPayload = await tagsResponse.json()
    const model = Array.isArray(tagsPayload.models)
      ? tagsPayload.models.find((entry: { name?: string }) => entry.name === 'mistral:latest')?.name
      : null
    if (!model) return fallback

    const user = `You are writing a product listing for Buena Onda, an analog culture house in Miami.

Source material:
- Caption or note: ${context.note ?? ''}
- URL: ${context.sourceUrl ?? ''}
- Image: ${context.imageUrl ?? ''}
- Filename: ${context.filename ?? ''}

Return only valid JSON:
{
  "title": "...",
  "description": "...",
  "provenance": null,
  "tags": ["..."],
  "suggested_theme": "curated-vintage|analog-objects|sound-collection|buena-onda-original",
  "confidence": 0.0
}`

    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        system: voice,
        messages: [{ role: 'user', content: user }],
        format: 'json',
        options: { temperature: 0.25 },
      }),
      signal: AbortSignal.timeout(300_000),
    })
    if (!response.ok) return fallback
    const payload = await response.json()
    const parsed = parseJson(String(payload?.message?.content ?? payload?.response ?? '{}'))
    const suggestedTheme = VALID_THEME_SLUGS.includes(String(parsed.suggested_theme))
      ? String(parsed.suggested_theme)
      : 'analog-objects'
    return {
      title: String(parsed.title || fallback.title).trim(),
      description: String(parsed.description || fallback.description).trim(),
      provenance: null,
      tags: normalizeTags(parsed.tags).length ? normalizeTags(parsed.tags) : fallback.tags,
      suggested_theme: suggestedTheme,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    }
  } catch {
    return fallback
  }
}

async function saveCatalogDraft(input: {
  note?: string
  sourceUrl?: string
  imageUrl: string | null
  filename?: string
  image?: { beforeSize: number; afterSize: number }
}) {
  const supabase = createServiceRoleClient()
  const copy = await enrichCatalogCopy({
    note: input.note,
    sourceUrl: input.sourceUrl,
    imageUrl: input.imageUrl,
    filename: input.filename,
  })
  const { data: theme } = await supabase
    .from('themes')
    .select('id')
    .eq('slug', copy.suggested_theme)
    .maybeSingle()
  const title = copy.title || titleFromText(input.note, 'Telegram Catalog Draft')
  const { data, error } = await supabase
    .from('items')
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now()}`,
      theme_id: theme?.id ?? null,
      description: copy.description || null,
      details: {
        provenance: copy.provenance,
        confidence: copy.confidence,
        source_url: input.sourceUrl || null,
        telegram_note: input.note || null,
        telegram_filename: input.filename || null,
        image_before_size: input.image?.beforeSize ?? null,
        image_after_size: input.image?.afterSize ?? null,
      },
      price: null,
      tags: copy.tags,
      status: 'draft',
      availability: 'available',
      sourcing_model: 'reservation',
      cover_image_url: input.imageUrl,
    })
    .select('id,title,slug,status,cover_image_url')
    .single()
  if (error) throw error
  return { record: data, image: input.image ?? null }
}

async function handlePhoto(message: TelegramMessage) {
  const chatId = message.chat!.id!
  const photo = [...(message.photo ?? [])].sort((a, b) => (b.file_size ?? b.width * b.height) - (a.file_size ?? a.width * a.height))[0]
  if (!photo) return reply(chatId, 'Send a photo or use /catalog /transmission /radio + a URL.')
  const file = await getTelegramFile(photo.file_id)
  const image = await processCatalogImage(file.buffer)
  const saved = await saveCatalogDraft({
    note: message.caption,
    imageUrl: image.url,
    filename: file.filename,
    image,
  })
  const sent = await reply(chatId, `Draft saved: ${saved.record.title} — review in studio`)
  return { ...saved, reply: sent }
}

async function handleCatalogUrl(message: TelegramMessage, url: string) {
  const chatId = message.chat!.id!
  if (/facebook\.com\/marketplace/i.test(url)) {
    const sent = await reply(chatId, 'Marketplace blocks image fetch. Send the photos directly instead.')
    return { rejected: true, reply: sent }
  }
  const og = await fetchOpenGraph(url)
  let image: Awaited<ReturnType<typeof processCatalogImage>> | null = null
  if (og.image) {
    const response = await fetch(og.image, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`og:image fetch failed with ${response.status}`)
    image = await processCatalogImage(Buffer.from(await response.arrayBuffer()), 'telegram-og')
  }
  const saved = await saveCatalogDraft({
    note: [og.title, og.description].filter(Boolean).join('\n'),
    sourceUrl: url,
    imageUrl: image?.url ?? null,
    filename: og.image || url,
    image: image ?? undefined,
  })
  const sent = await reply(chatId, `Draft saved: ${saved.record.title} — review in studio`)
  return { ...saved, reply: sent }
}

async function handleTransmissionUrl(message: TelegramMessage, url: string) {
  const chatId = message.chat!.id!
  const og = await fetchOpenGraph(url).catch(() => ({ title: url, description: '', image: '' }))
  const title = titleFromText(og.title, 'Telegram Transmission Draft')
  const body = [`Link: ${url}`, og.description ? `Description: ${og.description}` : '', og.image ? `Image: ${og.image}` : '']
    .filter(Boolean)
    .join('\n\n')
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('transmission_issues')
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now()}`,
      excerpt: og.description || url,
      body,
      status: 'draft',
      published_at: null,
    })
    .select('id,title,slug,status')
    .single()
  if (error) throw error
  const sent = await reply(chatId, 'Saved to Transmission drafts.')
  return { record: data, reply: sent }
}

async function handleRadioUrl(message: TelegramMessage, url: string) {
  const chatId = message.chat!.id!
  const title = titleFromText(url, 'Telegram Radio Draft')
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('episodes')
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now()}`,
      description: `Link: ${url}`,
      audio_url: url,
      episode_number: null,
      duration: null,
      tags: ['radio', 'telegram'],
      published: false,
      published_at: null,
    })
    .select('id,title,slug,published')
    .single()
  if (error) throw error
  const sent = await reply(chatId, 'Saved to Radio drafts.')
  return { record: data, reply: sent }
}

function parseCommand(text: string | undefined) {
  const match = text?.trim().match(/^\/(catalog|transmission|radio)\s+(\S+)/i)
  return match ? { command: match[1].toLowerCase(), url: match[2] } : null
}

export async function POST(request: NextRequest) {
  let update: { message?: TelegramMessage }
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const message = update.message
  if (!message?.chat?.id || !isAllowed(message)) {
    return NextResponse.json({ ok: true })
  }

  try {
    if (message.photo?.length) {
      const result = await handlePhoto(message)
      return NextResponse.json({ ok: true, type: 'photo', result })
    }

    const command = parseCommand(message.text)
    if (command?.command === 'catalog') {
      const result = await handleCatalogUrl(message, command.url)
      return NextResponse.json({ ok: true, type: 'catalog', result })
    }
    if (command?.command === 'transmission') {
      const result = await handleTransmissionUrl(message, command.url)
      return NextResponse.json({ ok: true, type: 'transmission', result })
    }
    if (command?.command === 'radio') {
      const result = await handleRadioUrl(message, command.url)
      return NextResponse.json({ ok: true, type: 'radio', result })
    }

    const sent = await reply(message.chat.id, 'Send a photo or use /catalog /transmission /radio + a URL.')
    return NextResponse.json({ ok: true, type: 'fallback', reply: sent })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Telegram webhook failed'
    await reply(message.chat.id, `Intake failed: ${reason}`).catch(() => null)
    return NextResponse.json({ ok: true, error: reason })
  }
}
