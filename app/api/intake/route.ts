import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MODEL = 'claude-sonnet-4-20250514'
const VOICE_PATH = path.join(process.cwd(), 'src/brand/voice_v2.md')

type IntakeBody = {
  url?: string
  note?: string
  image?: string
}

type IntakeType = 'catalog' | 'transmission' | 'radio' | 'culture'

type ClaudeDraft = {
  type: IntakeType
  confidence: number
  source_url: string | null
  payload: Record<string, unknown>
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function textValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
    .replace(/-$/g, '')

  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base || 'draft'}-${suffix}`
}

function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
}

function extractImage(image: string): { mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: string } {
  const match = image.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/i)
  if (!match) return { mediaType: 'image/jpeg', data: image }

  const mediaType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase()
  return {
    mediaType: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
    data: match[2],
  }
}

function extractMeta(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ''
  const description =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1]?.trim() ??
    ''
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)

  return { title, description, text: body }
}

async function resolveUrl(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'Buena Onda Intake/1.0',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const html = await response.text()
    return extractMeta(html)
  } catch {
    return null
  }
}

function buildSystemPrompt(voice: string): string {
  return `${voice}

You are Buena Onda's content intake classifier and drafting assistant.

Classify the user's input into exactly one of these four content types:

1. catalog: an object, vintage find, merch item, furniture, lighting, accessory, or physical piece that belongs in the Buena Onda catalog.
2. transmission: an editorial signal, newsletter idea, trend, place, scene note, event angle, or cultural observation for the Transmission section.
3. radio: a track, artist, mix, episode idea, DJ note, audio reference, or music item for Buena Onda Radio.
4. culture: a broader culture post, archive note, Miami/design/music/lifestyle reference, personal history, or visual-cultural subject.

For catalog items, NEVER assign an era, decade, designer, or provenance unless it is directly verifiable from the user's note or image. If unverifiable, set provenance to null, provenance_uncertain to true, lower confidence below 0.7, and use design-language descriptors only. Do not speculate. Do not invent history.

Return ONLY valid JSON, no preamble, no markdown fences, and nothing outside the JSON object.

The JSON shape must be:
{
  "type": "catalog" | "transmission" | "radio" | "culture",
  "confidence": 0.0-1.0,
  "source_url": string | null,
  "payload": { ... }
}

Payload shapes by type:

catalog:
{
  "title": string,
  "description": string,
  "provenance": string | null,
  "tags": string[],
  "suggested_theme": string,
  "provenance_uncertain": boolean
}

transmission:
{
  "title": string,
  "angle": string,
  "why_it_matters": string,
  "suggested_pillar": "Sound" | "Style" | "Space" | "Signal"
}

radio:
{
  "title": string,
  "artist": string | null,
  "description": string
}

culture:
{
  "title": string,
  "what_it_is": string,
  "why_relevant": string,
  "tag": string
}`
}

function readVoice(): string {
  try {
    return fs.readFileSync(VOICE_PATH, 'utf8')
  } catch (error) {
    console.warn(
      `Unable to read voice file at ${VOICE_PATH}; continuing with empty voice prompt.`,
      error,
    )
    return ''
  }
}

async function createDraft(draft: ClaudeDraft) {
  const supabase = await createServiceClient()
  const payload = draft.payload

  if (draft.type === 'catalog') {
    const title = textValue(payload.title, 'Untitled Catalog Draft')
    const insert = {
      title,
      slug: slugifyTitle(title),
      description: textValue(payload.description, ''),
      tags: stringArray(payload.tags),
      theme_id: null,
      status: 'draft',
      availability: 'available',
      price: null,
      details: {},
      published_at: null,
    }

    const { data, error } = await supabase.from('items').insert(insert).select().single()
    if (error) throw error
    return { table: 'items', id: data.id as string, slug: data.slug as string }
  }

  if (draft.type === 'transmission') {
    const postType = 'transmission'
    const title = textValue(payload.title, 'Untitled Transmission Draft')
    const pillar = textValue(payload.suggested_pillar)
    const tags = uniqueTags([pillar, postType])
    const insert = {
      title,
      slug: slugifyTitle(title),
      excerpt: textValue(payload.angle, ''),
      body: null,
      tags,
      published: false,
      published_at: null,
      post_type: postType,
    }

    const { data, error } = await supabase.from('posts').insert(insert).select().single()
    if (error) throw error
    return { table: 'posts', id: data.id as string, slug: data.slug as string }
  }

  if (draft.type === 'culture') {
    const postType = 'culture'
    const title = textValue(payload.title, 'Untitled Culture Draft')
    const tag = textValue(payload.tag)
    const tags = uniqueTags([tag, postType])
    const insert = {
      title,
      slug: slugifyTitle(title),
      excerpt: textValue(payload.why_relevant, ''),
      body: null,
      tags,
      published: false,
      published_at: null,
      post_type: postType,
    }

    const { data, error } = await supabase.from('posts').insert(insert).select().single()
    if (error) throw error
    return { table: 'posts', id: data.id as string, slug: data.slug as string }
  }

  const title = textValue(payload.title, 'Untitled Radio Draft')
  const artist = textValue(payload.artist)
  const insert = {
    title,
    slug: slugifyTitle(title),
    description: textValue(payload.description, ''),
    audio_url: null,
    tags: uniqueTags([artist, 'radio']),
    published: false,
    published_at: null,
  }

  const { data, error } = await supabase.from('episodes').insert(insert).select().single()
  if (error) throw error
  return { table: 'episodes', id: data.id as string, slug: data.slug as string }
}

export async function POST(request: Request) {
  let body: IntakeBody
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const url = body.url?.trim()
  const note = body.note?.trim()
  const image = body.image?.trim()

  if (!url && !note && !image) {
    return json({ error: 'Provide at least one of url, note, or image' }, 400)
  }

  const voice = readVoice()
  const resolved = url ? await resolveUrl(url) : null
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const content: Anthropic.Messages.MessageParam['content'] = []

  if (image) {
    const { mediaType, data } = extractImage(image)
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data,
      },
    })
  }

  content.push({
    type: 'text',
    text: JSON.stringify({
      note: note ?? '',
      source_url: url ?? null,
      resolved_url: resolved,
    }, null, 2),
  })

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1400,
    system: buildSystemPrompt(voice),
    messages: [{ role: 'user', content }],
  })

  const raw = response.content
    .filter((part): part is Anthropic.Messages.TextBlock => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim()

  let draft: ClaudeDraft
  try {
    draft = JSON.parse(raw) as ClaudeDraft
  } catch {
    return json({ ok: false, error: 'Claude returned invalid JSON', raw }, 502)
  }

  try {
    const created = await createDraft(draft)
    return json({
      ok: true,
      type: draft.type,
      table: created.table,
      id: created.id,
      slug: created.slug,
    })
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Supabase insert failed',
      draft,
    }, 200)
  }
}
