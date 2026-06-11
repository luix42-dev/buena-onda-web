import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendTelegramMessage } from '@/lib/telegram'
import { VOICE_V2_PROMPT } from '@/lib/voice-prompt'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

type Destination = 'catalog' | 'transmission' | 'radio'

const VALID_DESTINATIONS = new Set<Destination>(['catalog', 'transmission', 'radio'])
const VALID_THEME_SLUGS = ['curated-vintage', 'analog-objects', 'sound-collection', 'buena-onda-original']
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `intake-${Date.now()}`
}

function titleFromNote(note: string | undefined, fallback: string) {
  const firstLine = note?.split(/\r?\n/).find(line => line.trim())?.trim()
  return firstLine ? firstLine.slice(0, 90) : fallback
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBlobPart(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function parseImageDataUrl(image: unknown) {
  if (typeof image !== 'string' || !image.trim()) return null
  const match = image.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Image must be a data URL.')
  return {
    contentType: match[1],
    buffer: base64ToBytes(match[2]),
  }
}

function storagePathFromCatalogUrl(url: string | null) {
  if (!url) return null

  try {
    const pathname = new URL(url).pathname
    const marker = '/storage/v1/object/public/catalog/'
    const markerIndex = pathname.indexOf(marker)
    if (markerIndex === -1) return null
    return decodeURIComponent(pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}

async function saveRawImage(image: ReturnType<typeof parseImageDataUrl>, prefix: string) {
  if (!image) return null
  const ext = image.contentType.includes('png') ? 'png' : image.contentType.includes('webp') ? 'webp' : 'jpg'
  const storagePath = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const supabase = createServiceRoleClient()
  const { error } = await supabase.storage
    .from('catalog')
    .upload(storagePath, new Blob([bytesToBlobPart(image.buffer)], { type: image.contentType }), { contentType: image.contentType, upsert: false })
  if (error) throw error
  return supabase.storage.from('catalog').getPublicUrl(storagePath).data.publicUrl
}

async function saveCatalogImage(image: ReturnType<typeof parseImageDataUrl>) {
  if (!image) return { url: null, beforeSize: 0, afterSize: 0 }
  const ext = image.contentType.includes('png') ? 'png' : image.contentType.includes('webp') ? 'webp' : 'jpg'
  const storagePath = `intake/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const supabase = createServiceRoleClient()
  const { error } = await supabase.storage
    .from('catalog')
    .upload(storagePath, new Blob([bytesToBlobPart(image.buffer)], { type: image.contentType }), { contentType: image.contentType, upsert: false })
  if (error) throw error
  return {
    url: supabase.storage.from('catalog').getPublicUrl(storagePath).data.publicUrl,
    beforeSize: image.buffer.byteLength,
    afterSize: image.buffer.byteLength,
  }
}

function parseJson(raw: string) {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  return JSON.parse(trimmed)
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

async function enrichCatalogCopy(note: string | undefined, sourceUrl: string | undefined, imageUrl: string | null) {
  const fallbackTitle = titleFromNote(note, 'Catalog Intake Draft')
  const fallback = {
    title: fallbackTitle,
    description: note || 'Draft catalog intake. Editorial copy pending.',
    provenance: null,
    tags: ['intake', 'catalog', 'needs-review'],
    suggested_theme: 'analog-objects',
    confidence: 0.2,
  }

  try {
    const ollamaUrl = process.env.OLLAMA_URL
    if (!ollamaUrl) return fallback
    const voice = VOICE_V2_PROMPT
    const tagsResponse = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(10_000) })
    const tagsPayload = await tagsResponse.json()
    const model = Array.isArray(tagsPayload.models)
      ? tagsPayload.models.find((entry: { name?: string }) => entry.name === 'mistral:latest')?.name
      : null
    if (!model) return fallback

    const user = `You are writing a product listing for Buena Onda, an analog culture house in Miami.

Source material:
- Note: ${note ?? ''}
- URL: ${sourceUrl ?? ''}
- Image: ${imageUrl ?? ''}

Write original catalog copy. Return only JSON:
{
  "title": "...",
  "description": "...",
  "provenance": null,
  "tags": ["..."],
  "suggested_theme": "curated-vintage|analog-objects|sound-collection|buena-onda-original",
  "confidence": 0.0
}`

    const response = await fetch(`${ollamaUrl}/api/chat`, {
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

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS })
  }

  const destination = String(body.destination ?? 'catalog').toLowerCase() as Destination
  if (!VALID_DESTINATIONS.has(destination)) {
    return NextResponse.json({ ok: false, error: 'Invalid destination' }, { status: 400, headers: CORS_HEADERS })
  }

  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const sourceUrl = typeof body.url === 'string' ? body.url.trim() : ''
  const image = parseImageDataUrl(body.image)
  const supabase = createServiceRoleClient()

  if (destination === 'catalog') {
    const imageResult = await saveCatalogImage(image)
    const copy = await enrichCatalogCopy(note, sourceUrl, imageResult.url)
    const { data: theme } = await supabase
      .from('themes')
      .select('id')
      .eq('slug', copy.suggested_theme)
      .maybeSingle()
    const title = copy.title || titleFromNote(note, 'Catalog Intake Draft')
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
          source_url: sourceUrl || null,
          intake_note: note || null,
        },
        price: null,
        tags: copy.tags,
        status: 'draft',
        availability: 'available',
        sourcing_model: 'reservation',
        cover_image_url: imageResult.url,
      })
      .select('id,title,slug,status,cover_image_url')
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400, headers: CORS_HEADERS })

    if (imageResult.url) {
      const { data: existingImage, error: imageLookupError } = await supabase
        .from('item_images')
        .select('id')
        .eq('item_id', data.id)
        .eq('url', imageResult.url)
        .maybeSingle()

      if (imageLookupError) {
        return NextResponse.json({ ok: false, error: imageLookupError.message }, { status: 400, headers: CORS_HEADERS })
      }

      if (!existingImage) {
        const { error: imageInsertError } = await supabase
          .from('item_images')
          .insert({
            item_id: data.id,
            url: imageResult.url,
            storage_path: storagePathFromCatalogUrl(imageResult.url),
            sort_order: 0,
          })

        if (imageInsertError) {
          return NextResponse.json({ ok: false, error: imageInsertError.message }, { status: 400, headers: CORS_HEADERS })
        }
      }
    }

    const telegram = await sendTelegramMessage(`Draft saved to Catalog: ${data.title}`)
    return NextResponse.json({ ok: true, destination, record: data, image: imageResult, telegram }, { status: 201, headers: CORS_HEADERS })
  }

  if (destination === 'transmission') {
    const imageUrl = await saveRawImage(image, 'transmission')
    const title = titleFromNote(note, 'Transmission Intake Draft')
    const issueBody = [
      note,
      sourceUrl ? `Link: ${sourceUrl}` : '',
      imageUrl ? `Image: ${imageUrl}` : '',
    ].filter(Boolean).join('\n\n')
    const { data, error } = await supabase
      .from('transmission_issues')
      .insert({
        title,
        slug: `${slugify(title)}-${Date.now()}`,
        excerpt: note ? note.slice(0, 180) : null,
        body: issueBody || null,
        status: 'draft',
        published_at: null,
      })
      .select('id,title,slug,status')
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400, headers: CORS_HEADERS })
    const telegram = await sendTelegramMessage('Draft saved to Transmission')
    return NextResponse.json({ ok: true, destination, record: data, imageUrl, telegram }, { status: 201, headers: CORS_HEADERS })
  }

  const title = titleFromNote(note, 'Radio Intake Draft')
  const { data, error } = await supabase
    .from('episodes')
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now()}`,
      description: [note, sourceUrl ? `Link: ${sourceUrl}` : ''].filter(Boolean).join('\n\n') || null,
      audio_url: sourceUrl || null,
      episode_number: null,
      duration: null,
      tags: ['radio', 'intake'],
      published: false,
      published_at: null,
    })
    .select('id,title,slug,published')
    .single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400, headers: CORS_HEADERS })
  const telegram = await sendTelegramMessage('Draft saved to Radio')
  return NextResponse.json({ ok: true, destination, record: data, telegram }, { status: 201, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}
