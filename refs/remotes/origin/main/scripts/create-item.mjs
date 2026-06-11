#!/usr/bin/env node
/**
 * Buena Onda — AI Product Creation
 *
 * Usage:
 *   node scripts/create-item.mjs "yellow panel lamp"
 *   node scripts/create-item.mjs --batch
 *
 * Sends the first image of a folder to Claude API with the full brand voice
 * guide, gets back structured product data, creates a draft item in Supabase,
 * generates a slug, and renames the folder on disk.
 *
 * Reads config from:
 *   PRODUCTS_DIR  — local folder with product subfolders
 *   BRAND_DIR     — path to voice.md + categories.json
 *   ANTHROPIC_API_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 */

import { createClient }                          from '@supabase/supabase-js'
import Anthropic                                  from '@anthropic-ai/sdk'
import slugify                                    from 'slugify'
import sharp                                      from 'sharp'
import { resolve, join, extname, dirname }        from 'path'
import { fileURLToPath }                          from 'url'
import { readFileSync, readdirSync, renameSync,
         existsSync, statSync }                   from 'fs'
import { homedir }                                from 'os'
import { createRequire }                          from 'module'

// ── .env.local ───────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath   = resolve(__dirname, '..', '.env.local')
const env       = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
// Merge into process.env so Anthropic SDK and Supabase pick them up
Object.assign(process.env, env)

// ── Config ───────────────────────────────────────────────────────────────────
const PRODUCTS_DIR = (env.PRODUCTS_DIR || '~/Desktop/products buena onda')
  .replace(/^~/, homedir())
const BRAND_DIR    = env.BRAND_DIR || 'D:/BuenaOnda_Audit/pipeline/src/brand'
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY
const IMAGE_EXTS   = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const MODEL        = 'claude-sonnet-4-20250514'

// ── Validate required keys ───────────────────────────────────────────────────
if (!ANTHROPIC_KEY) {
  console.error('✗ Missing ANTHROPIC_API_KEY in .env.local')
  process.exit(1)
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const ai       = new Anthropic({ apiKey: ANTHROPIC_KEY })

// ── Helpers ──────────────────────────────────────────────────────────────────
function mimeType(ext) {
  if (ext === '.png')  return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif')  return 'image/gif'
  return 'image/jpeg'
}

function loadBrandFiles() {
  const voicePath      = join(BRAND_DIR, 'voice.md')
  const categoriesPath = join(BRAND_DIR, 'categories.json')
  if (!existsSync(voicePath))      throw new Error(`voice.md not found at ${voicePath}`)
  if (!existsSync(categoriesPath)) throw new Error(`categories.json not found at ${categoriesPath}`)
  const voice      = readFileSync(voicePath, 'utf-8')
  const categories = JSON.parse(readFileSync(categoriesPath, 'utf-8'))
  return { voice, categories }
}

function buildCategoryBlock(categories) {
  return Object.entries(categories)
    .filter(([k]) => !k.startsWith('_'))
    .map(([key, cfg]) => `- ${key}: ${cfg.ai_notes}`)
    .join('\n')
}

function sortImageFiles(files) {
  const parsed = files.map(f => {
    const bareMatch    = f.match(/^(\d+)\./)
    const prefixMatch  = f.match(/^(\d+)-/)
    const renamedMatch = f.match(/-(\d{2,})\.[a-z]+$/i)
    const match        = prefixMatch || bareMatch || renamedMatch
    const order        = match ? parseInt(match[1], 10) : 999
    return { file: f, order }
  })
  parsed.sort((a, b) => a.order - b.order)
  return parsed.map(p => p.file)
}

async function toBase64(filePath, ext) {
  // Resize to max 2048px on longest side before encoding
  const buf = await sharp(filePath)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .toBuffer()
  return buf.toString('base64')
}

function makeSlug(title) {
  const cleaned = title.replace(/\s*\([^)]*\)/g, '').trim()
  return slugify(cleaned, { lower: true, strict: true }).slice(0, 60).replace(/-+$/, '')
}

async function uniqueSlug(base) {
  let slug     = base
  let attempt  = 2
  while (true) {
    const { data } = await supabase.from('items').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    slug = `${base}-${attempt++}`
  }
}

function clampPrice(suggested, categories, category) {
  const cfg = categories[category]
  if (!cfg) return null
  if (typeof suggested !== 'number' || isNaN(suggested)) return cfg.default_price
  const [min, max] = cfg.price_range
  return Math.min(max, Math.max(min, suggested))
}

function validateTheme(suggested, categories, category) {
  const required = categories._themes_required || []
  if (required.includes(suggested)) return suggested
  return categories[category]?.default_theme || 'analog-objects'
}

// ── Create one item ──────────────────────────────────────────────────────────
async function createItem(folderName) {
  console.log(`\n━━ "${folderName}" ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  // 1. Find folder
  const folderPath = join(PRODUCTS_DIR, folderName)
  if (!existsSync(folderPath) || !statSync(folderPath).isDirectory()) {
    throw new Error(`Folder not found: ${folderPath}`)
  }

  // 2. Find + sort images
  const allFiles  = readdirSync(folderPath)
  const imgFiles  = allFiles.filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()))
  if (imgFiles.length === 0) {
    throw new Error(`No image files found in ${folderPath}`)
  }
  const sorted    = sortImageFiles(imgFiles)
  const firstImg  = sorted[0]
  const firstPath = join(folderPath, firstImg)
  const ext       = extname(firstImg).toLowerCase()

  console.log(`  images  ${sorted.length} found — using ${firstImg} for AI`)

  // 3. Load brand files
  const { voice, categories } = loadBrandFiles()
  const categoryBlock         = buildCategoryBlock(categories)

  // 4. Encode first image
  const imageBase64 = await toBase64(firstPath, ext)
  const mime        = mimeType(ext)

  // 5. Call Claude
  console.log(`  claude  calling ${MODEL}...`)
  const response = await ai.messages.create({
    model:      MODEL,
    max_tokens: 1024,
    system:     voice,
    messages: [{
      role:    'user',
      content: [
        {
          type:   'image',
          source: { type: 'base64', media_type: mime, data: imageBase64 },
        },
        {
          type: 'text',
          text: `You are classifying and writing a product listing for the Buena Onda catalog.

The seller described this item as: "${folderName}"

STEP 1 — Identify the correct category from this list:
${categoryBlock}

STEP 2 — Write the product listing following your system instructions. Use the seller description as a hint but write your own title and description based on what you see in the image.

Return ONLY a JSON object:
{
  "category": "the category key from the list above",
  "title": "...",
  "description": "...",
  "provenance": "..." or null,
  "tags": ["..."],
  "suggested_theme": "...",
  "suggested_price": number,
  "confidence": number
}

No markdown. No backticks. No preamble. Only the JSON object.`,
        },
      ],
    }],
  })

  // 6. Parse response
  const raw  = response.content[0]?.text?.trim() || ''
  const json = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let aiData
  try {
    aiData = JSON.parse(json)
  } catch {
    console.error(`  ✗ Invalid JSON from Claude:\n${raw.slice(0, 500)}`)
    throw new Error('Claude returned invalid JSON — skipping')
  }

  const { title, description, provenance = null, tags = [], confidence = 0.7 } = aiData
  let { category, suggested_theme, suggested_price } = aiData

  // 7. Validate
  if (!categories[category]) {
    console.warn(`  ⚠ Unknown category "${category}" — falling back to "objects"`)
    category = 'objects'
  }
  const price      = clampPrice(suggested_price, categories, category)
  const themeSlug  = validateTheme(suggested_theme, categories, category)

  console.log(`  ai      category=${category} theme=${themeSlug} price=$${price} confidence=${confidence}`)
  console.log(`  title   ${title}`)

  // 8. Generate slug
  const baseSlug = makeSlug(title)
  const slug     = await uniqueSlug(baseSlug)

  // 9. Resolve theme_id
  const { data: theme } = await supabase.from('themes').select('id').eq('slug', themeSlug).maybeSingle()
  const theme_id = theme?.id ?? null

  // 10. Insert into Supabase
  const itemTitle = confidence < 0.5 ? `[NEEDS REVIEW] ${title}` : title
  const { data: item, error: insertErr } = await supabase
    .from('items')
    .insert({
      title:       itemTitle,
      slug,
      description,
      details:     { category, provenance, ai_confidence: confidence },
      price,
      tags,
      theme_id,
      status:      'published',
      published_at: new Date().toISOString(),
    })
    .select('id, slug, title')
    .single()

  if (insertErr || !item) throw new Error(`Supabase insert failed: ${insertErr?.message}`)

  // 11. Rename folder
  const newFolderPath = join(PRODUCTS_DIR, slug)
  if (folderPath !== newFolderPath) {
    try {
      renameSync(folderPath, newFolderPath)
      console.log(`  rename  "${folderName}" → "${slug}"`)
    } catch (e) {
      console.warn(`  ⚠ Folder rename failed: ${e.message} (slug is in DB, sync will work)`)
    }
  }

  // 12. Log result
  const confStr = confidence.toFixed(2)
  console.log(`\n  ✓ Created: ${itemTitle} [${slug}] — ${category} — $${price} — confidence: ${confStr}`)
  if (confidence < 0.5) {
    console.warn(`  ⚠ Very low confidence (${confStr}) — flagged [NEEDS REVIEW] in DB`)
  } else if (confidence < 0.7) {
    console.warn(`  ⚠ Low confidence (${confStr}) — review before publishing`)
  }

  return { slug, title: itemTitle }
}

// ── Batch mode ───────────────────────────────────────────────────────────────
async function batchCreate() {
  if (!existsSync(PRODUCTS_DIR)) {
    console.error(`✗ PRODUCTS_DIR not found: ${PRODUCTS_DIR}`)
    process.exit(1)
  }

  const dirs = readdirSync(PRODUCTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)

  if (dirs.length === 0) {
    console.log('No subfolders found.')
    return
  }

  let created = 0
  let skipped = 0

  for (const dirName of dirs) {
    // Check if a slug derived from this folder name already exists
    const candidateSlug = makeSlug(dirName)
    const { data: existing } = await supabase
      .from('items')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle()

    if (existing) {
      console.log(`  skip    "${dirName}" — slug "${candidateSlug}" already in DB`)
      skipped++
      continue
    }

    // Also check if any image files exist
    const folder   = join(PRODUCTS_DIR, dirName)
    const imgFiles = readdirSync(folder).filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()))
    if (imgFiles.length === 0) {
      console.warn(`  skip    "${dirName}" — no images`)
      skipped++
      continue
    }

    try {
      await createItem(dirName)
      created++
    } catch (e) {
      console.warn(`  ⚠ Skipping "${dirName}": ${e.message}`)
      skipped++
    }

    // Rate limit delay
    if (created + skipped < dirs.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`)
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage:\n  node scripts/create-item.mjs <folder-name>\n  node scripts/create-item.mjs --batch')
  process.exit(1)
}

if (args[0] === '--batch') {
  await batchCreate()
} else {
  const folderName = args.join(' ')  // allow multi-word names without quotes
  try {
    await createItem(folderName)
    console.log('\nDone.')
  } catch (e) {
    console.error(`\n✗ ${e.message}`)
    process.exit(1)
  }
}
