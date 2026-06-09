import path from 'node:path'
import dotenv from 'dotenv'
import sharp from 'sharp'
import { removeBackground } from '@imgly/background-removal-node'
import { createServiceRoleClient } from '../lib/supabase/service-role'
import { callClaudeForCopy, type DraftPayload } from '../lib/intake/catalog-copy'
import {
  sendTelegramMediaGroup,
  sendTelegramMessage,
  sendTelegramPhoto,
} from '../lib/telegram/bot'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true, quiet: true })

type IntakeJobType = 'intake' | 'closeup' | 'recolor'
type JobStatus = 'queued' | 'processing' | 'done' | 'failed'
type ProcessingStatus = 'queued' | 'processing' | 'ready' | 'failed'
type CampaignColor = 'teal' | 'pink' | 'coral' | 'charcoal' | 'cyan' | 'cream'
type ConversationState = 'idle' | 'drafting' | 'awaiting_confirmation'

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
  selected_campaign_color: CampaignColor | null
  requested_campaign_color: CampaignColor | null
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

type IntakeJobRow = {
  id: string
  item_id: string
  job_type: IntakeJobType
  telegram_update_id: number | null
  source_storage_path: string
  status: JobStatus
  chat_id: string
  telegram_message_id: number
  attempts: number
  error: string | null
  created_at: string
  updated_at: string
}

type ItemRow = {
  id: string
  title: string
  slug: string
  description: string | null
  why_chosen: string | null
  price: number | null
  tags: string[] | null
  theme_id: string | null
  cover_image_url: string | null
  details: Record<string, unknown> | null
}

type ItemImageRow = {
  id: string
  item_id: string
  url: string
  storage_path: string | null
  alt_text: string | null
  sort_order: number
  created_at: string
}

type StoredImage = {
  storagePath: string
  url: string
  altText: string
  sortOrder: number
}

type QcSummary = {
  fail: boolean
  fringeRatio: number
  strayIslands: number
  holeCount: number
  subjectCoverage: number
  maskSoftness: number
  reason: string | null
}

const POLL_INTERVAL_MS = 5_000
const MAX_ATTEMPTS = 3
const PALETTE_HEX: Record<CampaignColor, string> = {
  teal: '#1A9E9E',
  pink: '#E8176A',
  coral: '#C46D63',
  charcoal: '#2F2F2D',
  cyan: '#08CCFC',
  cream: '#F8F7F3',
}

function nowIso() {
  return new Date().toISOString()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isCampaignColor(value: unknown): value is CampaignColor {
  return typeof value === 'string' && value in PALETTE_HEX
}

function publicCatalogUrl(storagePath: string) {
  return createServiceRoleClient().storage.from('catalog').getPublicUrl(storagePath).data.publicUrl
}

function buildColorKeyboard(itemId: string) {
  return {
    inline_keyboard: [
      [
        { text: 'Teal', callback_data: `color:teal:${itemId}` },
        { text: 'Pink', callback_data: `color:pink:${itemId}` },
        { text: 'Coral', callback_data: `color:coral:${itemId}` },
      ],
      [
        { text: 'Charcoal', callback_data: `color:charcoal:${itemId}` },
        { text: 'Cyan', callback_data: `color:cyan:${itemId}` },
        { text: 'Cream', callback_data: `color:cream:${itemId}` },
      ],
    ],
  }
}

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

function formatDraftCopy(copy: DraftPayload, color: CampaignColor | null, qcFailed: boolean) {
  return [
    qcFailed ? 'edge quality low — shoot this one against a plain wall.' : 'frames ready.',
    '',
    copy.title,
    copy.description,
    copy.why_chosen ? `Why We Chose This\n${copy.why_chosen}` : '',
    '',
    `Campaign color: ${color ?? 'pending'}`,
    `Theme: ${copy.suggested_theme}`,
    `Price: ${formatPrice(copy.price_suggestion)}`,
    '',
    'Use the buttons below or send `color teal`, `color pink`, `color coral`, `color charcoal`, `color cyan`, or `color cream`.',
    'Send 1–2 close-ups if you have them.',
  ].filter(Boolean).join('\n')
}

function mergeDetails(existing: Record<string, unknown> | null | undefined, patch: Record<string, unknown>) {
  return {
    ...(existing ?? {}),
    ...patch,
  }
}

function draftFromCopy(base: SessionDraft | null, sourceStoragePath: string, coverImageUrl: string | null, copy: DraftPayload, patch?: Partial<SessionDraft>): SessionDraft {
  return {
    item_id: base?.item_id ?? '',
    title: copy.title,
    description: copy.description,
    why_chosen: copy.why_chosen,
    price: copy.price_suggestion,
    tags: copy.tags,
    theme: copy.suggested_theme,
    cover_image_url: coverImageUrl,
    category: copy.category,
    provenance: copy.provenance,
    confidence: copy.confidence,
    source_url: base?.source_url ?? null,
    price_suggestion: copy.price_suggestion,
    source_storage_path: sourceStoragePath,
    selected_campaign_color: base?.selected_campaign_color ?? null,
    requested_campaign_color: base?.requested_campaign_color ?? null,
    processing_status: 'ready',
    qc_failed: false,
    closeup_count: base?.closeup_count ?? 0,
    ...patch,
  }
}

function componentStats(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length)
  const components: Array<{ area: number; touchesBounds: boolean; minX: number; minY: number; maxX: number; maxY: number }> = []
  const queue = new Int32Array(mask.length)

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue

    let head = 0
    let tail = 0
    queue[tail++] = index
    visited[index] = 1
    let area = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let touchesBounds = false

    while (head < tail) {
      const current = queue[head++]
      const x = current % width
      const y = Math.floor(current / width)
      area += 1
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBounds = true

      const neighbors = [
        current - 1,
        current + 1,
        current - width,
        current + width,
      ]

      for (const next of neighbors) {
        if (next < 0 || next >= mask.length) continue
        const nx = next % width
        const ny = Math.floor(next / width)
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue
        if (!mask[next] || visited[next]) continue
        visited[next] = 1
        queue[tail++] = next
      }
    }

    components.push({ area, touchesBounds, minX, minY, maxX, maxY })
  }

  return components
}

function analyzeMask(alpha: Uint8Array, width: number, height: number): QcSummary {
  const mask = new Uint8Array(alpha.length)
  let opaquePixels = 0
  let semiTransparentPixels = 0

  for (let i = 0; i < alpha.length; i += 1) {
    const value = alpha[i]
    if (value >= 32) {
      mask[i] = 1
      opaquePixels += 1
    }
    if (value > 0 && value < 255) semiTransparentPixels += 1
  }

  if (opaquePixels === 0) {
    return {
      fail: true,
      fringeRatio: 1,
      strayIslands: 0,
      holeCount: 0,
      subjectCoverage: 0,
      maskSoftness: 1,
      reason: 'No foreground mask detected.',
    }
  }

  const components = componentStats(mask, width, height)
  const mainComponent = components.sort((a, b) => b.area - a.area)[0]
  const strayIslands = components.filter((component) => component !== mainComponent && component.area >= 24).length
  const subjectCoverage = mainComponent.area / (width * height)

  let edgePixels = 0
  let edgeFringe = 0
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue
    const x = index % width
    const y = Math.floor(index / width)
    const neighbors = [
      index - 1,
      index + 1,
      index - width,
      index + width,
    ]
    let isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1
    for (const next of neighbors) {
      if (next < 0 || next >= mask.length) continue
      if (!mask[next]) {
        isEdge = true
        break
      }
    }
    if (isEdge) {
      edgePixels += 1
      if (alpha[index] < 220) edgeFringe += 1
    }
  }

  const fringeRatio = edgePixels === 0 ? 0 : edgeFringe / edgePixels
  const maskSoftness = opaquePixels === 0 ? 1 : semiTransparentPixels / opaquePixels

  const holeMask = new Uint8Array(mask.length)
  for (let y = mainComponent.minY; y <= mainComponent.maxY; y += 1) {
    for (let x = mainComponent.minX; x <= mainComponent.maxX; x += 1) {
      const index = y * width + x
      holeMask[index] = mask[index] ? 0 : 1
    }
  }

  const holes = componentStats(holeMask, width, height)
    .filter((component) => !component.touchesBounds && component.area >= 20)
  const holeCount = holes.length

  const reasons: string[] = []
  if (subjectCoverage < 0.08 || subjectCoverage > 0.92) reasons.push(`coverage=${subjectCoverage.toFixed(3)}`)
  if (strayIslands > 6) reasons.push(`stray_islands=${strayIslands}`)
  if (holeCount > 10) reasons.push(`hole_count=${holeCount}`)
  if (fringeRatio > 0.38) reasons.push(`fringe_ratio=${fringeRatio.toFixed(3)}`)
  if (maskSoftness > 0.30) reasons.push(`mask_softness=${maskSoftness.toFixed(3)}`)

  return {
    fail: reasons.length > 0,
    fringeRatio,
    strayIslands,
    holeCount,
    subjectCoverage,
    maskSoftness,
    reason: reasons.length ? reasons.join(', ') : null,
  }
}

function rgbToHue(r: number, g: number, b: number) {
  const r1 = r / 255
  const g1 = g / 255
  const b1 = b / 255
  const max = Math.max(r1, g1, b1)
  const min = Math.min(r1, g1, b1)
  const delta = max - min

  if (delta === 0) return { hue: 0, saturation: 0 }

  let hue = 0
  if (max === r1) hue = ((g1 - b1) / delta) % 6
  else if (max === g1) hue = (b1 - r1) / delta + 2
  else hue = (r1 - g1) / delta + 4

  hue = Math.round(hue * 60)
  if (hue < 0) hue += 360
  const saturation = max === 0 ? 0 : delta / max
  return { hue, saturation }
}

function pickAutoCampaignColor(image: sharp.Sharp, alpha: Uint8Array) {
  return image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      let r = 0
      let g = 0
      let b = 0
      let count = 0
      for (let i = 0; i < info.width * info.height; i += 1) {
        if (alpha[i] < 64) continue
        const offset = i * info.channels
        r += data[offset]
        g += data[offset + 1]
        b += data[offset + 2]
        count += 1
      }

      if (count === 0) return 'charcoal' as CampaignColor
      const avgR = r / count
      const avgG = g / count
      const avgB = b / count
      const { hue, saturation } = rgbToHue(avgR, avgG, avgB)

      if (saturation < 0.18) return 'charcoal' as CampaignColor
      if (hue >= 180 && hue <= 280) return 'pink' as CampaignColor
      if (hue <= 70 || hue >= 330) return 'teal' as CampaignColor
      if (avgB > avgR + 18) return 'pink' as CampaignColor
      if (avgR > avgB + 18) return 'teal' as CampaignColor
      return 'charcoal' as CampaignColor
    })
}

async function normalizeCutoutBuffer(result: unknown) {
  if (result instanceof Uint8Array) return Buffer.from(result)
  if (result instanceof ArrayBuffer) return Buffer.from(result)
  if (result instanceof Blob) return Buffer.from(await result.arrayBuffer())
  if (Buffer.isBuffer(result)) return result
  throw new Error('Unsupported background-removal output')
}

async function removeBackgroundCutout(sourceBuffer: Uint8Array) {
  const result = await removeBackground(Buffer.from(sourceBuffer))
  return normalizeCutoutBuffer(result)
}

async function buildShadowOverlay(alpha: Uint8Array, width: number, height: number, opacity: number, blur: number) {
  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < alpha.length; i += 1) {
    const offset = i * 4
    rgba[offset] = 0
    rgba[offset + 1] = 0
    rgba[offset + 2] = 0
    rgba[offset + 3] = Math.round(alpha[i] * opacity)
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .blur(blur)
    .png()
    .toBuffer()
}

async function compositeFrame(cutoutBuffer: Buffer, width: number, height: number, background: string, shadow: { opacity: number; blur: number; left: number; top: number }) {
  const alpha = await sharp(cutoutBuffer).ensureAlpha().extractChannel('alpha').raw().toBuffer()
  const shadowBuffer = await buildShadowOverlay(alpha, width, height, shadow.opacity, shadow.blur)
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background,
    },
  })
    .composite([
      { input: shadowBuffer, left: shadow.left, top: shadow.top, blend: 'multiply' },
      { input: cutoutBuffer, left: 0, top: 0, blend: 'over' },
    ])
    .png()
    .toBuffer()
}

function cropOverlap(a: { left: number; top: number; size: number }, b: { left: number; top: number; size: number }) {
  const ax2 = a.left + a.size
  const ay2 = a.top + a.size
  const bx2 = b.left + b.size
  const by2 = b.top + b.size
  const overlapX = Math.max(0, Math.min(ax2, bx2) - Math.max(a.left, b.left))
  const overlapY = Math.max(0, Math.min(ay2, by2) - Math.max(a.top, b.top))
  return overlapX * overlapY
}

async function buildDetailCrops(sourceBuffer: Uint8Array) {
  const normalized = sharp(sourceBuffer).rotate()
  const { data, info } = await normalized
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const minSide = Math.min(info.width, info.height)
  if (minSide < 900) return [] as Buffer[]

  const cropSize = Math.floor(minSide * 0.45)
  const step = Math.max(24, Math.floor(cropSize / 5))
  const candidates: Array<{ left: number; top: number; size: number; score: number }> = []

  for (let top = 0; top + cropSize <= info.height; top += step) {
    for (let left = 0; left + cropSize <= info.width; left += step) {
      let sum = 0
      let sumSq = 0
      let localRange = 0

      for (let y = top; y < top + cropSize; y += 1) {
        let rowMin = 255
        let rowMax = 0
        for (let x = left; x < left + cropSize; x += 1) {
          const value = data[y * info.width + x]
          sum += value
          sumSq += value * value
          if (value < rowMin) rowMin = value
          if (value > rowMax) rowMax = value
        }
        localRange += rowMax - rowMin
      }

      const area = cropSize * cropSize
      const mean = sum / area
      const variance = sumSq / area - mean * mean
      const score = variance + localRange / cropSize
      candidates.push({ left, top, size: cropSize, score })
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const selected: Array<{ left: number; top: number; size: number }> = []

  for (const candidate of candidates) {
    if (selected.every((current) => cropOverlap(current, candidate) / (candidate.size * candidate.size) < 0.2)) {
      selected.push(candidate)
    }
    if (selected.length === 2) break
  }

  if (selected.length < 2) return []

  const crops: Buffer[] = []
  for (const [index, candidate] of selected.entries()) {
    const crop = await sharp(sourceBuffer)
      .rotate()
      .extract({ left: candidate.left, top: candidate.top, width: candidate.size, height: candidate.size })
      .png()
      .toBuffer()
    crops[index] = crop
  }
  return crops
}

async function downloadSource(storagePath: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.storage.from('catalog').download(storagePath)
  if (error) throw error
  return {
    buffer: new Uint8Array(await data.arrayBuffer()),
    contentType: data.type || 'image/png',
  }
}

async function uploadPng(storagePath: string, buffer: Buffer) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.storage
    .from('catalog')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })
  if (error) throw error
  return publicCatalogUrl(storagePath)
}

async function fetchItem(itemId: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('items')
    .select('id,title,slug,description,why_chosen,price,tags,theme_id,cover_image_url,details')
    .eq('id', itemId)
    .single()
  if (error) throw error
  return data as ItemRow
}

async function fetchItemImages(itemId: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('item_images')
    .select('*')
    .eq('item_id', itemId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as ItemImageRow[]
}

async function fetchSession(chatId: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('conversation_sessions')
    .select('id,chat_id,draft,messages,state,updated_at')
    .eq('chat_id', chatId)
    .maybeSingle()
  if (error) throw error
  return data as ConversationSession | null
}

async function saveSession(chatId: string, draft: SessionDraft | null, messages: SessionMessage[], state: ConversationState) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('conversation_sessions')
    .upsert({
      chat_id: chatId,
      draft,
      messages,
      state,
    }, { onConflict: 'chat_id' })
  if (error) throw error
}

async function resolveThemeId(slug: string) {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('themes')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

async function updateItemRecord(itemId: string, patch: {
  copy?: DraftPayload
  coverImageUrl?: string | null
  detailsPatch: Record<string, unknown>
}) {
  const supabase = createServiceRoleClient()
  const current = await fetchItem(itemId)
  const updatePayload: Record<string, unknown> = {
    details: mergeDetails(current.details, patch.detailsPatch),
  }

  if (patch.copy) {
    updatePayload.title = patch.copy.title
    updatePayload.description = patch.copy.description
    updatePayload.why_chosen = patch.copy.why_chosen
    updatePayload.tags = patch.copy.tags
    updatePayload.price = patch.copy.price_suggestion
    updatePayload.theme_id = await resolveThemeId(patch.copy.suggested_theme)
  }

  if (patch.coverImageUrl !== undefined) {
    updatePayload.cover_image_url = patch.coverImageUrl
  }

  const { error } = await supabase
    .from('items')
    .update(updatePayload)
    .eq('id', itemId)
  if (error) throw error
}

async function replaceItemImages(itemId: string, frames: StoredImage[]) {
  const supabase = createServiceRoleClient()
  const { error: deleteError } = await supabase.from('item_images').delete().eq('item_id', itemId)
  if (deleteError) throw deleteError

  const { error: insertError } = await supabase.from('item_images').insert(
    frames.map((frame) => ({
      item_id: itemId,
      url: frame.url,
      storage_path: frame.storagePath,
      alt_text: frame.altText,
      sort_order: frame.sortOrder,
    })),
  )
  if (insertError) throw insertError
}

async function appendItemImage(itemId: string, frame: StoredImage) {
  const supabase = createServiceRoleClient()
  const existing = await fetchItemImages(itemId)
  const nextOrder = existing.length === 0 ? 0 : Math.max(...existing.map((entry) => entry.sort_order)) + 1
  const { error } = await supabase.from('item_images').insert({
    item_id: itemId,
    url: frame.url,
    storage_path: frame.storagePath,
    alt_text: frame.altText,
    sort_order: nextOrder,
  })
  if (error) throw error
}

async function upsertCampaignImage(itemId: string, frame: StoredImage) {
  const supabase = createServiceRoleClient()
  const images = await fetchItemImages(itemId)
  const existing = images.find((image) => image.alt_text?.startsWith('Campaign frame'))

  if (!existing) {
    await appendItemImage(itemId, frame)
    return
  }

  if (existing.storage_path && existing.storage_path !== frame.storagePath) {
    await supabase.storage.from('catalog').remove([existing.storage_path]).catch(() => null)
  }

  const { error } = await supabase
    .from('item_images')
    .update({
      url: frame.url,
      storage_path: frame.storagePath,
      alt_text: frame.altText,
    })
    .eq('id', existing.id)
  if (error) throw error
}

async function sendInitialFollowup(chatId: string, itemId: string, frames: StoredImage[], copy: DraftPayload, color: CampaignColor, qcFailed: boolean) {
  if (frames.length >= 2) {
    await sendTelegramMediaGroup(chatId, frames.map((frame, index) => ({
      type: 'photo',
      media: frame.url,
      caption: index === 0 ? 'Buena Onda draft frames' : undefined,
    })))
  }
  await sendTelegramMessage(chatId, formatDraftCopy(copy, color, qcFailed), {
    replyMarkup: buildColorKeyboard(itemId),
  })
}

async function sendCloseupFollowup(chatId: string, frame: StoredImage) {
  await sendTelegramPhoto(chatId, frame.url, 'Close-up added.')
}

async function sendRecolorFollowup(chatId: string, frame: StoredImage, color: CampaignColor) {
  await sendTelegramPhoto(chatId, frame.url, `Campaign frame updated to ${color}.`)
  await sendTelegramMessage(chatId, 'Choose another override if needed.', {
    replyMarkup: buildColorKeyboard(frame.storagePath.split('/')[1] ?? ''),
  })
}

async function claimNextJob() {
  const supabase = createServiceRoleClient()
  const { data: candidates, error } = await supabase
    .from('intake_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(5)
  if (error) throw error

  for (const candidate of (candidates ?? []) as IntakeJobRow[]) {
    const { data, error: updateError } = await supabase
      .from('intake_jobs')
      .update({
        status: 'processing',
        updated_at: nowIso(),
      })
      .eq('id', candidate.id)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle()

    if (updateError) throw updateError
    if (data) return data as IntakeJobRow
  }

  return null
}

async function finishJob(jobId: string) {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('intake_jobs')
    .update({
      status: 'done',
      error: null,
      updated_at: nowIso(),
    })
    .eq('id', jobId)
  if (error) throw error
}

async function failJob(job: IntakeJobRow, reason: string) {
  const supabase = createServiceRoleClient()
  const attempts = job.attempts + 1
  const status: JobStatus = attempts >= MAX_ATTEMPTS ? 'failed' : 'queued'
  const { error } = await supabase
    .from('intake_jobs')
    .update({
      status,
      attempts,
      error: reason,
      updated_at: nowIso(),
    })
    .eq('id', job.id)
  if (error) throw error
}

async function runCopy(source: { buffer: Uint8Array; contentType: string }, item: ItemRow) {
  const sourceDescription = typeof item.details?.telegram_note === 'string' ? item.details.telegram_note : undefined
  return callClaudeForCopy({
    image: {
      buffer: source.buffer,
      contentType: source.contentType,
      filename: path.basename(String(item.details?.source_storage_path ?? 'telegram-source')),
    },
    note: sourceDescription,
    filename: item.cover_image_url ?? undefined,
  })
}

async function processIntakeJob(job: IntakeJobRow) {
  const item = await fetchItem(job.item_id)
  const session = await fetchSession(job.chat_id)
  const source = await downloadSource(job.source_storage_path)
  const rawCoverUrl = publicCatalogUrl(job.source_storage_path)
  const copy = await runCopy(source, item)

  const cutoutBuffer = await removeBackgroundCutout(source.buffer)
  const cutoutMeta = await sharp(cutoutBuffer).ensureAlpha().metadata()
  const width = cutoutMeta.width ?? 0
  const height = cutoutMeta.height ?? 0
  if (!width || !height) throw new Error('Cutout metadata missing dimensions')

  const alpha = await sharp(cutoutBuffer).ensureAlpha().extractChannel('alpha').raw().toBuffer()
  const qc = analyzeMask(alpha, width, height)

  if (qc.fail) {
    const nextDraft = draftFromCopy(session?.draft ?? null, job.source_storage_path, rawCoverUrl, copy, {
      item_id: job.item_id,
      qc_failed: true,
      processing_status: 'ready',
      cover_image_url: rawCoverUrl,
      selected_campaign_color: null,
      requested_campaign_color: null,
    })

    await updateItemRecord(job.item_id, {
      copy,
      coverImageUrl: rawCoverUrl,
      detailsPatch: {
        source_storage_path: job.source_storage_path,
        frame_roles: { source: job.source_storage_path },
        selected_campaign_color: null,
        requested_campaign_color: null,
        intake_status: 'needs-reshoot',
        qc_failed: true,
        qc_failed_reason: qc.reason,
        closeup_state: 'awaiting-reshoot',
      },
    })

    await saveSession(job.chat_id, nextDraft, [
      ...(session?.messages ?? []),
      {
        role: 'assistant',
        content: JSON.stringify(copy),
        created_at: nowIso(),
      },
    ], 'drafting')

    await sendTelegramMessage(job.chat_id, formatDraftCopy(copy, null, true))
    await finishJob(job.id)
    return
  }

  const requestedColor = isCampaignColor(item.details?.requested_campaign_color)
    ? item.details.requested_campaign_color
    : null
  const selectedColor = requestedColor ?? await pickAutoCampaignColor(sharp(source.buffer).rotate(), alpha)

  const catalogFrameBuffer = await compositeFrame(cutoutBuffer, width, height, PALETTE_HEX.cream, {
    opacity: 0.18,
    blur: 18,
    left: 0,
    top: 18,
  })
  const campaignFrameBuffer = await compositeFrame(cutoutBuffer, width, height, PALETTE_HEX[selectedColor], {
    opacity: 0.22,
    blur: 12,
    left: 8,
    top: 20,
  })

  const detailCrops = await buildDetailCrops(source.buffer)
  const frames: StoredImage[] = []

  const catalogStoragePath = `items/${job.item_id}/telegram/01-catalog-cream.png`
  frames.push({
    storagePath: catalogStoragePath,
    url: await uploadPng(catalogStoragePath, catalogFrameBuffer),
    altText: 'Catalog frame',
    sortOrder: 0,
  })

  const campaignStoragePath = `items/${job.item_id}/telegram/02-campaign-${selectedColor}.png`
  frames.push({
    storagePath: campaignStoragePath,
    url: await uploadPng(campaignStoragePath, campaignFrameBuffer),
    altText: `Campaign frame (${selectedColor})`,
    sortOrder: 1,
  })

  if (detailCrops[0]) {
    const storagePath = `items/${job.item_id}/telegram/03-detail-a.png`
    frames.push({
      storagePath,
      url: await uploadPng(storagePath, detailCrops[0]),
      altText: 'Detail crop A',
      sortOrder: 2,
    })
  }

  if (detailCrops[1]) {
    const storagePath = `items/${job.item_id}/telegram/04-detail-b.png`
    frames.push({
      storagePath,
      url: await uploadPng(storagePath, detailCrops[1]),
      altText: 'Detail crop B',
      sortOrder: frames.length,
    })
  }

  await replaceItemImages(job.item_id, frames)

  const nextDraft = draftFromCopy(session?.draft ?? null, job.source_storage_path, frames[0].url, copy, {
    item_id: job.item_id,
    selected_campaign_color: selectedColor,
    requested_campaign_color: null,
    processing_status: 'ready',
    qc_failed: false,
    cover_image_url: frames[0].url,
  })

  await updateItemRecord(job.item_id, {
    copy,
    coverImageUrl: frames[0].url,
    detailsPatch: {
      source_storage_path: job.source_storage_path,
      frame_roles: {
        source: job.source_storage_path,
        catalog: catalogStoragePath,
        campaign: campaignStoragePath,
        detail_a: detailCrops[0] ? `items/${job.item_id}/telegram/03-detail-a.png` : null,
        detail_b: detailCrops[1] ? `items/${job.item_id}/telegram/04-detail-b.png` : null,
      },
      selected_campaign_color: selectedColor,
      requested_campaign_color: null,
      intake_status: 'ready',
      qc_failed: false,
      qc_failed_reason: null,
      closeup_state: 'awaiting-closeups',
    },
  })

  await saveSession(job.chat_id, nextDraft, [
    ...(session?.messages ?? []),
    {
      role: 'assistant',
      content: JSON.stringify(copy),
      created_at: nowIso(),
    },
  ], 'drafting')

  await sendInitialFollowup(job.chat_id, job.item_id, frames, copy, selectedColor, false)
  await finishJob(job.id)
}

async function processCloseupJob(job: IntakeJobRow) {
  const item = await fetchItem(job.item_id)
  const session = await fetchSession(job.chat_id)
  const source = await downloadSource(job.source_storage_path)
  const cutoutBuffer = await removeBackgroundCutout(source.buffer)
  const meta = await sharp(cutoutBuffer).ensureAlpha().metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!width || !height) throw new Error('Close-up cutout metadata missing dimensions')

  const alpha = await sharp(cutoutBuffer).ensureAlpha().extractChannel('alpha').raw().toBuffer()
  const qc = analyzeMask(alpha, width, height)
  if (qc.fail) {
    await sendTelegramMessage(job.chat_id, 'edge quality low — shoot this one against a plain wall.')
    await updateItemRecord(job.item_id, {
      detailsPatch: mergeDetails(item.details, {
        closeup_state: 'needs-reshoot',
      }),
    })
    await finishJob(job.id)
    return
  }

  const closeupFrameBuffer = await compositeFrame(cutoutBuffer, width, height, PALETTE_HEX.cream, {
    opacity: 0.16,
    blur: 16,
    left: 0,
    top: 16,
  })
  const storagePath = `items/${job.item_id}/telegram/closeups/${job.telegram_message_id}-catalog-cream.png`
  const frame: StoredImage = {
    storagePath,
    url: await uploadPng(storagePath, closeupFrameBuffer),
    altText: `Close-up frame ${job.telegram_message_id}`,
    sortOrder: 0,
  }

  await appendItemImage(job.item_id, frame)

  if (session?.draft) {
    await saveSession(job.chat_id, {
      ...session.draft,
      processing_status: 'ready',
      closeup_count: session.draft.closeup_count + 1,
    }, session.messages, session.state)
  }

  await updateItemRecord(job.item_id, {
    detailsPatch: {
      closeup_state: 'ready',
    },
  })

  await sendCloseupFollowup(job.chat_id, frame)
  await finishJob(job.id)
}

async function processRecolorJob(job: IntakeJobRow) {
  const item = await fetchItem(job.item_id)
  const session = await fetchSession(job.chat_id)
  const requestedColor = isCampaignColor(item.details?.requested_campaign_color)
    ? item.details.requested_campaign_color
    : null
  if (!requestedColor) {
    await finishJob(job.id)
    return
  }

  const source = await downloadSource(job.source_storage_path)
  const cutoutBuffer = await removeBackgroundCutout(source.buffer)
  const meta = await sharp(cutoutBuffer).ensureAlpha().metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!width || !height) throw new Error('Recolor cutout metadata missing dimensions')

  const alpha = await sharp(cutoutBuffer).ensureAlpha().extractChannel('alpha').raw().toBuffer()
  const qc = analyzeMask(alpha, width, height)
  if (qc.fail) {
    await sendTelegramMessage(job.chat_id, 'edge quality low — shoot this one against a plain wall.')
    await finishJob(job.id)
    return
  }

  const campaignFrameBuffer = await compositeFrame(cutoutBuffer, width, height, PALETTE_HEX[requestedColor], {
    opacity: 0.22,
    blur: 12,
    left: 8,
    top: 20,
  })
  const storagePath = `items/${job.item_id}/telegram/02-campaign-${requestedColor}.png`
  const frame: StoredImage = {
    storagePath,
    url: await uploadPng(storagePath, campaignFrameBuffer),
    altText: `Campaign frame (${requestedColor})`,
    sortOrder: 1,
  }

  await upsertCampaignImage(job.item_id, frame)
  await updateItemRecord(job.item_id, {
    detailsPatch: {
      selected_campaign_color: requestedColor,
      requested_campaign_color: null,
    },
  })

  if (session?.draft) {
    await saveSession(job.chat_id, {
      ...session.draft,
      selected_campaign_color: requestedColor,
      requested_campaign_color: null,
      processing_status: 'ready',
    }, session.messages, session.state)
  }

  await sendRecolorFollowup(job.chat_id, frame, requestedColor)
  await finishJob(job.id)
}

async function processJob(job: IntakeJobRow) {
  if (job.job_type === 'intake') {
    await processIntakeJob(job)
    return
  }
  if (job.job_type === 'closeup') {
    await processCloseupJob(job)
    return
  }
  await processRecolorJob(job)
}

async function main() {
  console.log(`[intake-worker] starting poll loop from ${process.cwd()}`)
  while (true) {
    const job = await claimNextJob()
    if (!job) {
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    console.log(`[intake-worker] claimed ${job.id} (${job.job_type}) for item ${job.item_id}`)
    try {
      await processJob(job)
      console.log(`[intake-worker] completed ${job.id}`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error(`[intake-worker] failed ${job.id}: ${reason}`)
      await failJob(job, reason)
    }
  }
}

main().catch((error) => {
  if (typeof error === 'object' && error && 'code' in error && error.code === 'PGRST205') {
    console.error('[intake-worker] fatal: intake_jobs is missing. Run the manual migration in Supabase first.')
  } else {
    console.error('[intake-worker] fatal', error)
  }
  process.exit(1)
})
