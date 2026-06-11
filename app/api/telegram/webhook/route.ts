import { createHash } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { logAudit } from '@/lib/audit'
import {
  callClaudeForCopyStrict,
  titleFromText,
  type DraftPayload,
} from '@/lib/intake/catalog-copy'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  downloadTelegramFile,
  isAllowedChat,
  sendTelegramMessage,
  type TelegramMessage,
  type TelegramUpdate,
} from '@/lib/telegram/bot'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Simple loop: photo → synchronous description → edit/publish/discard.
// The intake_jobs worker pipeline is intentionally bypassed, not deleted.

type SessionMessage = {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

type PendingDraft = {
  item_id: string
  source_storage_path: string
  cover_image_url: string
  copy: DraftPayload
  note: string | null
}

type ConversationSession = {
  id: string
  chat_id: string
  draft: PendingDraft | null
  messages: SessionMessage[]
  state: string
  updated_at: string
}

const INSTRUCTIONS = 'Send edited text to replace the description, `publish` to save it to the catalog, or `discard` to cancel.'

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

function buildDraftReply(draft: PendingDraft) {
  return [
    draft.copy.title,
    '',
    draft.copy.description,
    '',
    INSTRUCTIONS,
  ].join('\n')
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
  draft: PendingDraft | null
  messages: SessionMessage[]
  state: string
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

async function uploadCatalogBytes(storagePath: string, buffer: Uint8Array, contentType: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.storage
    .from('catalog')
    .upload(storagePath, Buffer.from(buffer), { contentType, upsert: true })
  if (error) throw error
  if (!data?.path) throw new Error(`Storage upload returned no path for ${storagePath}`)
  return supabase.storage.from('catalog').getPublicUrl(storagePath).data.publicUrl
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

async function handlePhoto(message: TelegramMessage, updateId: number | undefined) {
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
  const coverImageUrl = await uploadCatalogBytes(sourceStoragePath, file.buffer, file.contentType)

  const copy = await callClaudeForCopyStrict({
    image: { buffer: file.buffer, contentType: file.contentType, filename: file.filename },
    note: message.caption,
    filename: file.filename,
  })

  const draft: PendingDraft = {
    item_id: itemId,
    source_storage_path: sourceStoragePath,
    cover_image_url: coverImageUrl,
    copy,
    note: message.caption?.trim() || null,
  }

  await saveConversationSession({
    chatId,
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
    state: 'awaiting_confirmation',
  })

  const sent = await sendTelegramMessage(chatId, buildDraftReply(draft))
  return { reply: sent, action: 'draft-ready', itemId }
}

async function publishDraft(chatId: string, session: ConversationSession) {
  const draft = session.draft!
  const supabase = createServiceRoleClient()
  const title = draft.copy.title || titleFromText(draft.note ?? undefined, 'Telegram Catalog Draft')
  const slug = `${slugify(title)}-${draft.item_id.slice(0, 8)}`

  const inserted = await supabase
    .from('items')
    .insert({
      id: draft.item_id,
      title,
      slug,
      theme_id: await getThemeId(draft.copy.suggested_theme),
      description: draft.copy.description || null,
      why_chosen: draft.copy.why_chosen,
      details: {
        provenance: draft.copy.provenance,
        confidence: draft.copy.confidence,
        telegram_chat_id: chatId,
        telegram_note: draft.note,
        source_storage_path: draft.source_storage_path,
      },
      price: draft.copy.price_suggestion ?? null,
      tags: draft.copy.tags,
      status: 'draft',
      availability: 'available',
      sourcing_model: 'reservation',
      cover_image_url: draft.cover_image_url,
    })
    .select('id,title,slug,status')
    .single()

  if (inserted.error && inserted.error.code !== '23505') throw inserted.error

  const rawImageInsert = await supabase
    .from('item_images')
    .upsert({
      id: deterministicUuid(`${draft.item_id}:raw-source`),
      item_id: draft.item_id,
      url: draft.cover_image_url,
      storage_path: draft.source_storage_path,
      alt_text: 'Raw source photo',
      sort_order: 0,
    }, { onConflict: 'id' })
  if (rawImageInsert.error) throw rawImageInsert.error

  await logAudit({
    subsystem: 'intake',
    action: 'create',
    item_type: 'item',
    item_id: draft.item_id,
    success: true,
    metadata: { chat_id: chatId, title, slug },
  })

  await clearConversationSession(chatId)
  const sent = await sendTelegramMessage(chatId, `Saved to catalog as draft: ${title}. Review in /studio/catalog.`)
  return { reply: sent, action: 'publish', itemId: draft.item_id }
}

async function handleText(message: TelegramMessage, session: ConversationSession | null) {
  const chatId = String(message.chat!.id!)
  const text = message.text?.trim() || ''
  const lower = text.toLowerCase()

  if (!session?.draft) {
    const sent = await sendTelegramMessage(chatId, 'Send me a photo of the item to get started.')
    return { reply: sent, action: 'no-draft' }
  }

  if (lower === 'publish') {
    return publishDraft(chatId, session)
  }

  if (lower === 'discard') {
    await clearConversationSession(chatId)
    const sent = await sendTelegramMessage(chatId, 'Discarded. Nothing was saved to the catalog.')
    return { reply: sent, action: 'discard' }
  }

  const nextDraft: PendingDraft = {
    ...session.draft,
    copy: { ...session.draft.copy, description: text },
  }

  await saveConversationSession({
    chatId,
    draft: nextDraft,
    messages: [
      ...session.messages,
      { role: 'user', content: text, created_at: new Date().toISOString() },
    ],
    state: 'awaiting_confirmation',
  })

  const sent = await sendTelegramMessage(chatId, buildDraftReply(nextDraft))
  return { reply: sent, action: 'edit' }
}

export async function POST(request: NextRequest) {
  let update: TelegramUpdate
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (update.callback_query) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const message = update.message
  if (!message?.chat?.id || !isAllowedChat(message.chat.id)) {
    return NextResponse.json({ ok: true })
  }

  const chatId = String(message.chat.id)

  try {
    if (message.photo?.length) {
      const result = await handlePhoto(message, update.update_id)
      return NextResponse.json({ ok: true, type: 'photo', result })
    }

    if (message.text?.trim()) {
      const session = await getConversationSession(chatId)
      const result = await handleText(message, session)
      return NextResponse.json({ ok: true, type: 'text', result })
    }

    const sent = await sendTelegramMessage(chatId, 'Send me a photo of the item to get started.')
    return NextResponse.json({ ok: true, type: 'fallback', reply: sent })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Telegram webhook failed'
    console.error('[telegram/webhook]', reason)
    await sendTelegramMessage(chatId, `Intake failed: ${reason}`).catch(() => null)
    return NextResponse.json({ ok: true, error: reason })
  }
}
