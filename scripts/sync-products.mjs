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
dotenv.config({ path: resolve(fileURLToPath(import.meta.url), '../../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import {
  readFileSync, writeFileSync, readdirSync, renameSync,
  existsSync, statSync, mkdirSync,
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
const BUCKET      = 'catalog'
const BASE_FOLDER = 'D:/BuenaOnda_Audit/products buena onda'
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

// ── Sync one slug ───────────────────────────────────────────────────────────
async function syncSlug(slug, folder, state) {
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

  // Look up item in DB
  const { data: item, error: itemErr } = await supabase
    .from('items')
    .select('id, title')
    .eq('slug', slug)
    .single()
  if (itemErr || !item) throw new Error(`Slug "${slug}" not found in DB`)

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
      const count = await syncSlug(slug, join(BASE_FOLDER, dirName), state)
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
