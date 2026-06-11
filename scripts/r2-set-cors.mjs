#!/usr/bin/env node
/**
 * Set (and verify) CORS policy on the R2 bucket.
 * Usage:  node scripts/r2-set-cors.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from '@aws-sdk/client-s3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

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
  } catch {
    return { ok: false, loaded: 0, path }
  }
}

function env(name, fallback) {
  return process.env[name] ?? (fallback ? process.env[fallback] : undefined)
}

const OK  = '  ✅  PASS  '
const ERR = '  ❌  FAIL  '
const WRN = '  ⚠️   WARN  '

async function run() {
  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  R2 CORS Setup')
  console.log('══════════════════════════════════════════════════════════════\n')

  const { ok, loaded, path } = loadEnvLocal()
  if (ok) {
    console.log(OK + `Loaded .env.local (${loaded} vars) — ${path}`)
  } else {
    console.log(WRN + `.env.local not found at ${path} — using process.env`)
  }

  const accountId       = env('R2_ACCOUNT_ID',        'CF_R2_ACCOUNT_ID')
  const accessKeyId     = env('R2_ACCESS_KEY_ID',     'CF_R2_ACCESS_KEY_ID')
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY', 'CF_R2_SECRET_ACCESS_KEY')
  const bucketName      = env('R2_BUCKET_NAME',       'CF_R2_BUCKET_NAME')
  const endpoint        = env('R2_ENDPOINT') ??
                          (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    console.log(ERR + 'Missing required env vars — aborting.\n')
    process.exit(1)
  }

  console.log(`  bucket   : ${bucketName}`)
  console.log(`  endpoint : ${endpoint}\n`)

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })

  const corsRule = {
    AllowedOrigins: [
      'https://buenaondalifestyle.com',
      'https://www.buenaondalifestyle.com',
      'http://localhost:3000',
    ],
    AllowedMethods: ['GET', 'PUT', 'HEAD', 'DELETE'],
    AllowedHeaders: ['*'],
    ExposeHeaders:  ['ETag'],
    MaxAgeSeconds:  3600,
  }

  // ── Step 1: PUT ────────────────────────────────────────────────────────────
  console.log('── Step 1: PutBucketCors ─────────────────────────────────────')
  console.log('  Applying rule:')
  console.log('    AllowedOrigins :', corsRule.AllowedOrigins.join(', '))
  console.log('    AllowedMethods :', corsRule.AllowedMethods.join(', '))
  console.log('    AllowedHeaders :', corsRule.AllowedHeaders.join(', '))
  console.log('    ExposeHeaders  :', corsRule.ExposeHeaders.join(', '))
  console.log('    MaxAgeSeconds  :', corsRule.MaxAgeSeconds)

  try {
    await client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: { CORSRules: [corsRule] },
    }))
    console.log(OK + 'PutBucketCors succeeded')
  } catch (err) {
    console.log(ERR + 'PutBucketCors failed: ' + (err.message ?? err))
    console.error(err)
    process.exit(1)
  }

  // ── Step 2: GET and print ──────────────────────────────────────────────────
  console.log('\n── Step 2: GetBucketCors (verify) ────────────────────────────')
  try {
    const res = await client.send(new GetBucketCorsCommand({ Bucket: bucketName }))
    console.log(OK + 'GetBucketCors succeeded — active policy:\n')
    console.log(JSON.stringify(res.CORSRules, null, 2))
  } catch (err) {
    console.log(ERR + 'GetBucketCors failed: ' + (err.message ?? err))
    console.error(err)
    process.exit(1)
  }

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  Done. CORS policy is live — browser PUT uploads should work.')
  console.log('══════════════════════════════════════════════════════════════\n')
}

run().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
