#!/usr/bin/env node
/**
 * Sync local product photos → Supabase Storage + item_images table.
 *
 * Usage:
 *   node scripts/sync-item-images.mjs low-cabinet-no-4
 *   node scripts/sync-item-images.mjs --all
 *
 * Source folder: ~/Desktop/products buena onda/{slug}/
 * Files must have numeric prefixes: 1-IMG_4032.jpg, 2-detail.png, etc.
 * Each run is a clean wipe + re-insert — the local folder is the source of truth.
 */

import { createClient } from '@supabase/supabase-js'
import {
  readFileSync, readdirSync, renameSync, existsSync, statSync,
} from 'fs'
import { resolve, join, extname } from 'path'
import { homedir } from 'os'

// ── Parse .env.local ────────────────────────────────────────────────────────
const envPath = resolve(import.meta.dirname, '..', '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase   = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET     = 'catalog'
const BASE_FOLDER = join(homedir(), 'Desktop', 'products buena onda')
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

// ── Helpers ─────────────────────────────────────────────────────────────────
function contentType(ext) {
  if (ext === '.png')  return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

// ── Sync one item ───────────────────────────────────────────────────────────
async function syncItem(slug) {
  console.log(`\n━━ ${slug} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

  // 1. Read folder
  const folder = join(BASE_FOLDER, slug)
  if (!existsSync(folder) || !statSync(folder).isDirectory()) {
    throw new Error(`Folder not found: ${folder}`)
  }

  const files = readdirSync(folder).filter(f =>
    IMAGE_EXTS.has(extname(f).toLowerCase()),
  )
  if (files.length === 0) throw new Error(`No image files in ${folder}`)

  // 2. Sort by numeric prefix — accept "3-detail.png" OR already-renamed "{slug}-03.png"
  const parsed = files.map(f => {
    const rawMatch     = f.match(/^(\d+)-/)
    const renamedMatch = f.match(new RegExp(`^${slug}-(\\d+)`))
    const match = rawMatch || renamedMatch
    if (!match) throw new Error(`Missing numeric prefix on file: ${f}`)
    return { original: f, order: parseInt(match[1], 10) }
  })
  parsed.sort((a, b) => a.order - b.order)

  // 3. Rename locally → {slug}-01.jpg, {slug}-02.jpg, …
  const renamed = []
  for (let i = 0; i < parsed.length; i++) {
    const ext     = extname(parsed[i].original)
    const newName = `${slug}-${String(i + 1).padStart(2, '0')}${ext}`
    const oldPath = join(folder, parsed[i].original)
    const newPath = join(folder, newName)
    if (oldPath !== newPath) renameSync(oldPath, newPath)
    renamed.push(newName)
    console.log(`  rename  ${parsed[i].original} → ${newName}`)
  }

  // 4. Look up item in DB
  const { data: item, error: itemErr } = await supabase
    .from('items')
    .select('id, title')
    .eq('slug', slug)
    .single()
  if (itemErr || !item) throw new Error(`No item in DB for slug "${slug}"`)
  console.log(`  item    "${item.title}" (${item.id})`)

  // 5. Delete existing storage files in items/{slug}/
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list(`items/${slug}`)
  if (existing && existing.length > 0) {
    const paths = existing.map(f => `items/${slug}/${f.name}`)
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths)
    if (rmErr) console.warn(`  ⚠ storage cleanup: ${rmErr.message}`)
    else console.log(`  delete  ${paths.length} old storage file(s)`)
  }

  // 6. Delete existing item_images rows
  const { error: delErr } = await supabase
    .from('item_images')
    .delete()
    .eq('item_id', item.id)
  if (delErr) console.warn(`  ⚠ row cleanup: ${delErr.message}`)
  else console.log('  delete  old item_images rows')

  // 7. Upload renamed images
  const rows = []
  for (let i = 0; i < renamed.length; i++) {
    const filename    = renamed[i]
    const filePath    = join(folder, filename)
    const fileBuffer  = readFileSync(filePath)
    const ext         = extname(filename).toLowerCase()
    const storagePath = `items/${slug}/${filename}`

    let lastErr = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, { contentType: contentType(ext), upsert: true })
      if (!error) { lastErr = null; break }
      lastErr = error
    }
    if (lastErr) throw new Error(`Upload failed for ${filename}: ${lastErr.message}`)

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    rows.push({
      item_id:    item.id,
      url:        publicUrl,
      sort_order: i + 1,
      alt_text:   `${item.title} — view ${i + 1}`,
    })
    console.log(`  upload  ${filename} → sort_order ${i + 1}`)
  }

  // 8. Insert item_images rows
  const { error: insertErr } = await supabase.from('item_images').insert(rows)
  if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`)

  // 9. Verify & summary
  const { count } = await supabase
    .from('item_images')
    .select('*', { count: 'exact', head: true })
    .eq('item_id', item.id)

  console.log(`\n  ✓ ${rows.length} images synced  ·  ${count} DB rows`)
  rows.forEach((r, i) => console.log(`    ${i + 1}. ${r.url}`))
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage:\n  node scripts/sync-item-images.mjs <slug>\n  node scripts/sync-item-images.mjs --all')
  process.exit(1)
}

if (args[0] === '--all') {
  if (!existsSync(BASE_FOLDER)) {
    console.error(`Base folder not found: ${BASE_FOLDER}`)
    process.exit(1)
  }
  const dirs = readdirSync(BASE_FOLDER, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  if (dirs.length === 0) {
    console.log('No subfolders found.')
    process.exit(0)
  }

  let ok = 0; let skip = 0
  for (const slug of dirs) {
    try { await syncItem(slug); ok++ }
    catch (e) { console.warn(`\n  ⚠ Skipping ${slug}: ${e.message}`); skip++ }
  }
  console.log(`\nDone. ${ok} synced, ${skip} skipped.`)
} else {
  try {
    await syncItem(args[0])
    console.log('\nDone.')
  } catch (e) {
    console.error(`\n✗ ${e.message}`)
    process.exit(1)
  }
}
