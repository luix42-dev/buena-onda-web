import Anthropic from '@anthropic-ai/sdk'
import categoriesConfig from '../../categories.json'
import { VOICE_V2_PROMPT } from '../voice-prompt'

type CategoryConfig = {
  slug: string
  label: string
}

export type DraftPayload = {
  title: string
  description: string
  why_chosen: string | null
  provenance: string | null
  tags: string[]
  suggested_theme: string
  price_suggestion: number | null
  category: string
  confidence: number
}

export type CopyRevisionMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ClaudeCopyInput = {
  image?: { buffer: Uint8Array; contentType: string; filename?: string }
  note?: string
  sourceUrl?: string
  filename?: string
  revision?: {
    draft: DraftPayload
    request: string
    messages: CopyRevisionMessage[]
  }
}

const CATEGORY_CONFIG = categoriesConfig as CategoryConfig[]
const VALID_CATEGORY_SLUGS = new Set(CATEGORY_CONFIG.map((category) => category.slug))
const CATEGORY_TO_THEME: Record<string, string> = {
  garments: 'curated-vintage',
  objects: 'analog-objects',
  sound: 'sound-collection',
  original: 'buena-onda-original',
}
const VALID_THEME_SLUGS = new Set(Object.values(CATEGORY_TO_THEME))

export function titleFromText(value: string | undefined, fallback: string) {
  const firstLine = value?.split(/\r?\n/).find((line) => line.trim())?.trim()
  return firstLine ? firstLine.slice(0, 90) : fallback
}

export function normalizeTags(tags: unknown) {
  const values = Array.isArray(tags) ? tags : []
  return [...new Set(values
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.replace(/#/g, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase())
    .map((tag) => tag.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean))]
    .slice(0, 8)
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

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64')
}

function normalizeMediaType(contentType: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (contentType.includes('png')) return 'image/png'
  if (contentType.includes('webp')) return 'image/webp'
  if (contentType.includes('gif')) return 'image/gif'
  return 'image/jpeg'
}

function categoryFromTheme(theme: string) {
  const entry = Object.entries(CATEGORY_TO_THEME).find(([, slug]) => slug === theme)
  return entry?.[0] ?? 'objects'
}

function themeFromCategory(category: string) {
  return CATEGORY_TO_THEME[category] ?? 'analog-objects'
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

export function buildFallbackCopy(note?: string, filename?: string): DraftPayload {
  return {
    title: titleFromText(note, filename || 'Telegram Catalog Draft'),
    description: note || 'Draft catalog intake from Telegram. Editorial copy pending.',
    why_chosen: null,
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
Also generate "why_chosen" as a 2-3 sentence editorial note explaining the curatorial reason for selecting this item.

Return only valid JSON:
{
  "title": "...",
  "description": "...",
  "why_chosen": "...",
  "provenance": null,
  "tags": ["..."],
  "suggested_theme": "curated-vintage|analog-objects|sound-collection|buena-onda-original",
  "price_suggestion": 0,
  "category": "garments|objects|sound|original",
  "confidence": 0.0
}`
}

function buildRevisionPrompt(input: {
  draft: DraftPayload
  request: string
}) {
  return `You are revising a draft catalog listing for Buena Onda. Use the full conversation history and the current draft below.

Current draft JSON:
${JSON.stringify(input.draft, null, 2)}

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

Also generate "why_chosen" as a 2-3 sentence editorial note explaining the curatorial reason for selecting this item.

Return only valid JSON with this shape:
{
  "title": "...",
  "description": "...",
  "why_chosen": "...",
  "provenance": null,
  "tags": ["..."],
  "suggested_theme": "curated-vintage|analog-objects|sound-collection|buena-onda-original",
  "price_suggestion": 0,
  "category": "garments|objects|sound|original",
  "confidence": 0.0
}`
}

function toClaudeMessages(messages: CopyRevisionMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: [{ type: 'text' as const, text: message.content }],
  }))
}

function extractClaudeText(response: { content: Array<{ type?: string; text?: string }> }) {
  const block = response.content.find((part) => part.type === 'text' && typeof part.text === 'string')
  return block?.text ?? ''
}

function normalizeCopy(raw: unknown, fallback: DraftPayload): DraftPayload {
  const parsed = (raw ?? {}) as Record<string, unknown>
  const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallback.title
  const description = typeof parsed.description === 'string' && parsed.description.trim() ? parsed.description.trim() : fallback.description
  const whyChosen = typeof parsed.why_chosen === 'string' && parsed.why_chosen.trim()
    ? parsed.why_chosen.trim()
    : fallback.why_chosen
  const provenance = typeof parsed.provenance === 'string' && parsed.provenance.trim() ? parsed.provenance.trim() : null
  const tags = normalizeTags(parsed.tags)
  const { category, theme } = normalizeCategoryAndTheme(parsed.category, parsed.suggested_theme)

  return {
    title,
    description,
    why_chosen: whyChosen,
    provenance,
    tags: tags.length ? tags : fallback.tags,
    suggested_theme: theme,
    price_suggestion: normalizePriceSuggestion(parsed.price_suggestion),
    category,
    confidence: normalizeConfidence(parsed.confidence),
  }
}

export async function callClaudeForCopyStrict(input: ClaudeCopyInput): Promise<DraftPayload> {
  const fallback = input.revision
    ? input.revision.draft
    : buildFallbackCopy(input.note, input.filename)
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: VOICE_V2_PROMPT,
    messages: input.revision
      ? [
          ...toClaudeMessages(input.revision.messages),
          {
            role: 'user',
            content: [{ type: 'text', text: buildRevisionPrompt({ draft: input.revision.draft, request: input.revision.request }) }],
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
}

export async function callClaudeForCopy(input: ClaudeCopyInput): Promise<DraftPayload> {
  try {
    return await callClaudeForCopyStrict(input)
  } catch {
    return input.revision
      ? input.revision.draft
      : buildFallbackCopy(input.note, input.filename)
  }
}
