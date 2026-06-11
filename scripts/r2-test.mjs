#!/usr/bin/env node
/**
 * R2 Upload Diagnostic
 *
 * Mirrors the exact S3Client setup from app/api/admin/upload-url/route.ts.
 * Steps:
 *   1. Load .env.local and print resolved credentials (redacted)
 *   2. Generate a presigned PUT URL for cruise/video/test-diagnostic.mp4
 *   3. PUT a small dummy buffer via the presigned URL
 *   4. HEAD the key to confirm the object landed in the bucket
 *   5. DELETE the test object
 *
 * Usage:  node scripts/r2-test.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── helpers ──────────────────────────────────────────────────────────────────

function loadEnvLocal() {
  const path = resolve(ROOT, '.env.local')
  try {
    const raw = readFileSync(path, 'utf-8')
    let loaded = 0
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const idx = t.indexOf('=')
      if (idx === -1) continue
      const k = t.slice(0, idx).trim()
      const v = t.slice(idx + 1).trim().replace(/^(["'])(.*)\1$/, '$2')
      if (k && !(k in process.env)) { process.env[k] = v; loaded++ }
    }
    return { ok: true, loaded, path }
  } catch (e) {
    return { ok: false, loaded: 0, path }
  }
}

function env(name, fallback) {
  return process.env[name] ?? (fallback ? process.env[fallback] : undefined)
}

function redact(s, keep = 8) {
  return s ? s.slice(0, keep) + '…' : '(missing)'
}

const OK  = '  ✅  PASS  '
const ERR = '  ❌  FAIL  '
const WRN = '  ⚠️   WARN  '

function pass(msg)      { console.log(OK  + msg) }
function fail(msg, err) { console.log(ERR + msg + (err ? ': ' + (err.message ?? err) : '')) }
function warn(msg)      { console.log(WRN + msg) }

function makeClient(endpoint, accessKeyId, secretAccessKey) {
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
}

// ── main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  R2 Upload Diagnostic')
  console.log('══════════════════════════════════════════════════════════════\n')

  // ── 0. env ────────────────────────────────────────────────────────────────
  const { ok: envOk, loaded, path: envPath } = loadEnvLocal()
  if (envOk) {
    pass(`Loaded .env.local (${loaded} vars injected) — ${envPath}`)
  } else {
    warn(`.env.local not found at ${envPath} — using process.env as-is`)
  }

  const accountId       = env('R2_ACCOUNT_ID',        'CF_R2_ACCOUNT_ID')
  const accessKeyId     = env('R2_ACCESS_KEY_ID',     'CF_R2_ACCESS_KEY_ID')
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY', 'CF_R2_SECRET_ACCESS_KEY')
  const bucketName      = env('R2_BUCKET_NAME',       'CF_R2_BUCKET_NAME')
  const endpoint        = env('R2_ENDPOINT') ??
                          (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

  console.log('\n── Resolved env vars ─────────────────────────────────────────')
  console.log(`  R2_ACCOUNT_ID        : ${redact(accountId)}`)
  console.log(`  R2_ACCESS_KEY_ID     : ${redact(accessKeyId)}`)
  console.log(`  R2_SECRET_ACCESS_KEY : ${secretAccessKey ? '(set)' : '(missing)'}`)
  console.log(`  R2_BUCKET_NAME       : ${bucketName ?? '(missing)'}`)
  console.log(`  endpoint             : ${endpoint ?? '(missing)'}`)

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    console.log('\n' + ERR + 'One or more required env vars are missing — aborting.\n')
    process.exit(1)
  }

  const TEST_KEY = 'cruise/video/test-diagnostic.mp4'
  const DUMMY    = Buffer.from('BUENA_ONDA_R2_DIAGNOSTIC_SAFE_TO_DELETE')

  // ── 1. presigned PUT URL ──────────────────────────────────────────────────
  console.log('\n── Step 1: Generate presigned PUT URL ────────────────────────')
  let presignedUrl
  try {
    const client  = makeClient(endpoint, accessKeyId, secretAccessKey)
    const command = new PutObjectCommand({ Bucket: bucketName, Key: TEST_KEY })
    presignedUrl = await getSignedUrl(client, command, {
      expiresIn:           300,
      signableHeaders:     new Set(['host']),
      unhoistableHeaders:  new Set(),
    })
    const sp = new URL(presignedUrl).searchParams
    const signedHeaders = sp.get('X-Amz-SignedHeaders')
    if (signedHeaders !== 'host') {
      throw new Error(`Unexpected X-Amz-SignedHeaders: "${signedHeaders}" (want "host")`)
    }
    pass(`URL generated — X-Amz-SignedHeaders=${signedHeaders}`)
    console.log(`  ${presignedUrl.slice(0, 100)}…`)
  } catch (err) {
    fail('Generate presigned URL', err)
    console.error(err)
    process.exit(1)
  }

  // ── 2. PUT ────────────────────────────────────────────────────────────────
  console.log('\n── Step 2: PUT dummy buffer via presigned URL ────────────────')
  try {
    const res = await fetch(presignedUrl, {
      method:  'PUT',
      body:    DUMMY,
      headers: { 'Content-Length': String(DUMMY.length) },
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${text}`)
    pass(`PUT succeeded (HTTP ${res.status})`)
    if (text) console.log(`  Response body: ${text.slice(0, 200)}`)
  } catch (err) {
    fail('PUT via presigned URL', err)
    console.error(err)
    console.log('\n  Likely causes: bad credentials, wrong bucket, or CORS')
    console.log('  Note: CORS only affects browser requests — Node bypasses it.')
    console.log('  If this step passes but the browser fails → CORS is the culprit.\n')
    process.exit(1)
  }

  // ── 3. HEAD verify ────────────────────────────────────────────────────────
  console.log('\n── Step 3: HEAD to verify object exists ──────────────────────')
  try {
    const client = makeClient(endpoint, accessKeyId, secretAccessKey)
    const head   = await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: TEST_KEY }))
    pass(`Object exists — ContentLength=${head.ContentLength ?? '?'} bytes, ETag=${head.ETag ?? '?'}`)
  } catch (err) {
    fail('HEAD (verify object)', err)
    console.error(err)
  }

  // ── 4. DELETE ─────────────────────────────────────────────────────────────
  console.log('\n── Step 4: DELETE test object ────────────────────────────────')
  try {
    const client = makeClient(endpoint, accessKeyId, secretAccessKey)
    await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: TEST_KEY }))
    pass('DELETE succeeded — test object removed')
  } catch (err) {
    fail('DELETE test object', err)
    console.error(err)
  }

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  Done.')
  console.log('  If all steps passed from Node but the browser PUT still fails:')
  console.log('  → Check Cloudflare R2 CORS rules for your bucket (allow PUT')
  console.log('    from your site origin).')
  console.log('══════════════════════════════════════════════════════════════\n')
}

run().catch(err => {
  console.error('Unexpected top-level error:', err)
  process.exit(1)
})
