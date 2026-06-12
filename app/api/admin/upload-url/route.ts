import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse, type NextRequest } from 'next/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

type UploadBody = {
  filename?: unknown
  fileName?: unknown
  prefix?: unknown
  contentType?: unknown
  key?: unknown
}

function env(name: string, fallback?: string) {
  return process.env[name] ?? (fallback ? process.env[fallback] : undefined)
}

function cleanFilename(value: string) {
  const fallback = 'upload.mp3'
  const basename = value.split(/[\/]/).pop()?.trim() || fallback
  return basename
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160) || fallback
}

export async function POST(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  let body: UploadBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawFilename = typeof body.filename === 'string'
    ? body.filename
    : typeof body.fileName === 'string'
      ? body.fileName
      : ''
  if (!rawFilename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  const accountId = env('R2_ACCOUNT_ID', 'CF_R2_ACCOUNT_ID')
  const accessKeyId = env('R2_ACCESS_KEY_ID', 'CF_R2_ACCESS_KEY_ID')
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY', 'CF_R2_SECRET_ACCESS_KEY')
  const endpoint = env('R2_ENDPOINT', 'CF_R2_ENDPOINT') ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

  const allowedPrefixes = new Set(['audio', 'episodes', 'cruise/video', 'cruise/audio'])
  const rawPrefix = typeof body.prefix === 'string' ? body.prefix.replace(/\/$/, '') : 'audio'
  const prefix = allowedPrefixes.has(rawPrefix) ? rawPrefix : 'audio'
  const isEpisodes = prefix === 'episodes'

  const bucketName = isEpisodes
    ? (env('R2_EPISODES_BUCKET_NAME') ?? env('R2_BUCKET_NAME', 'CF_R2_BUCKET_NAME'))
    : env('R2_BUCKET_NAME', 'CF_R2_BUCKET_NAME')

  const publicUrlBase = (isEpisodes
    ? (env('R2_EPISODES_PUBLIC_URL') ?? env('R2_PUBLIC_URL', 'CF_R2_PUBLIC_URL'))
    : env('R2_PUBLIC_URL', 'CF_R2_PUBLIC_URL'))?.replace(/\/$/, '')

  const missing: string[] = []
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID')
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY')
  if (!bucketName) missing.push('R2_BUCKET_NAME')
  if (!endpoint) missing.push('R2_ACCOUNT_ID')

  if (missing.length > 0 || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    return NextResponse.json(
      { error: `Missing R2 env vars: ${missing.join(', ')}` },
      { status: 503 }
    )
  }

  if (!publicUrlBase) {
    if (isEpisodes) {
      return NextResponse.json(
        { error: 'Missing R2_EPISODES_PUBLIC_URL for episodes uploads' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Missing R2_PUBLIC_URL — cannot build public playback URL' },
      { status: 503 }
    )
  }

  const cruiseKeyRe = /^cruise\/(video|audio)\/[a-z0-9\-/]+\.(mp4|mp3)$/
  const rawKey = typeof body.key === 'string' ? body.key.trim() : ''
  const key = rawKey && cruiseKeyRe.test(rawKey) && !rawKey.includes('..')
    ? rawKey
    : `${prefix}/${Date.now()}-${cleanFilename(rawFilename)}`
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
    const url = await getSignedUrl(client as any, command as any, {
      expiresIn: 3600,
      signableHeaders: new Set(['host']),
      unhoistableHeaders: new Set(),
    } as any)
    const signedHeaders = new URL(url).searchParams.get('X-Amz-SignedHeaders')
    if (signedHeaders !== 'host') {
      throw new Error(`Unexpected signed headers: ${signedHeaders ?? 'none'}`)
    }
    const publicUrl = `${publicUrlBase}/${key}`
    return NextResponse.json({ url, uploadUrl: url, publicUrl, key })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create upload URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
