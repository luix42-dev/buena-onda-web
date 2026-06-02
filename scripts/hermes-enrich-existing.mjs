import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ITEM_ID = 'e50ed838-340d-4a4e-a4cc-99ba31b1f824'
const SOURCE_URL = 'https://www.instagram.com/p/DYzyoBskZ8A/?img_index=7&igsh=eW5xdm1qZjdmMHpl'
const VOICE_PATH = path.join(process.cwd(), 'src/brand/voice_v2.md')
const VALID_THEME_SLUGS = ['curated-vintage', 'analog-objects', 'sound-collection', 'buena-onda-original']
const ENRICHMENT_MODEL = 'mistral:latest'
const FALLBACK_SOURCE_DESCRIPTION =
  'The source identifies Expo Osaka 70, held in Osaka, Japan, in 1970, with Metabolist architecture, experimental structures, inflatable pavilions, megastructures, and speculative urban environments.'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED_REJECTION', error)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT_EXCEPTION', error)
  process.exit(1)
})

function bannedWordsFromVoice(voice) {
  const section = voice.split('### Words We Never Use')[1]?.split('### Punctuation and Formatting')[0] ?? ''
  const words = new Set()
  for (const line of section.split(/\r?\n/)) {
    const cleaned = line.replace(/^[-*]\s*/, '').split('(')[0]
    for (const part of cleaned.split(/,| - /)) {
      const word = part.trim().toLowerCase()
      if (word && /^[a-z][a-z -]*$/.test(word)) words.add(word)
    }
  }
  return [...words]
}

function findBanned(copy, bannedWords) {
  const haystack = `${copy.title}\n${copy.description}`.toLowerCase()
  return bannedWords.filter((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack)
  })
}

function hasCaptionReproduction(copy) {
  const description = copy.description.toLowerCase()
  const captionMarkers = [
    'archived spaces on instagram',
    'what makes expo 70',
    'what are your thoughts',
    'this content is for educational purposes only',
    "it wasn't only an exhibition",
    'architects, artists, and engineers imagined',
    'more than a world fair',
    'vision of the future',
    'architects and engineers',
    'what humanity could become',
    'adaptable, flexible',
    'explore this',
    'explore the',
    'showcased innovative',
    'showcased the',
    'step into',
    'featuring ',
    'shape the future',
    'cutting-edge',
    'groundbreaking',
    'envisioned adaptable',
    'vision for adaptable',
    'cities of the future',
    'futuristic environments',
    'expo osaka 79',
  ]
  return captionMarkers.some((marker) => description.includes(marker))
}

function hasQualityViolation(copy) {
  const joined = `${copy.title}\n${copy.description}`.toLowerCase()
  const inventedFormats = [
    'blueprint',
    'poster',
    'print',
    'photograph',
    'archive print',
    'hand-drawn',
  ]
  const genericPhrases = [
    'piece of history',
    'brings the spirit',
    'to life',
    'a glimpse into',
    'captures the essence',
    'showcasing',
    'future-forward',
    'visionaries',
  ]
  return [...inventedFormats, ...genericPhrases].filter((phrase) => joined.includes(phrase))
}

function hasProvenanceLead(copy) {
  return /^(expo osaka 70|1970|metabolist|osaka, japan|japanese)/i.test(copy.description.trim())
}

function toHyphenCase(tag) {
  return String(tag)
    .replace(/#/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function normalizeTags(tags) {
  return [...new Set(tags.map(toHyphenCase).filter(Boolean))].slice(0, 8)
}

function parseHermesJson(raw) {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  const parsed = JSON.parse(trimmed)
  return {
    title: String(parsed.title ?? 'Untitled Catalog Draft').trim(),
    description: String(parsed.description ?? '').trim(),
    provenance: typeof parsed.provenance === 'string' && parsed.provenance.trim() ? parsed.provenance.trim() : null,
    tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag) => typeof tag === 'string' && tag.trim()) : [],
    suggested_theme: String(parsed.suggested_theme ?? 'analog-objects').trim(),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
  }
}

async function callHermes(model, system, user) {
  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      system,
      messages: [{ role: 'user', content: user }],
      format: 'json',
      options: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(300000),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(payload))
  return parseHermesJson(String(payload?.message?.content ?? payload?.response ?? ''))
}

async function chooseThemeSlug(model, title, description) {
  const prompt = `Given this item: ${title} and ${description}, choose exactly one slug from this list:
curated-vintage, analog-objects, sound-collection, buena-onda-original.
Reply with only the slug, nothing else.`

  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(300000),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(payload))
  return String(payload?.message?.content ?? payload?.response ?? '').trim().replace(/[`"'.]/g, '')
}

function buildListingPrompt({ title, description, sourceUrl, imageUrl }) {
  return `You are writing a product listing for Buena Onda, an analog culture house in Miami.

Source material:
- Title: ${title ?? ''}
- Description: ${description ?? ''}
- URL: ${sourceUrl ?? ''}
- Image: ${imageUrl ?? ''}

Write the listing following these examples exactly. Match the voice:

EXAMPLE 1 — Vintage jacket:
title: 1970s French Moleskin Chore Jacket in Faded Indigo
description: Adolphe Lafont workwear, circa mid-1970s. Moleskin cotton built for
decades of manual labor — the indigo has faded unevenly, deeper in the creases,
washed out across the shoulders, which means someone actually wore this to work.
Boxy, structured, and heavy enough to feel like armor without the weight.
provenance: Sourced from a private collection, Lyon.

EXAMPLE 2 — Vintage tee:
title: 1988 Miami Grand Prix Staff Tee
description: Race-day cotton from the last decade of street-circuit Formula One
in downtown Miami. Sun-bleached to a shade the manufacturer never intended.
The kind of shirt that rewrites its own history every time you wash it.
provenance: Estate sale, Coral Gables.

EXAMPLE 3 — Original merch:
title: Buena Onda Analog Broadcast Tee (2026)
description: A transmission from the culture house. Heavyweight cotton, oversize
cut, original broadcast graphic by Buena Onda. This is not a logo tee — it is a
frequency badge. You either receive the signal or you don't.
provenance: null

EXAMPLE 4 — Vinyl record:
title: Ryuichi Sakamoto — B-2 Unit (1980 Original Pressing)
description: The album where Sakamoto left Yellow Magic Orchestra's pop framework
and built something colder, sharper, and more unsettling. Early electronic
production on Alfa Records that still sounds like it arrived from somewhere ahead
of the timeline.
provenance: Japanese pressing. Obi intact. Sleeve shows light edge wear.

Rules:
- Provenance lead first. Name the era, maker, or designer before anything else.
- 2-4 sentences only. Every word earns its place.
- No exclamation marks. No superlatives. No empty intensifiers.
- Do not reproduce the source caption. Write original copy.
- Provenance must be null if era or condition cannot be verified. Never invent.
- suggested_theme must be exactly one of: curated-vintage, analog-objects,
  sound-collection, buena-onda-original.
- tags: 3-8 lowercase hyphenated strings, no hashtags, no camelCase.
- If the source is an archival Instagram post or architectural reference, do not
  invent a sellable physical format such as blueprint, poster, print, or
  photograph. Write about the cultural subject itself.
- Avoid generic catalog phrases such as "piece of history", "brings the spirit
  to life", "a glimpse into", "captures the essence", or "showcasing".
- Give the copy a little editorial heat: concrete nouns, a point of view, and
  one memorable turn of phrase. Keep it grounded, never promotional.
- For this source, a valid provenance lead can name Expo Osaka 70, Osaka, Japan,
  1970, or Metabolist architecture. Start with one of those verified facts.

Return only valid JSON matching this schema, nothing else:
{
  "title": "...",
  "description": "...",
  "provenance": "..." or null,
  "tags": ["..."],
  "suggested_theme": "...",
  "confidence": 0.0-1.0
}`
}

console.log('HERMES_STEP=tags')
const tags = await fetch('http://127.0.0.1:11434/api/tags').then((response) => response.json())
const hermesModel = tags.models.find((model) => model.name === ENRICHMENT_MODEL)?.name
if (!hermesModel) throw new Error(`${ENRICHMENT_MODEL} not found`)
console.log(`HERMES_MODEL=${hermesModel}`)

console.log('HERMES_STEP=item')
const { data: item, error: itemError } = await supabase
  .from('items')
  .select('id,title,description,details,tags,status,availability,price,cover_image_url,slug,theme_id')
  .eq('id', ITEM_ID)
  .single()
if (itemError) throw itemError

console.log('HERMES_STEP=voice')
const voice = fs.readFileSync(VOICE_PATH, 'utf8')
const systemPrompt = voice
const bannedWords = bannedWordsFromVoice(voice)
let user = buildListingPrompt({
  title: item.title,
  description: item.details?.source_description ?? item.details?.og_description ?? FALLBACK_SOURCE_DESCRIPTION,
  sourceUrl: SOURCE_URL,
  imageUrl: item.cover_image_url,
})

console.log('HERMES_STEP=generate')
let copy = await callHermes(hermesModel, systemPrompt, user)
let violations = findBanned(copy, bannedWords)
let captionViolation = hasCaptionReproduction(copy)
let qualityViolations = hasQualityViolation(copy)
let provenanceLeadViolation = !hasProvenanceLead(copy)

for (
  let attempt = 0;
  (
    violations.length > 0 ||
    captionViolation ||
    qualityViolations.length > 0 ||
    provenanceLeadViolation ||
    copy.tags.length < 3
  ) && attempt < 2;
  attempt += 1
) {
  if (violations.length > 0) {
    user += `\n\nBANNED WORD VIOLATION: ${violations.join(', ')}. Regenerate without these words.`
  }
  if (captionViolation) {
    user += '\n\nCAPTION REPRODUCTION VIOLATION: The description reused the source caption. Regenerate original 2-4 sentence curatorial copy only.'
  }
  if (qualityViolations.length > 0) {
    user += `\n\nVOICE QUALITY VIOLATION: Do not use these invented or generic phrases: ${qualityViolations.join(', ')}. Regenerate with grounded editorial warmth.`
  }
  if (provenanceLeadViolation) {
    user += '\n\nPROVENANCE LEAD VIOLATION: The description must begin with one verified context phrase: Expo Osaka 70, 1970, Metabolist, Osaka, Japan, or Japanese.'
  }
  if (copy.tags.length < 3) {
    user += '\n\nTAG COUNT VIOLATION: Return 3-8 lowercase hyphenated tags.'
  }
  copy = await callHermes(hermesModel, systemPrompt, user)
  violations = findBanned(copy, bannedWords)
  captionViolation = hasCaptionReproduction(copy)
  qualityViolations = hasQualityViolation(copy)
  provenanceLeadViolation = !hasProvenanceLead(copy)
}

if (violations.length > 0 || captionViolation || qualityViolations.length > 0 || provenanceLeadViolation || copy.tags.length < 3) {
  copy.title = `REVIEW: ${copy.title}`
  copy.description = `REVIEW: ${copy.description}`
}

copy.provenance = null
copy.tags = normalizeTags(copy.tags)

let needsReview = false
if (!VALID_THEME_SLUGS.includes(copy.suggested_theme)) {
  console.log('HERMES_STEP=theme-fallback')
  const chosenSlug = await chooseThemeSlug(hermesModel, copy.title, copy.description)
  if (VALID_THEME_SLUGS.includes(chosenSlug)) {
    copy.suggested_theme = chosenSlug
  } else {
    copy.suggested_theme = 'analog-objects'
    needsReview = true
    copy.tags = normalizeTags([...copy.tags, 'needs-review'])
  }
}

const { data: theme } = await supabase
  .from('themes')
  .select('id')
  .eq('slug', copy.suggested_theme)
  .maybeSingle()

const { error: updateError } = await supabase
  .from('items')
  .update({
    title: copy.title,
    description: copy.description,
    tags: copy.tags,
    theme_id: theme?.id ?? item.theme_id,
    details: {
      ...(item.details ?? {}),
      provenance: copy.provenance,
      confidence: copy.confidence,
      hermes_model: hermesModel,
      needs_review: needsReview,
    },
  })
  .eq('id', ITEM_ID)
if (updateError) throw updateError

console.log('HERMES_STEP=saved')
console.log(JSON.stringify({
  hermesModel,
  hermesJson: copy,
  bannedWords: {
    status: violations.length === 0 && !captionViolation && qualityViolations.length === 0 && !provenanceLeadViolation && copy.tags.length >= 3 ? 'pass' : 'violations found and marked REVIEW',
    violations,
    captionViolation,
    qualityViolations,
    provenanceLeadViolation,
  },
  themeSlugValid: VALID_THEME_SLUGS.includes(copy.suggested_theme),
  tagsNormalized: copy.tags,
  provenance: copy.provenance,
  saved: ITEM_ID,
}, null, 2))
