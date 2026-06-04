import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import categoriesConfig from '@/categories.json'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { VOICE_V2_PROMPT } from '@/lib/voice-prompt'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

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
  photo_url?: string
}

type CategoryConfig = {
  slug: string
  label: string
}

type ConversationState = 'idle' | 'drafting' | 'awaiting_confirmation'

type SessionMessage = {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

type DraftPayload = {
  title: string
  description: string
  provenance: string | null
  tags: string[]
  suggested_theme: string
  price_suggestion: number | null
  category: string
  confidence: number
}

type SessionDraft = {
  title: string
  description: string
  price: number | null
  tags: string[]
  theme: string
  cover_image_url: string | null
  category: string
  provenance: string | null
  confidence: number
  source_url: string | null
  price_suggestion: number | null
}

type ConversationSession = {
  id: string
  chat_id: string
  draft: SessionDraft | null
  messages: SessionMessage[]
  state: ConversationState
  updated_at: string
}

const CATEGORY_CONFIG = categoriesConfig as CategoryConfig[]
const VALID_CATEGORY_SLUGS = new Set(CATEGORY_CONFIG.map(category => category.slug))
const CATEGORY_TO_THEME: Record<string, string> = {
  garments: 'curated-vintage',
  objects: 'analog-objects',
  sound: 'sound-collection',
  original: 'buena-onda-original',
}
const VALID_THEME_SLUGS = new Set(Object.values(CATEGORY_TO_THEME))

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
  return chatId === allowed
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
  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Claude returned invalid JSON')
  }
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

function formatConfidence(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0.00'
  return value.toFixed(2)
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function bytesToBlobPart(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function imageExt(contentType: string, filename?: string) {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return filename?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

function normalizeMediaType(contentType: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (contentType.includes('png')) return 'image/png'
  if (contentType.includes('webp')) return 'image/webp'
  if (contentType.includes('gif')) return 'image/gif'
  return 'image/jpeg'
}

async function uploadCatalogImage(
  buffer: Uint8Array,
  prefix = 'intake',
  contentType = 'image/jpeg',
  filename?: string,
) {
  const ext = imageExt(contentType, filename)
  const storagePath = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const supabase = createServiceRoleClient()
  const { error } = await supabase.storage
    .from('catalog')
    .upload(storagePath, new Blob([bytesToBlobPart(buffer)], { type: contentType }), { contentType, upsert: false })
  if (error) throw error
  return {
    url: supabase.storage.from('catalog').getPublicUrl(storagePath).data.publicUrl,
    beforeSize: buffer.byteLength,
    afterSize: buffer.byteLength,
  }
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

async function reply(chatId: string | number, text: string, parseMode?: 'HTML') {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(parseMode ? { parse_mode: parseMode } : {}),
  })
}

async function getTelegramFile(fileId: string) {
  const file = await telegramApi('getFile', { file_id: fileId })
  const filePath = file?.file_path
  if (!filePath) throw new Error('Telegram did not return file_path')
  const response = await fetch(`https://api.telegram.org/file/bot${botToken()}/${filePath}`)
  if (!response.ok) throw new Error(`Telegram file download failed with ${response.status}`)
  return {
    filename: String(filePath).split('/').pop() ?? fileId,
    contentType: response.headers.get('content-type') ?? 'image/jpeg',
    buffer: new Uint8Array(await response.arrayBuffer()),
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

function themeFromCategory(category: string) {
  return CATEGORY_TO_THEME[category] ?? 'analog-objects'
}

function categoryFromTheme(theme: string) {
  const entry = Object.entries(CATEGORY_TO_THEME).find(([, slug]) => slug === theme)
  return entry?.[0] ?? 'objects'
}

function normalizePriceSuggestion(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeConfidence(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value))
  }
  return 0.5
}

function normalizeCategoryAndTheme(categoryValue: unknown, themeValue: unknown) {
  const theme = typeof themeValue === 'string' && VALID_THEME_SLUGS.has(themeValue)
    ? themeValue
    : null
  const category = typeof categoryValue === 'string' && VALID_CATEGORY_SLUGS.has(categoryValue)
    ? categoryValue
    : null

  if (category && theme) return { category, theme }
  if (theme) return { category: categoryFromTheme(theme), theme }
  if (category) return { category, theme: themeFromCategory(category) }
  return { category: 'objects', theme: 'analog-objects' }
}

function normalizeCopy(raw: unknown, fallback: DraftPayload): DraftPayload {
  const parsed = (raw ?? {}) as Record<string, unknown>
  const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallback.title
  const description = typeof parsed.description === 'string' && parsed.description.trim() ? parsed.description.trim() : fallback.description
  const provenance = typeof parsed.provenance === 'string' && parsed.provenance.trim() ? parsed.provenance.trim() : null
  const tags = normalizeTags(parsed.tags)
  const { category, theme } = normalizeCategoryAndTheme(parsed.category, parsed.suggested_theme)

  return {
    title,
    description,
    provenance,
    tags: tags.length ? tags : fallback.tags,
    suggested_theme: theme,
    price_suggestion: normalizePriceSuggestion(parsed.price_suggestion),
    category,
    confidence: normalizeConfidence(parsed.confidence),
  }
}

function buildFallbackCopy(note?: string, filename?: string): DraftPayload {
  return {
    title: titleFromText(note, filename || 'Telegram Catalog Draft'),
    description: note || 'Draft catalog intake from Telegram. Editorial copy pending.',
    provenance: null,
    tags: ['telegram', 'catalog', 'needs-review'],
    suggested_theme: 'analog-objects',
    price_suggestion: null,
    category: 'objects',
    confidence: 0.2,
  }
}

function buildInitialPrompt(input: {
  note?: string
  sourceUrl?: string
  filename?: string
}) {
  const note = input.note?.trim() || ''
  const sourceUrl = input.sourceUrl?.trim() || ''
  const filename = input.filename?.trim() || ''
  return `You are writing a product listing for Buena Onda, an analog culture house in Miami.

Valid categories:
- garments
- objects
- sound
- original

Valid themes:
- curated-vintage
- analog-objects
- sound-collection
- buena-onda-original

Source context:
- Caption or note: ${note}
- URL: ${sourceUrl}
- Filename: ${filename}

Extract all product details from this image and write catalog copy following the voice guide.

Return only valid JSON:
{
  "title": "...",
  "description": "...",
  "provenance": null,
  "tags": ["..."],
  "suggested_theme": "curated-vintage|analog-objects|sound-collection|buena-onda-original",
  "price_suggestion": 0,
  "category": "garments|objects|sound|original",
  "confidence": 0.0
}`
}

function buildRevisionPrompt(input: {
  session: ConversationSession
  request: string
}) {
  return `You are revising a draft catalog listing for Buena Onda. Use the full conversation history and the current draft below.

Current draft JSON:
${JSON.stringify(input.session.draft ?? {}, null, 2)}

User request:
${input.request.trim()}

Valid categories:
- garments
- objects
- sound
- original

Valid themes:
- curated-vintage
- analog-objects
- sound-collection
- buena-onda-original

Return only valid JSON with this shape:
{
  "title": "...",
  "description": "...",
  "provenance": null,
  "tags": ["..."],
  "suggested_theme": "curated-vintage|analog-objects|sound-collection|buena-onda-original",
  "price_suggestion": 0,
  "category": "garments|objects|sound|original",
  "confidence": 0.0
}`
}

function toClaudeMessages(messages: SessionMessage[]) {
  return messages.map(message => ({
    role: message.role,
    content: [{ type: 'text', text: message.content }],
  })) as Array<{ role: 'user' | 'assistant'; content: Array<{ type: 'text'; text: string }> }>
}

function extractClaudeText(response: { content: Array<{ type?: string; text?: string }> }) {
  const block = response.content.find(part => part.type === 'text' && typeof part.text === 'string')
  return block?.text ?? ''
}

async function callClaudeForCopy(input: {
  image?: { buffer: Uint8Array; contentType: string; filename?: string }
  note?: string
  sourceUrl?: string
  filename?: string
  session?: ConversationSession
  revisionRequest?: string
}) {
  const fallback = input.session?.draft && input.revisionRequest
    ? {
        title: input.session.draft.title,
        description: input.session.draft.description,
        provenance: input.session.draft.provenance,
        tags: input.session.draft.tags,
        suggested_theme: input.session.draft.theme,
        price_suggestion: input.session.draft.price,
        category: input.session.draft.category,
        confidence: input.session.draft.confidence,
      }
    : buildFallbackCopy(input.note, input.filename)
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallback

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: VOICE_V2_PROMPT,
      messages: input.session && input.revisionRequest
        ? [
            ...toClaudeMessages(input.session.messages),
            {
              role: 'user',
              content: [{ type: 'text', text: buildRevisionPrompt({ session: input.session, request: input.revisionRequest }) }],
            },
          ]
        : [{
            role: 'user',
            content: [
              ...(input.image
                ? [{
                    type: 'image' as const,
                    source: {
                      type: 'base64' as const,
                      media_type: normalizeMediaType(input.image.contentType),
                      data: bytesToBase64(input.image.buffer),
                    },
                  }]
                : []),
              {
                type: 'text' as const,
                text: buildInitialPrompt({
                  note: input.note,
                  sourceUrl: input.sourceUrl,
                  filename: input.filename,
                }),
              },
            ],
          }],
      temperature: 0.2,
    })

    const parsed = parseJson(extractClaudeText(response))
    return normalizeCopy(parsed, fallback)
  } catch {
    return fallback
  }
}

function draftToSessionDraft(
  copy: DraftPayload,
  imageUrl: string | null,
  sourceUrl: string | null,
): SessionDraft {
  return {
    title: copy.title,
    description: copy.description,
    price: copy.price_suggestion,
    tags: copy.tags,
    theme: copy.suggested_theme,
    cover_image_url: imageUrl,
    category: copy.category,
    provenance: copy.provenance,
    confidence: copy.confidence,
    source_url: sourceUrl,
    price_suggestion: copy.price_suggestion,
  }
}

function draftToDetails(draft: SessionDraft, extras?: { note?: string; filename?: string; image?: { beforeSize: number; afterSize: number }; chatId?: string | number }): Record<string, unknown> {
  return {
    category: draft.category,
    theme: draft.theme,
    provenance: draft.provenance,
    confidence: draft.confidence,
    source_url: draft.source_url,
    telegram_note: extras?.note ?? null,
    telegram_filename: extras?.filename ?? null,
    telegram_chat_id: extras?.chatId == null ? null : String(extras.chatId),
    image_before_size: extras?.image?.beforeSize ?? null,
    image_after_size: extras?.image?.afterSize ?? null,
  } as Record<string, unknown>
}

function formatDraftMessage(draft: SessionDraft) {
  const tags = draft.tags.join(', ') || '—'
  const provenance = draft.provenance ? `\n\n${escapeHtml(draft.provenance)}` : ''
  return [
    '<b>DRAFT</b>',
    `<b>${escapeHtml(draft.title)}</b>`,
    escapeHtml(draft.description).replace(/\n/g, '<br/>'),
    provenance ? provenance.replace(/\n/g, '<br/>') : '',
    '',
    `Tags: ${escapeHtml(tags)}`,
    `Theme: ${escapeHtml(draft.theme)}`,
    `Price: ${escapeHtml(formatPrice(draft.price))}`,
    `Confidence: ${escapeHtml(formatConfidence(draft.confidence))}`,
    '',
    'Reply to refine or say <b>publish</b> to save to catalog.',
  ].filter(Boolean).join('\n')
}

async function getConversationSession(chatId: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('conversation_sessions')
    .select('id,chat_id,draft,messages,state,updated_at')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (error) throw error
  return data as ConversationSession | null
}

async function saveConversationSession(input: {
  chatId: string
  draft: SessionDraft | null
  messages: SessionMessage[]
  state: ConversationState
}) {
  const supabase = createServiceRoleClient()
  const payload = {
    chat_id: input.chatId,
    draft: input.draft,
    messages: input.messages,
    state: input.state,
  }
  const { data, error } = await supabase
    .from('conversation_sessions')
    .upsert(payload, { onConflict: 'chat_id' })
    .select('id,chat_id,draft,messages,state,updated_at')
    .single()

  if (error) throw error
  return data as ConversationSession
}

async function clearConversationSession(chatId: string) {
  return saveConversationSession({
    chatId,
    draft: null,
    messages: [],
    state: 'idle',
  })
}

async function publishConversationDraft(chatId: string, session: ConversationSession) {
  const draft = session.draft
  if (!draft) throw new Error('No active draft')

  const supabase = createServiceRoleClient()
  const { data: theme } = await supabase
    .from('themes')
    .select('id')
    .eq('slug', draft.theme)
    .maybeSingle()

  const title = draft.title || titleFromText(draft.description, 'Telegram Catalog Draft')
  const slug = `${slugify(title)}-${Date.now()}`
  const { data, error } = await supabase
    .from('items')
    .insert({
      title,
      slug,
      theme_id: theme?.id ?? null,
      description: draft.description || null,
      details: draftToDetails(draft, { chatId }),
      price: draft.price ?? null,
      tags: draft.tags,
      status: 'draft',
      availability: 'available',
      sourcing_model: 'reservation',
      cover_image_url: draft.cover_image_url,
      published_at: null,
    })
    .select('id,title,slug,status,cover_image_url')
    .single()

  if (error) throw error
  await clearConversationSession(chatId)
  return data
}

async function handlePhoto(message: TelegramMessage) {
  const chatId = message.chat!.id!
  const photo = [...(message.photo ?? [])].sort((a, b) => (b.file_size ?? b.width * b.height) - (a.file_size ?? a.width * a.height))[0]
  if (!photo && !message.photo_url) return reply(chatId, 'Send me a photo of the item to get started.')

  const file = message.photo_url
    ? {
        filename: message.photo_url.split('/').pop() || 'photo',
        contentType: 'image/jpeg',
        buffer: new Uint8Array(await (await fetch(message.photo_url)).arrayBuffer()),
      }
    : await getTelegramFile(photo.file_id)

  const image = await uploadCatalogImage(file.buffer, 'intake', file.contentType, file.filename)
  const copy = await callClaudeForCopy({
    image: {
      buffer: file.buffer,
      contentType: file.contentType,
      filename: file.filename,
    },
    note: message.caption,
    sourceUrl: undefined,
    filename: file.filename,
  })

  const draft = draftToSessionDraft(copy, image.url, null)
  const session = await saveConversationSession({
    chatId: String(chatId),
    draft,
    messages: [
      {
        role: 'user',
        content: message.caption?.trim() || 'Photo intake submitted.',
        created_at: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: JSON.stringify(copy),
        created_at: new Date().toISOString(),
      },
    ],
    state: 'drafting',
  })

  const sent = await reply(chatId, formatDraftMessage(session.draft ?? draft), 'HTML')
  return { session, image, reply: sent }
}

async function handleDraftText(message: TelegramMessage, session: ConversationSession) {
  const chatId = message.chat!.id!
  const text = message.text?.trim() || ''
  const lower = text.toLowerCase()

  if (!session.draft) {
    const sent = await reply(chatId, 'Send me a photo of the item to get started.')
    return { reply: sent }
  }

  if (lower === 'publish') {
    const record = await publishConversationDraft(String(chatId), session)
    const sent = await reply(chatId, '✅ Draft saved to catalog. Open /studio/catalog to review and publish.')
    return { record, reply: sent, action: 'publish' }
  }

  if (lower === 'discard') {
    await clearConversationSession(String(chatId))
    const sent = await reply(chatId, 'Discarded.')
    return { reply: sent, action: 'discard' }
  }

  const priceMatch = lower.match(/^price\s+\$?(\d+(?:\.\d{1,2})?)$/i)
  if (priceMatch) {
    const nextPrice = Number.parseFloat(priceMatch[1])
    if (!Number.isFinite(nextPrice)) {
      const sent = await reply(chatId, 'Use `price 45` or `price 45.00`.')
      return { reply: sent, action: 'price-invalid' }
    }
    const nextDraft: SessionDraft = {
      ...session.draft,
      price: nextPrice,
      price_suggestion: nextPrice,
    }
    const nextSession = await saveConversationSession({
      chatId: String(chatId),
      draft: nextDraft,
      messages: [
        ...session.messages,
        {
          role: 'user',
          content: text,
          created_at: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: JSON.stringify(nextDraft),
          created_at: new Date().toISOString(),
        },
      ],
      state: 'drafting',
    })
    const sent = await reply(chatId, formatDraftMessage(nextSession.draft ?? nextDraft), 'HTML')
    return { session: nextSession, reply: sent, action: 'price' }
  }

  const copy = await callClaudeForCopy({
    note: text,
    session,
    revisionRequest: text,
    filename: session.draft.cover_image_url ?? undefined,
  })
  const nextDraft = draftToSessionDraft(copy, session.draft.cover_image_url, session.draft.source_url)
  const nextSession = await saveConversationSession({
    chatId: String(chatId),
    draft: nextDraft,
    messages: [
      ...session.messages,
      {
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: JSON.stringify(copy),
        created_at: new Date().toISOString(),
      },
    ],
    state: 'drafting',
  })
  const sent = await reply(chatId, formatDraftMessage(nextSession.draft ?? nextDraft), 'HTML')
  return { session: nextSession, reply: sent, action: 'revise' }
}

async function saveCatalogDraft(input: {
  note?: string
  sourceUrl?: string
  imageUrl: string | null
  filename?: string
  image?: { beforeSize: number; afterSize: number }
}) {
  const supabase = createServiceRoleClient()
  const copy = await callClaudeForCopy({
    note: input.note,
    sourceUrl: input.sourceUrl,
    filename: input.filename,
  })
  const { data: theme } = await supabase
    .from('themes')
    .select('id')
    .eq('slug', copy.suggested_theme)
    .maybeSingle()
  const title = copy.title || titleFromText(input.note, 'Telegram Catalog Draft')
  const draft = draftToSessionDraft(copy, input.imageUrl, input.sourceUrl ?? null)
  const { data, error } = await supabase
    .from('items')
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now()}`,
      theme_id: theme?.id ?? null,
      description: copy.description || null,
      details: draftToDetails(draft, {
        note: input.note,
        filename: input.filename,
        image: input.image,
      }),
      price: draft.price ?? null,
      tags: copy.tags,
      status: 'draft',
      availability: 'available',
      sourcing_model: 'reservation',
      cover_image_url: input.imageUrl,
    })
    .select('id,title,slug,status,cover_image_url')
    .single()
  if (error) throw error
  return { record: data, image: input.image ?? null, draft }
}

async function handleCatalogUrl(message: TelegramMessage, url: string) {
  const chatId = message.chat!.id!
  if (/facebook\.com\/marketplace/i.test(url)) {
    const sent = await reply(chatId, 'Marketplace blocks image fetch. Send the photos directly instead.')
    return { rejected: true, reply: sent }
  }
  const og = await fetchOpenGraph(url)
  let image: Awaited<ReturnType<typeof uploadCatalogImage>> | null = null
  if (og.image) {
    const response = await fetch(og.image, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`og:image fetch failed with ${response.status}`)
    image = await uploadCatalogImage(new Uint8Array(await response.arrayBuffer()), 'intake', response.headers.get('content-type') ?? 'image/jpeg', og.image)
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
    if (message.photo?.length || message.photo_url) {
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

    const chatId = String(message.chat.id)
    const session = await getConversationSession(chatId)
    if (session && session.state !== 'idle' && message.text?.trim()) {
      const result = await handleDraftText(message, session)
      return NextResponse.json({ ok: true, type: 'drafting', result })
    }

    const sent = await reply(message.chat.id, 'Send me a photo of the item to get started.')
    return NextResponse.json({ ok: true, type: 'fallback', reply: sent })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Telegram webhook failed'
    await reply(message.chat.id, `Intake failed: ${reason}`).catch(() => null)
    return NextResponse.json({ ok: true, error: reason })
  }
}
