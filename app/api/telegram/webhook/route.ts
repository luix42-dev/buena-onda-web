import { createHash } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  buildFallbackCopy,
  callClaudeForCopy,
  type CopyRevisionMessage,
  type DraftPayload,
  titleFromText,
} from '@/lib/intake/catalog-copy'
import {
  answerTelegramCallbackQuery,
  downloadTelegramFile,
  isAllowedChat,
  sendTelegramMessage,
  type TelegramMessage,
  type TelegramUpdate,
} from '@/lib/telegram/bot'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ConversationState = 'idle' | 'drafting' | 'awaiting_confirmation'
type ProcessingStatus = 'queued' | 'processing' | 'ready' | 'failed'
type IntakeJobType = 'intake' | 'closeup' | 'recolor'

type SessionMessage = {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

type SessionDraft = {
  item_id: string
  title: string
  description: string
  why_chosen: string | null
  price: number | null
  tags: string[]
  theme: string
  cover_image_url: string | null
  category: string
  provenance: string | null
  confidence: number
  source_url: string | null
  price_suggestion: number | null
  source_storage_path: string
  selected_campaign_color: string | null
  requested_campaign_color: string | null
  processing_status: ProcessingStatus
  qc_failed: boolean
  closeup_count: number
}

type ConversationSession = {
  id: string
  chat_id: string
  draft: SessionDraft | null
  messages: SessionMessage[]
  state: ConversationState
  updated_at: string
}

type ItemRecord = {
  id: string
  title: string
  slug: string
  status: string
  cover_image_url: string | null
  details: Record<string, unknown> | null
  description?: string | null
  why_chosen?: string | null
  tags?: string[] | null
}

const PALETTE = ['teal', 'pink', 'coral', 'charcoal', 'cyan', 'cream'] as const
type CampaignColor = typeof PALETTE[number]

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'telegram-catalog-draft'
}

function deterministicUuid(seed: string) {
  const hash = createHash('sha1').update(seed).digest()
  const bytes = Uint8Array.from(hash.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Buffer.from(bytes).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function publicCatalogUrl(storagePath: string) {
  return createServiceRoleClient().storage.from('catalog').getPublicUrl(storagePath).data.publicUrl
}

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

function formatConfidence(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '0.00'
  return value.toFixed(2)
}

function isCampaignColor(value: string): value is CampaignColor {
  return (PALETTE as readonly string[]).includes(value)
}

function parseCommand(text: string | undefined) {
  const match = text?.trim().match(/^\/(catalog|transmission|radio)\s+(\S+)/i)
  return match ? { command: match[1].toLowerCase(), url: match[2] } : null
}

function parseColorCommand(text: string | undefined) {
  const match = text?.trim().toLowerCase().match(/^color\s+(teal|pink|coral|charcoal|cyan|cream)$/)
  return match ? match[1] as CampaignColor : null
}

function parseColorCallback(data: string | undefined) {
  const match = data?.match(/^color:(teal|pink|coral|charcoal|cyan|cream):([a-f0-9-]{36})$/i)
  if (!match) return null
  return {
    color: match[1].toLowerCase() as CampaignColor,
    itemId: match[2],
  }
}

function sessionDraftToCopy(draft: SessionDraft): DraftPayload {
  return {
    title: draft.title,
    description: draft.description,
    why_chosen: draft.why_chosen,
    provenance: draft.provenance,
    tags: draft.tags,
    suggested_theme: draft.theme,
    price_suggestion: draft.price_suggestion,
    category: draft.category,
    confidence: draft.confidence,
  }
}

function mergeDetails(existing: Record<string, unknown> | null | undefined, patch: Record<string, unknown>) {
  return {
    ...(existing ?? {}),
    ...patch,
  }
}

function buildSessionDraft(input: {
  itemId: string
  sourceStoragePath: string
  coverImageUrl: string
  title: string
  note?: string
}): SessionDraft {
  const fallback = buildFallbackCopy(input.note, input.title)
  return {
    item_id: input.itemId,
    title: fallback.title || input.title,
    description: fallback.description,
    why_chosen: fallback.why_chosen,
    price: fallback.price_suggestion,
    tags: fallback.tags,
    theme: fallback.suggested_theme,
    cover_image_url: input.coverImageUrl,
    category: fallback.category,
    provenance: fallback.provenance,
    confidence: fallback.confidence,
    source_url: null,
    price_suggestion: fallback.price_suggestion,
    source_storage_path: input.sourceStoragePath,
    selected_campaign_color: null,
    requested_campaign_color: null,
    processing_status: 'queued',
    qc_failed: false,
    closeup_count: 0,
  }
}

function buildDraftMessage(draft: SessionDraft) {
  const color = draft.selected_campaign_color ?? 'pending'
  const statusLine = draft.processing_status === 'ready'
    ? draft.qc_failed
      ? 'Needs reshoot'
      : 'Frames ready'
    : draft.processing_status === 'failed'
      ? 'Processing failed'
      : 'Processing queued'

  return [
    'DRAFT',
    draft.title,
    draft.description,
    draft.why_chosen ? `Why We Chose This\n${draft.why_chosen}` : '',
    '',
    `Status: ${statusLine}`,
    `Campaign Color: ${color}`,
    `Tags: ${draft.tags.join(', ') || '—'}`,
    `Theme: ${draft.theme}`,
    `Price: ${formatPrice(draft.price)}`,
    `Confidence: ${formatConfidence(draft.confidence)}`,
    '',
    'Reply to refine copy, use `price 45`, or send `color teal` to override the campaign frame.',
  ].filter(Boolean).join('\n')
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

async function uploadCatalogBytes(storagePath: string, buffer: Uint8Array, contentType: string, upsert = true) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.storage
    .from('catalog')
    .upload(storagePath, Buffer.from(buffer), { contentType, upsert })
  if (error) throw error
  if (!data?.path) throw new Error(`Storage upload returned no path for ${storagePath}`)
  return publicCatalogUrl(storagePath)
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
  const { data, error } = await supabase
    .from('conversation_sessions')
    .upsert({
      chat_id: input.chatId,
      draft: input.draft,
      messages: input.messages,
      state: input.state,
    }, { onConflict: 'chat_id' })
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

async function getThemeId(slug: string | null) {
  if (!slug) return null
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('themes')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  return data?.id ?? null
}

async function ensureDraftItem(input: {
  itemId: string
  sourceStoragePath: string
  coverImageUrl: string
  chatId: string
  note?: string
}) {
  const supabase = createServiceRoleClient()
  const existing = await supabase
    .from('items')
    .select('id,title,slug,status,cover_image_url,details,description,why_chosen,tags')
    .eq('id', input.itemId)
    .maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) {
    return existing.data as ItemRecord
  }

  const title = titleFromText(input.note, 'Telegram Catalog Draft')
  const slug = `${slugify(title)}-${input.itemId.slice(0, 8)}`
  const details = {
    category: 'objects',
    theme: 'analog-objects',
    telegram_chat_id: input.chatId,
    telegram_note: input.note ?? null,
    source_storage_path: input.sourceStoragePath,
    intake_status: 'queued',
    qc_failed: false,
    qc_failed_reason: null,
    frame_roles: { source: input.sourceStoragePath },
    selected_campaign_color: null,
    requested_campaign_color: null,
    closeup_state: 'awaiting-primary-processing',
  }

  const inserted = await supabase
    .from('items')
    .insert({
      id: input.itemId,
      title,
      slug,
      theme_id: await getThemeId('analog-objects'),
      description: 'Processing intake frames and draft copy.',
      why_chosen: null,
      details,
      price: null,
      tags: ['telegram', 'catalog', 'needs-review'],
      status: 'draft',
      availability: 'available',
      sourcing_model: 'reservation',
      cover_image_url: input.coverImageUrl,
    })
    .select('id,title,slug,status,cover_image_url,details,description,why_chosen,tags')
    .single()

  if (inserted.error) {
    if (inserted.error.code === '23505') {
      const retry = await supabase
        .from('items')
        .select('id,title,slug,status,cover_image_url,details,description,why_chosen,tags')
        .eq('id', input.itemId)
        .single()
      if (retry.error) throw retry.error
      return retry.data as ItemRecord
    }
    throw inserted.error
  }

  const rawImageId = deterministicUuid(`${input.itemId}:raw-source`)
  const rawImageInsert = await supabase
    .from('item_images')
    .upsert({
      id: rawImageId,
      item_id: input.itemId,
      url: input.coverImageUrl,
      storage_path: input.sourceStoragePath,
      alt_text: 'Raw source photo',
      sort_order: 0,
    }, { onConflict: 'id' })

  if (rawImageInsert.error) throw rawImageInsert.error
  return inserted.data as ItemRecord
}

async function updateItemFromDraft(itemId: string, draft: SessionDraft, detailsPatch?: Record<string, unknown>) {
  const supabase = createServiceRoleClient()
  const current = await supabase
    .from('items')
    .select('details')
    .eq('id', itemId)
    .single()
  if (current.error) throw current.error

  const update = await supabase
    .from('items')
    .update({
      title: draft.title,
      description: draft.description,
      why_chosen: draft.why_chosen,
      tags: draft.tags,
      theme_id: await getThemeId(draft.theme),
      cover_image_url: draft.cover_image_url,
      details: mergeDetails(current.data.details as Record<string, unknown> | null, detailsPatch ?? {}),
      price: draft.price,
    })
    .eq('id', itemId)
    .select('id,title,slug,status,cover_image_url,details,description,why_chosen,tags')
    .single()

  if (update.error) throw update.error
  return update.data as ItemRecord
}

async function enqueueJob(input: {
  jobType: IntakeJobType
  itemId: string
  sourceStoragePath: string
  chatId: string
  telegramMessageId: number
  telegramUpdateId?: number | null
}) {
  const supabase = createServiceRoleClient()
  const insert = await supabase
    .from('intake_jobs')
    .insert({
      item_id: input.itemId,
      job_type: input.jobType,
      telegram_update_id: input.telegramUpdateId ?? null,
      source_storage_path: input.sourceStoragePath,
      status: 'queued',
      chat_id: input.chatId,
      telegram_message_id: input.telegramMessageId,
      attempts: 0,
      error: null,
    })
    .select('id')
    .single()

  if (insert.error) {
    if (insert.error.code === '23505') return { duplicate: true, id: null as string | null }
    throw insert.error
  }

  return { duplicate: false, id: insert.data.id as string }
}

async function maybeExistingCloseupJob(itemId: string, telegramMessageId: number) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('intake_jobs')
    .select('id')
    .eq('item_id', itemId)
    .eq('job_type', 'closeup')
    .eq('telegram_message_id', telegramMessageId)
    .in('status', ['queued', 'processing', 'done'])
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

async function handleInitialPhoto(message: TelegramMessage, updateId: number | undefined) {
  const chatId = String(message.chat!.id!)
  const photo = [...(message.photo ?? [])].sort((a, b) => (b.file_size ?? b.width * b.height) - (a.file_size ?? a.width * a.height))[0]
  if (!photo) {
    const sent = await sendTelegramMessage(chatId, 'Send me a photo of the item to get started.')
    return { reply: sent, action: 'missing-photo' }
  }

  const file = await downloadTelegramFile(photo.file_id)
  const intakeKey = updateId == null ? `${chatId}:${photo.file_id}` : `${chatId}:${updateId}`
  const itemId = deterministicUuid(`telegram-intake:${intakeKey}`)
  const sourceStoragePath = `items/${itemId}/telegram/00-source.png`
  const rawUrl = await uploadCatalogBytes(sourceStoragePath, file.buffer, 'image/jpeg', true)
  const item = await ensureDraftItem({
    itemId,
    sourceStoragePath,
    coverImageUrl: rawUrl,
    chatId,
    note: message.caption,
  })

  const draft = buildSessionDraft({
    itemId,
    sourceStoragePath,
    coverImageUrl: rawUrl,
    title: item.title,
    note: message.caption,
  })

  const session = await saveConversationSession({
    chatId,
    draft,
    messages: [{
      role: 'user',
      content: message.caption?.trim() || 'Photo intake submitted.',
      created_at: new Date().toISOString(),
    }],
    state: 'drafting',
  })

  const job = await enqueueJob({
    jobType: 'intake',
    itemId,
    sourceStoragePath,
    chatId,
    telegramMessageId: message.message_id,
    telegramUpdateId: updateId ?? null,
  })

  if (job.duplicate) {
    const sent = await sendTelegramMessage(chatId, 'got it — queued, frames coming shortly.')
    return { duplicate: true, reply: sent, session }
  }

  const sent = await sendTelegramMessage(chatId, 'got it — queued, frames coming shortly.')
  return { item, session, reply: sent, sourceStoragePath, rawUrl }
}

async function handleCloseupPhoto(message: TelegramMessage, session: ConversationSession) {
  const chatId = String(message.chat!.id!)
  const draft = session.draft
  if (!draft?.item_id) {
    return handleInitialPhoto(message, undefined)
  }

  const existingJobId = await maybeExistingCloseupJob(draft.item_id, message.message_id)
  if (existingJobId) {
    const sent = await sendTelegramMessage(chatId, 'got it — queued, frames coming shortly.')
    return { reply: sent, duplicate: true }
  }

  const photo = [...(message.photo ?? [])].sort((a, b) => (b.file_size ?? b.width * b.height) - (a.file_size ?? a.width * a.height))[0]
  if (!photo) {
    const sent = await sendTelegramMessage(chatId, 'Send me a photo of the item to get started.')
    return { reply: sent, action: 'missing-photo' }
  }

  const file = await downloadTelegramFile(photo.file_id)
  const sourceStoragePath = `items/${draft.item_id}/telegram/closeups/${message.message_id}-source.png`
  await uploadCatalogBytes(sourceStoragePath, file.buffer, 'image/jpeg', true)
  await enqueueJob({
    jobType: 'closeup',
    itemId: draft.item_id,
    sourceStoragePath,
    chatId,
    telegramMessageId: message.message_id,
    telegramUpdateId: null,
  })

  const nextDraft: SessionDraft = {
    ...draft,
    processing_status: 'queued',
    closeup_count: draft.closeup_count + 1,
  }

  await updateItemFromDraft(draft.item_id, nextDraft, {
    source_storage_path: draft.source_storage_path,
    closeup_state: 'queued',
  })

  await saveConversationSession({
    chatId,
    draft: nextDraft,
    messages: [
      ...session.messages,
      {
        role: 'user',
        content: message.caption?.trim() || 'Close-up submitted.',
        created_at: new Date().toISOString(),
      },
    ],
    state: session.state,
  })

  const sent = await sendTelegramMessage(chatId, 'got it — queued, frames coming shortly.')
  return { reply: sent }
}

async function queueRecolor(chatId: string, session: ConversationSession, color: CampaignColor, telegramMessageId: number) {
  const draft = session.draft
  if (!draft?.item_id) {
    const sent = await sendTelegramMessage(chatId, 'No active draft to recolor.')
    return { reply: sent, action: 'missing-draft' }
  }

  const nextDraft: SessionDraft = {
    ...draft,
    requested_campaign_color: color,
    processing_status: 'queued',
  }

  await updateItemFromDraft(draft.item_id, nextDraft, {
    requested_campaign_color: color,
    selected_campaign_color: draft.selected_campaign_color,
    source_storage_path: draft.source_storage_path,
  })

  const nextSession = await saveConversationSession({
    chatId,
    draft: nextDraft,
    messages: [
      ...session.messages,
      {
        role: 'user',
        content: `color ${color}`,
        created_at: new Date().toISOString(),
      },
    ],
    state: session.state,
  })

  await enqueueJob({
    jobType: 'recolor',
    itemId: draft.item_id,
    sourceStoragePath: draft.source_storage_path,
    chatId,
    telegramMessageId,
    telegramUpdateId: null,
  })

  const sent = await sendTelegramMessage(chatId, `got it — queued a ${color} campaign frame refresh.`)
  return { reply: sent, session: nextSession, action: 'recolor' }
}

async function handleDraftText(message: TelegramMessage, session: ConversationSession) {
  const chatId = String(message.chat!.id!)
  const text = message.text?.trim() || ''
  const lower = text.toLowerCase()

  if (!session.draft) {
    const sent = await sendTelegramMessage(chatId, 'Send me a photo of the item to get started.')
    return { reply: sent }
  }

  const color = parseColorCommand(text)
  if (color) {
    return queueRecolor(chatId, session, color, message.message_id)
  }

  if (lower === 'publish') {
    const sent = await sendTelegramMessage(chatId, 'Draft already saved to catalog. Open /studio/catalog to review and publish.')
    return { reply: sent, action: 'publish' }
  }

  if (lower === 'discard') {
    await clearConversationSession(chatId)
    const sent = await sendTelegramMessage(chatId, 'Session cleared. Draft remains in /studio/catalog.')
    return { reply: sent, action: 'discard' }
  }

  const priceMatch = lower.match(/^price\s+\$?(\d+(?:\.\d{1,2})?)$/i)
  if (priceMatch) {
    const nextPrice = Number.parseFloat(priceMatch[1])
    if (!Number.isFinite(nextPrice)) {
      const sent = await sendTelegramMessage(chatId, 'Use `price 45` or `price 45.00`.')
      return { reply: sent, action: 'price-invalid' }
    }
    const nextDraft: SessionDraft = {
      ...session.draft,
      price: nextPrice,
      price_suggestion: nextPrice,
    }
    await updateItemFromDraft(nextDraft.item_id, nextDraft, {
      source_storage_path: nextDraft.source_storage_path,
    })
    const nextSession = await saveConversationSession({
      chatId,
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
    const sent = await sendTelegramMessage(chatId, buildDraftMessage(nextSession.draft ?? nextDraft))
    return { reply: sent, action: 'price', session: nextSession }
  }

  if (session.draft.processing_status !== 'ready') {
    const sent = await sendTelegramMessage(chatId, 'Still processing this draft. Frames and copy are queued.')
    return { reply: sent, action: 'processing' }
  }

  const revisionMessages: CopyRevisionMessage[] = session.messages.map((entry) => ({
    role: entry.role,
    content: entry.content,
  }))
  const copy = await callClaudeForCopy({
    note: text,
    filename: session.draft.cover_image_url ?? undefined,
    revision: {
      draft: sessionDraftToCopy(session.draft),
      request: text,
      messages: revisionMessages,
    },
  })

  const nextDraft: SessionDraft = {
    ...session.draft,
    title: copy.title,
    description: copy.description,
    why_chosen: copy.why_chosen,
    tags: copy.tags,
    theme: copy.suggested_theme,
    category: copy.category,
    provenance: copy.provenance,
    confidence: copy.confidence,
    price: copy.price_suggestion,
    price_suggestion: copy.price_suggestion,
  }

  await updateItemFromDraft(nextDraft.item_id, nextDraft, {
    category: nextDraft.category,
    theme: nextDraft.theme,
    provenance: nextDraft.provenance,
    confidence: nextDraft.confidence,
    source_storage_path: nextDraft.source_storage_path,
    selected_campaign_color: nextDraft.selected_campaign_color,
    requested_campaign_color: nextDraft.requested_campaign_color,
    qc_failed: nextDraft.qc_failed,
  })

  const nextSession = await saveConversationSession({
    chatId,
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
  const sent = await sendTelegramMessage(chatId, buildDraftMessage(nextSession.draft ?? nextDraft))
  return { reply: sent, action: 'revise', session: nextSession }
}

async function saveCatalogDraft(input: {
  note?: string
  sourceUrl?: string
  imageUrl: string | null
  filename?: string
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
  const { data, error } = await supabase
    .from('items')
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now()}`,
      theme_id: theme?.id ?? null,
      description: copy.description || null,
      why_chosen: copy.why_chosen,
      details: {
        provenance: copy.provenance,
        confidence: copy.confidence,
        source_url: input.sourceUrl || null,
      },
      price: copy.price_suggestion ?? null,
      tags: copy.tags,
      status: 'draft',
      availability: 'available',
      sourcing_model: 'reservation',
      cover_image_url: input.imageUrl,
    })
    .select('id,title,slug,status,cover_image_url')
    .single()
  if (error) throw error
  return { record: data }
}

async function handleCatalogUrl(message: TelegramMessage, url: string) {
  const chatId = String(message.chat!.id!)
  if (/facebook\.com\/marketplace/i.test(url)) {
    const sent = await sendTelegramMessage(chatId, 'Marketplace blocks image fetch. Send the photos directly instead.')
    return { rejected: true, reply: sent }
  }
  const og = await fetchOpenGraph(url)
  let imageUrl: string | null = null
  if (og.image) {
    const response = await fetch(og.image, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`og:image fetch failed with ${response.status}`)
    const itemId = deterministicUuid(`catalog-url:${url}`)
    imageUrl = await uploadCatalogBytes(`items/${itemId}/telegram/00-source.png`, new Uint8Array(await response.arrayBuffer()), response.headers.get('content-type') ?? 'image/jpeg', true)
  }
  const saved = await saveCatalogDraft({
    note: [og.title, og.description].filter(Boolean).join('\n'),
    sourceUrl: url,
    imageUrl,
    filename: og.image || url,
  })
  const sent = await sendTelegramMessage(chatId, `Draft saved: ${saved.record.title} — review in studio`)
  return { ...saved, reply: sent }
}

async function handleTransmissionUrl(message: TelegramMessage, url: string) {
  const chatId = String(message.chat!.id!)
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
  const sent = await sendTelegramMessage(chatId, 'Saved to Transmission drafts.')
  return { record: data, reply: sent }
}

async function handleRadioUrl(message: TelegramMessage, url: string) {
  const chatId = String(message.chat!.id!)
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
  const sent = await sendTelegramMessage(chatId, 'Saved to Radio drafts.')
  return { record: data, reply: sent }
}

async function handleCallbackQuery(update: TelegramUpdate) {
  const callback = update.callback_query
  const chatId = callback?.message?.chat?.id
  if (!callback?.id || !isAllowedChat(chatId)) {
    return NextResponse.json({ ok: true })
  }

  const parsed = parseColorCallback(callback.data)
  if (!parsed) {
    await answerTelegramCallbackQuery(callback.id, 'Unknown action').catch(() => null)
    return NextResponse.json({ ok: true, ignored: true })
  }

  const session = await getConversationSession(String(chatId))
  if (!session?.draft || session.draft.item_id !== parsed.itemId) {
    await answerTelegramCallbackQuery(callback.id, 'Draft not active').catch(() => null)
    return NextResponse.json({ ok: true, ignored: true })
  }

  await answerTelegramCallbackQuery(callback.id, `Queued ${parsed.color} override`).catch(() => null)
  const result = await queueRecolor(String(chatId), session, parsed.color, callback.message?.message_id ?? 0)
  return NextResponse.json({ ok: true, type: 'callback', result })
}

export async function POST(request: NextRequest) {
  let update: TelegramUpdate
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (update.callback_query) {
    try {
      return await handleCallbackQuery(update)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Telegram callback failed'
      const chatId = update.callback_query.message?.chat?.id
      if (chatId != null) {
        await sendTelegramMessage(String(chatId), `Intake failed: ${reason}`).catch(() => null)
      }
      return NextResponse.json({ ok: true, error: reason })
    }
  }

  const message = update.message
  if (!message?.chat?.id || !isAllowedChat(message.chat.id)) {
    return NextResponse.json({ ok: true })
  }

  try {
    console.log('WEBHOOK_DEBUG', JSON.stringify({
      update_id: update.update_id,
      chat_id: message.chat.id,
      from_id: message.from?.id,
      has_photo: Boolean(message.photo?.length),
      text: message.text ?? null,
    }))

    const chatId = String(message.chat.id)
    const session = await getConversationSession(chatId)

    if (message.photo?.length) {
      const result = session && session.state !== 'idle' && session.draft?.item_id
        ? await handleCloseupPhoto(message, session)
        : await handleInitialPhoto(message, update.update_id)
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

    if (session && session.state !== 'idle' && message.text?.trim()) {
      const result = await handleDraftText(message, session)
      return NextResponse.json({ ok: true, type: 'drafting', result })
    }

    const sent = await sendTelegramMessage(chatId, 'Send me a photo of the item to get started.')
    return NextResponse.json({ ok: true, type: 'fallback', reply: sent })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Telegram webhook failed'
    await sendTelegramMessage(String(message.chat.id), `Intake failed: ${reason}`).catch(() => null)
    return NextResponse.json({ ok: true, error: reason })
  }
}
