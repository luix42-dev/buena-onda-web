import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const ITEM_ID = 'e50ed838-340d-4a4e-a4cc-99ba31b1f824'
const ORDER_ID = 'f34f3f8e-53d5-414a-8b60-2b791954c298'
const SOURCE_URL = 'https://www.instagram.com/p/DYzyoBskZ8A/?img_index=7&igsh=eW5xdm1qZjdmMHpl'
const VOICE_PATH = path.join(process.cwd(), 'src/brand/voice_v2.md')
const ENRICHMENT_MODEL = 'mistral:latest'
const FALLBACK_SOURCE_DESCRIPTION =
  'The source identifies Expo Osaka 70, held in Osaka, Japan, in 1970, with Metabolist architecture, experimental structures, inflatable pavilions, megastructures, and speculative urban environments.'

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is missing`)
  return value
}

const supabase = createClient(
  requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
  requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)

async function telegram(text) {
  const token = requiredEnv('TELEGRAM_BOT_TOKEN')
  const chatId = requiredEnv('TELEGRAM_CHAT_ID')
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description ?? `Telegram failed with ${response.status}`)
  }
  return payload.result.message_id
}

async function fetchJson(url, init = {}, timeoutMs = 120000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    if (!response.ok) throw new Error(`${url} failed with ${response.status}: ${text}`)
    return JSON.parse(text)
  } finally {
    clearTimeout(timeout)
  }
}

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

function parseHermesJson(raw) {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  const parsed = JSON.parse(trimmed)
  return {
    title: String(parsed.title ?? 'Untitled Catalog Draft').trim(),
    description: String(parsed.description ?? '').trim(),
    provenance: typeof parsed.provenance === 'string' && parsed.provenance.trim() ? parsed.provenance.trim() : null,
    tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag) => typeof tag === 'string' && tag.trim()) : [],
    suggested_theme: String(parsed.suggested_theme ?? 'curated-vintage').trim(),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
  }
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

async function callHermes(model, voice, user) {
  const payload = await fetchJson('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      system: voice,
      messages: [{ role: 'user', content: user }],
      format: 'json',
    }),
  })
  return parseHermesJson(String(payload?.message?.content ?? payload?.response ?? ''))
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

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch('http://127.0.0.1:3000/studio/login')
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('Dev server did not become ready')
}

async function runLiveTransition(titleForReport) {
  const server = spawn('npm', ['run', 'dev'], {
    stdio: ['ignore', 'ignore', 'ignore'],
    env: {
      ...process.env,
      PATH: `/home/luix4/.nvm/versions/node/v20.20.2/bin:${process.env.PATH}`,
    },
  })

  try {
    await waitForServer()
    const login = await fetch('http://127.0.0.1:3000/studio/auth/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: requiredEnv('STUDIO_PASSWORD') }),
    })
    if (!login.ok) throw new Error(`Studio login failed: ${login.status} ${await login.text()}`)
    const cookie = login.headers.get('set-cookie')?.split(';')[0]
    if (!cookie) throw new Error('Studio login did not return a cookie')

    const itemResponse = await fetch(`http://127.0.0.1:3000/api/admin/items/${ITEM_ID}`, {
      headers: { cookie },
    })
    if (!itemResponse.ok) throw new Error(`Item fetch failed: ${itemResponse.status}`)
    const item = await itemResponse.json()

    const body = {
      title: item.title,
      slug: item.slug,
      theme_id: item.theme_id,
      price: item.price,
      buy_url: item.buy_url,
      description: item.description,
      tags: item.tags,
      cover_image_url: item.cover_image_url,
      details: item.details,
      availability: item.availability,
    }

    const reset = await fetch(`http://127.0.0.1:3000/api/admin/items/${ITEM_ID}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ ...body, status: 'draft' }),
    })
    if (!reset.ok) throw new Error(`Draft reset failed: ${reset.status} ${await reset.text()}`)

    const publish = await fetch(`http://127.0.0.1:3000/api/admin/items/${ITEM_ID}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ ...body, status: 'published' }),
    })
    const published = await publish.json()
    if (!publish.ok) throw new Error(`Publish failed: ${publish.status} ${JSON.stringify(published)}`)
    return {
      title: titleForReport,
      messageId: published.telegram?.messageId ?? null,
      telegram: published.telegram ?? null,
    }
  } finally {
    server.kill()
  }
}

const telegramTestMessageId = await telegram('Buena Onda — system check.')

const tagsPayload = await fetchJson('http://127.0.0.1:11434/api/tags', {}, 10000)
const models = Array.isArray(tagsPayload.models) ? tagsPayload.models : []
const hermesModel = models.find((model) => model.name === ENRICHMENT_MODEL)?.name
if (!hermesModel) throw new Error(`${ENRICHMENT_MODEL} not found from Ollama tags`)

const { data: item, error: itemError } = await supabase
  .from('items')
  .select('id,title,description,details,tags,status,availability,price,cover_image_url,slug')
  .eq('id', ITEM_ID)
  .single()
if (itemError) throw itemError

const voice = fs.readFileSync(VOICE_PATH, 'utf8')
const bannedWords = bannedWordsFromVoice(voice)
let user = buildListingPrompt({
  title: item.title,
  description: item.details?.source_description ?? item.details?.og_description ?? FALLBACK_SOURCE_DESCRIPTION,
  sourceUrl: SOURCE_URL,
  imageUrl: item.cover_image_url,
})

let hermesJson = await callHermes(hermesModel, voice, user)
let violations = findBanned(hermesJson, bannedWords)
let qualityViolations = hasQualityViolation(hermesJson)
let provenanceLeadViolation = !hasProvenanceLead(hermesJson)

for (let attempt = 0; (violations.length > 0 || qualityViolations.length > 0 || provenanceLeadViolation || hermesJson.tags.length < 3) && attempt < 2; attempt += 1) {
  if (violations.length > 0) {
    user += `\n\nBANNED WORD VIOLATION: ${violations.join(', ')}. Regenerate without these words.`
  }
  if (qualityViolations.length > 0) {
    user += `\n\nVOICE QUALITY VIOLATION: Do not use these invented or generic phrases: ${qualityViolations.join(', ')}. Regenerate with grounded editorial warmth.`
  }
  if (provenanceLeadViolation) {
    user += '\n\nPROVENANCE LEAD VIOLATION: The description must begin with one verified context phrase: Expo Osaka 70, 1970, Metabolist, Osaka, Japan, or Japanese.'
  }
  if (hermesJson.tags.length < 3) {
    user += '\n\nTAG COUNT VIOLATION: Return 3-8 lowercase hyphenated tags.'
  }
  hermesJson = await callHermes(hermesModel, voice, user)
  violations = findBanned(hermesJson, bannedWords)
  qualityViolations = hasQualityViolation(hermesJson)
  provenanceLeadViolation = !hasProvenanceLead(hermesJson)
}

if (violations.length > 0 || qualityViolations.length > 0 || provenanceLeadViolation || hermesJson.tags.length < 3) {
  hermesJson.title = `REVIEW: ${hermesJson.title}`
  hermesJson.description = `REVIEW: ${hermesJson.description}`
}

hermesJson.provenance = null

const { data: theme } = await supabase
  .from('themes')
  .select('id')
  .eq('slug', hermesJson.suggested_theme)
  .maybeSingle()

const { error: updateError } = await supabase
  .from('items')
  .update({
    title: hermesJson.title,
    description: hermesJson.description,
    tags: hermesJson.tags,
    theme_id: theme?.id ?? item.theme_id,
    details: {
      ...(item.details ?? {}),
      provenance: hermesJson.provenance,
      confidence: hermesJson.confidence,
      hermes_model: hermesModel,
    },
  })
  .eq('id', ITEM_ID)

if (updateError) throw updateError

const live = await runLiveTransition(hermesJson.title)

const { data: order, error: orderError } = await supabase
  .from('orders')
  .select('id, amount_total, currency, item:items(title)')
  .eq('id', ORDER_ID)
  .single()
if (orderError) throw orderError

const amount = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: String(order.currency ?? 'usd').toUpperCase(),
}).format(Number(order.amount_total ?? 0) / 100)
const orderMessageId = await telegram(`Order received: ${order.item?.title ?? hermesJson.title} — ${amount}`)

console.log(JSON.stringify({
  telegramTestMessageId,
  hermesModel,
  hermesJson,
  bannedWords: {
    status: violations.length === 0 ? 'pass' : 'violations found and marked REVIEW',
    violations,
  },
  provenance: hermesJson.provenance,
  itemId: ITEM_ID,
  liveTransition: live,
  orderPingMessageId: orderMessageId,
}, null, 2))
