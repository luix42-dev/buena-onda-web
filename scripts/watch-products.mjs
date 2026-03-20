#!/usr/bin/env node
/**
 * Buena Onda — Product Folder Watcher
 *
 * Usage:
 *   node scripts/watch-products.mjs
 *
 * Watches PRODUCTS_DIR for new or changed folders.
 * - New folder (no matching slug in DB) → create-item.mjs → sync-item-images.mjs
 * - Existing slug folder (images changed)  → sync-item-images.mjs only
 *
 * Debounce: 5 seconds of quiet after last file event before processing.
 * Never crashes on errors — wraps everything in try/catch, keeps watching.
 */

import chokidar                                       from 'chokidar'
import { createClient }                               from '@supabase/supabase-js'
import slugify                                        from 'slugify'
import { execFileSync }                               from 'child_process'
import { resolve, join, basename, dirname }           from 'path'
import { fileURLToPath }                              from 'url'
import { readFileSync, existsSync, readdirSync }      from 'fs'
import { homedir }                                    from 'os'

// ── .env.local ───────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath   = resolve(__dirname, '..', '.env.local')
const env       = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)

// ── Config ───────────────────────────────────────────────────────────────────
const PRODUCTS_DIR  = (env.PRODUCTS_DIR || '~/Desktop/products buena onda').replace(/^~/, homedir())
const SUPABASE_URL  = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY   = env.SUPABASE_SERVICE_ROLE_KEY
const DEBOUNCE_MS   = 5000
const SCRIPTS_DIR   = __dirname

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Missing Supabase keys in .env.local')
  process.exit(1)
}
if (!existsSync(PRODUCTS_DIR)) {
  console.error(`✗ PRODUCTS_DIR not found: ${PRODUCTS_DIR}`)
  console.error('  Set PRODUCTS_DIR in .env.local and create the folder.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Optional desktop notifications ──────────────────────────────────────────
let notifier = null
try { notifier = (await import('node-notifier')).default } catch { /* optional */ }

function notify(message) {
  notifier?.notify({ title: 'Buena Onda', message })
}

// ── Slug helper ──────────────────────────────────────────────────────────────
function toSlug(name) {
  return slugify(name, { lower: true, strict: true }).slice(0, 60).replace(/-+$/, '')
}

// ── Debounce map: folderName → timeout handle ────────────────────────────────
const debounce        = new Map()
const processing      = new Set()   // folders currently being processed — no re-entry
const recentlySynced  = new Map()   // slug → timestamp — ignore re-triggers after rename
const COOLDOWN_MS     = 30_000      // ignore re-triggers for 30s after a successful sync

// ── Process a folder ─────────────────────────────────────────────────────────
async function processFolder(folderName) {
  if (processing.has(folderName)) {
    console.log(`[${ts()}]    Already processing "${folderName}" — skipping`)
    return
  }
  const slug = toSlug(folderName)
  const lastSync = recentlySynced.get(slug)
  if (lastSync && Date.now() - lastSync < COOLDOWN_MS) {
    console.log(`[${ts()}]    "${slug}" synced ${Math.round((Date.now() - lastSync) / 1000)}s ago — skipping re-trigger`)
    return
  }
  processing.add(folderName)
  console.log(`\n[${ts()}] ⟳  Processing "${folderName}"...`)

  try {
    const { data: existing } = await supabase
      .from('items')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (!existing) {
      // ── New product: AI generation + image sync ──────────────────────────
      console.log(`[${ts()}] ✦  New folder — running AI generation...`)
      execFileSync(
        process.execPath,
        [join(SCRIPTS_DIR, 'create-item.mjs'), folderName],
        { stdio: 'inherit', cwd: resolve(SCRIPTS_DIR, '..') },
      )

      // After create-item, the folder was renamed to the AI-generated slug.
      // Query the DB for the most recently created item to get the real slug.
      const { data: newest } = await supabase
        .from('items')
        .select('slug')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const newSlug = newest?.slug
      if (!newSlug) throw new Error('Could not determine new item slug after creation')

      // Lock the new slug NOW — before sync starts — so chokidar's re-trigger
      // on the renamed folder is blocked while sync is still running
      processing.add(newSlug)
      recentlySynced.set(newSlug, Date.now())

      console.log(`[${ts()}] ↑  Syncing images for "${newSlug}"...`)
      execFileSync(
        process.execPath,
        [join(SCRIPTS_DIR, 'sync-item-images.mjs'), newSlug],
        { stdio: 'inherit', cwd: resolve(SCRIPTS_DIR, '..') },
      )

      recentlySynced.set(newSlug, Date.now())
      console.log(`[${ts()}] ✓  Done — "${newSlug}" is live as draft`)
      notify(`"${newSlug}" created and images synced`)

    } else {
      // ── Existing product: images changed, sync only ──────────────────────
      const itemSlug = existing.slug
      console.log(`[${ts()}] ↑  Existing item "${itemSlug}" — syncing images...`)
      execFileSync(
        process.execPath,
        [join(SCRIPTS_DIR, 'sync-item-images.mjs'), itemSlug],
        { stdio: 'inherit', cwd: resolve(SCRIPTS_DIR, '..') },
      )

      console.log(`[${ts()}] ✓  Images synced for "${itemSlug}"`)
      notify(`"${itemSlug}" images updated`)
    }

  } catch (e) {
    console.error(`[${ts()}] ✗  Error processing "${folderName}": ${e.message}`)
    // Never rethrow — keep the watcher alive
  } finally {
    processing.delete(folderName)
    processing.delete(slug)   // also release slug lock if it was set
  }
}

// ── Trigger with debounce ────────────────────────────────────────────────────
function trigger(filePath) {
  // We watch depth:1, so filePath is PRODUCTS_DIR/folderName/filename
  // The folder we care about is the immediate child of PRODUCTS_DIR
  const rel        = filePath.slice(PRODUCTS_DIR.length).replace(/^[\\/]/, '')
  const parts      = rel.split(/[\\/]/)
  const folderName = parts[0]

  if (!folderName || folderName.startsWith('.')) return

  clearTimeout(debounce.get(folderName))
  debounce.set(folderName, setTimeout(() => {
    debounce.delete(folderName)
    processFolder(folderName)
  }, DEBOUNCE_MS))

  console.log(`[${ts()}]    Change detected in "${folderName}" — waiting ${DEBOUNCE_MS / 1000}s...`)
}

// ── Timestamp helper ─────────────────────────────────────────────────────────
function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

// ── Start watcher ────────────────────────────────────────────────────────────
const watcher = chokidar.watch(PRODUCTS_DIR, {
  depth:          1,           // watch files inside immediate subfolders only
  ignoreInitial:  true,        // don't fire for files already present at startup
  ignored:        /(^|[/\\])\../, // ignore dotfiles/dotfolders
  awaitWriteFinish: {
    stabilityThreshold: 1000,  // wait 1s after last write before firing
    pollInterval:       200,
  },
})

watcher.on('add',    filePath => trigger(filePath))
watcher.on('change', filePath => trigger(filePath))

watcher.on('error', err => console.error(`[${ts()}] Watcher error: ${err.message}`))

watcher.on('ready', () => {
  const existing = readdirSync(PRODUCTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)

  console.log(`\n👁  Watching ${PRODUCTS_DIR}`)
  if (existing.length) {
    console.log(`    Existing folders (${existing.length}): ${existing.join(', ')}`)
  } else {
    console.log('    No existing folders. Drop a product folder to get started.')
  }
  console.log('    Ready.\n')
})

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n\nStopping watcher...')
  await watcher.close()
  process.exit(0)
})
