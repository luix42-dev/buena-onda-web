#!/usr/bin/env node
/**
 * Cron-friendly product image sync.
 * Watches D:\BuenaOnda_Audit\products buena onda/ for changes,
 * uploads to Supabase Storage and syncs item_images table.
 *
 * Usage:
 *   node scripts/sync-products.mjs          # sync all changed folders
 *   node scripts/sync-products.mjs --force  # ignore state, re-sync everything
 *
 * Designed to run via cron every 60 seconds. Silent when nothing to do.
 */

import { join, extname, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load .env.local (Next.js convention)
dotenv.config({ path: resolve(fileURLToPath(import.meta.url), '../../.env.local'), override: true })

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import {
  readFileSync, writeFileSync, readdirSync, renameSync,
  existsSync, statSync,
} from 'fs'
import { homedir } from 'os'

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  // Silent exit — cron should not spam logs for missing config
  process.exit(0)
}

const supabase    = createClient(SUPABASE_URL, SERVICE_KEY)
const anthropic   = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null
const BUCKET      = 'catalog'
const BASE_FOLDER = 'D:/BuenaOnda_Audit/PRODUCTS BUENA ONDA'
const STATE_FILE  = resolve(import.meta.dirname, '.sync-state.json')
const IMAGE_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const FORCE       = process.argv.includes('--force')

// Folder → slug mapping. Lives in the products folder as .slugs.json.
// Example: { "red cabinet": "low-cabinet-no-4" }
// If a folder isn't mapped, falls back to auto-slugify.
const SLUG_MAP_FILE = join(BASE_FOLDER, '.slugs.json')

function loadSlugMap() {
  try {
    return JSON.parse(readFileSync(SLUG_MAP_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function resolveSlug(dirName, slugMap) {
  // Explicit mapping takes priority
  if (slugMap[dirName]) return slugMap[dirName]
  // Fall back to auto-slugify
  return slugify(dirName)
}

// ── State helpers ───────────────────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

function computeHash(folder, files) {
  const entries = files
    .map(f => {
      const s = statSync(join(folder, f))
      return `${f}:${s.size}`
    })
    .sort()
    .join('|')
  return createHash('md5').update(entries).digest('hex')
}

function contentType(ext) {
  if (ext === '.png')  return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

// ── AI description generation ────────────────────────────────────────────────
async function generateDescriptions(imageFiles, folder, knownMeta) {
  if (!anthropic) return null

  // Send up to 3 images to Claude
  const imagesToSend = imageFiles.slice(0, 3)
  const imageContent = imagesToSend.map(filename => {
    const ext     = extname(filename).toLowerCase().replace('.', '')
    const mime    = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const b64     = readFileSync(join(folder, filename)).toString('base64')
    return { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }
  })

  const knownDetails = [
    knownMeta.era       && `Era: ${knownMeta.era}`,
    knownMeta.material  && `Material: ${knownMeta.material}`,
    knownMeta.condition && `Condition: ${knownMeta.condition}`,
    knownMeta.origin    && `Origin: ${knownMeta.origin}`,
    knownMeta.price     && `Price: $${knownMeta.price}`,
  ].filter(Boolean).join('\n')

  const prompt = `You are writing catalog copy for Buena Onda — a Miami-based analog culture house. The tone is editorial, specific, and confident. Never generic. Never flowery.

Known details:
${knownDetails || 'None provided'}

Write two things:
1. DESCRIPTION: 1–2 sentences. Describe what you see — the object, its material, its presence. Be specific.
2. WHY_WE_CHOSE_THIS: 2–3 sentences. The curatorial story — why this piece belongs in this catalog. Can reference where it might have come from, what room it commands, why the quality is notable.

Respond in this exact JSON format:
{"description": "...", "why_we_chose_this": "..."}`

  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role:    'user',
      content: [...imageContent, { type: 'text', text: prompt }],
    }],
  })

  try {
    const text = response.content[0].text.trim()
    const json = text.match(/\{[\s\S]*\}/)
    if (!json) {
      console.warn(`[${timestamp()}] ⚠ AI response had no JSON: ${text.slice(0, 200)}`)
      return null
    }
    return JSON.parse(json[0])
  } catch (err) {
    console.warn(`[${timestamp()}] ⚠ AI parse error: ${err.message}`)
    return null
  }
}

// ── Sync one slug ───────────────────────────────────────────────────────────
async function syncSlug(slug, folder, state, dirName) {
  // Scan for image files
  const files = readdirSync(folder).filter(f =>
    IMAGE_EXTS.has(extname(f).toLowerCase()),
  )
  if (files.length === 0) return false // empty folder — skip silently

  // Check hash
  const hash = computeHash(folder, files)
  if (!FORCE && state[slug]?.fileHash === hash) return false // unchanged

  // Parse sort order from filenames. Accepts:
  //   "1.png", "2.jpg"             — bare number
  //   "1-angle.png", "2-detail"    — number-dash prefix
  //   "{slug}-01.png"              — already renamed (current slug)
  //   "{anything}-01.png"          — already renamed (previous slug)
  const parsed = files.map(f => {
    const bareMatch    = f.match(/^(\d+)\./)                     // 1.png
    const prefixMatch  = f.match(/^(\d+)-/)                      // 1-angle.png
    const renamedMatch = f.match(/-(\d{2})\.[a-z]+$/i)           // *-01.png (2-digit suffix)
    const match = prefixMatch || bareMatch || renamedMatch
    if (!match) throw new Error(`Missing numeric prefix: ${f}`)
    return { original: f, order: parseInt(match[1], 10) }
  })
  parsed.sort((a, b) => a.order - b.order)

  // Rename locally
  const renamed = []
  for (let i = 0; i < parsed.length; i++) {
    const ext     = extname(parsed[i].original)
    const newName = `${slug}-${String(i + 1).padStart(2, '0')}${ext}`
    const oldPath = join(folder, parsed[i].original)
    const newPath = join(folder, newName)
    if (oldPath !== newPath) renameSync(oldPath, newPath)
    renamed.push(newName)
  }

  // Read optional .meta.json for product details
  const metaPath = join(folder, '.meta.json')
  let meta = {}
  try { meta = JSON.parse(readFileSync(metaPath, 'utf-8')) } catch { /* no meta file — ok */ }

  // AI-generate description + why_we_chose_this if not already in meta
  if (!meta.description && anthropic) {
    console.log(`[${timestamp()}] ✦ generating description for "${dirName}"…`)
    const ai = await generateDescriptions(renamed, folder, meta).catch(err => {
      console.warn(`[${timestamp()}] ⚠ AI call failed: ${err.message}`)
      return null
    })
    if (ai?.description) {
      meta.description       = ai.description
      meta.why_we_chose_this = ai.why_we_chose_this ?? undefined
      // Save back to .meta.json so it won't regenerate next run
      writeFileSync(metaPath, JSON.stringify(meta, null, 2))
      console.log(`[${timestamp()}] ✦ description saved to .meta.json`)
    }
  }

  const titleFromDir = dirName
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

  // Build the DB payload from meta
  const { price, description, era, material, condition, origin, status, theme_slug, tags, why_we_chose_this } = meta
  const details = {}
  if (era)               details.era               = era
  if (material)          details.material          = material
  if (condition)         details.condition         = condition
  if (origin)            details.origin            = origin
  if (why_we_chose_this) details.why_we_chose_this = why_we_chose_this

  // Look up item in DB — auto-create as draft if not found
  let { data: item } = await supabase
    .from('items')
    .select('id, title')
    .eq('slug', slug)
    .single()

  if (!item) {
    // Resolve theme_id if theme_slug provided
    let theme_id = null
    if (theme_slug) {
      const { data: theme } = await supabase.from('themes').select('id').eq('slug', theme_slug).single()
      theme_id = theme?.id ?? null
    }

    const { data: created, error: createErr } = await supabase
      .from('items')
      .insert({
        title:       meta.title ?? titleFromDir,
        slug,
        status:      status ?? 'draft',
        description: description ?? null,
        price:       price ?? null,
        details:     Object.keys(details).length ? details : null,
        tags:        tags ?? null,
        theme_id,
      })
      .select('id, title')
      .single()
    if (createErr || !created) throw new Error(`Failed to create item "${slug}": ${createErr?.message}`)
    item = created
    console.log(`[${timestamp()}] + created item: "${item.title}" (${slug}) [${status ?? 'draft'}]`)
  } else if (Object.keys(meta).length) {
    // Item exists — update any fields provided in meta
    let theme_id = undefined
    if (theme_slug) {
      const { data: theme } = await supabase.from('themes').select('id').eq('slug', theme_slug).single()
      theme_id = theme?.id ?? null
    }
    const updates = {}
    if (meta.title)       updates.title       = meta.title
    if (price !== undefined) updates.price     = price
    if (description)      updates.description = description
    if (status)           updates.status      = status
    if (tags)             updates.tags        = tags
    if (theme_id !== undefined) updates.theme_id = theme_id
    if (Object.keys(details).length) updates.details = details
    if (Object.keys(updates).length) {
      await supabase.from('items').update(updates).eq('id', item.id)
    }
  }

  // Delete old storage files
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list(`items/${slug}`)
  if (existing?.length) {
    await supabase.storage
      .from(BUCKET)
      .remove(existing.map(f => `items/${slug}/${f.name}`))
  }

  // Delete old item_images rows
  await supabase.from('item_images').delete().eq('item_id', item.id)

  // Upload + collect rows
  const rows = []
  let coverUrl = null

  for (let i = 0; i < renamed.length; i++) {
    const filename    = renamed[i]
    const filePath    = join(folder, filename)
    const fileBuffer  = readFileSync(filePath)
    const ext         = extname(filename).toLowerCase()
    const storagePath = `items/${slug}/${filename}`

    // Upload with 1 retry
    let lastErr = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, { contentType: contentType(ext), upsert: true })
      if (!error) { lastErr = null; break }
      lastErr = error
    }
    if (lastErr) throw new Error(`Upload failed: ${filename} — ${lastErr.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    if (i === 0) coverUrl = publicUrl

    rows.push({
      item_id:    item.id,
      url:        publicUrl,
      sort_order: i + 1,
      alt_text:   `${item.title} — view ${i + 1}`,
    })
  }

  // Update cover_image_url on item
  if (coverUrl) {
    const { error: coverErr } = await supabase
      .from('items')
      .update({ cover_image_url: coverUrl })
      .eq('id', item.id)
    if (coverErr) throw new Error(`Cover update failed: ${coverErr.message}`)
  }

  // Insert item_images rows
  const { error: insertErr } = await supabase.from('item_images').insert(rows)
  if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`)

  // Update state
  state[slug] = { lastSynced: new Date().toISOString(), fileHash: computeHash(folder, renamed) }

  return rows.length
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(BASE_FOLDER)) return // no folder — silent exit

  const dirs = readdirSync(BASE_FOLDER, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  if (dirs.length === 0) return

  const state   = loadState()
  const slugMap = loadSlugMap()
  let anySync   = false

  for (const dirName of dirs) {
    const slug = resolveSlug(dirName, slugMap)
    if (!slug) continue
    try {
      const count = await syncSlug(slug, join(BASE_FOLDER, dirName), state, dirName)
      if (count) {
        console.log(`[${timestamp()}] ✓ ${slug}: ${count} images synced (cover + ${count - 1} gallery)`)
        anySync = true
      }
    } catch (e) {
      console.warn(`[${timestamp()}] ⚠ ${slug}: ${e.message}`)
    }
  }

  if (anySync) saveState(state)
}

main().catch(e => {
  console.error(`[${timestamp()}] FATAL: ${e.message}`)
})
