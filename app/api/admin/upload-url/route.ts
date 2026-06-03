export const runtime = 'edge'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse, type NextRequest } from 'next/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

type UploadBody = {
  filename?: unknown
  fileName?: unknown
  contentType?: unknown
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

function publicBaseUrl(endpoint: string) {
  return (env('R2_PUBLIC_URL', 'CF_R2_PUBLIC_URL') ?? endpoint).replace(/\/$/, '')
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
  const contentType = typeof body.contentType === 'string' && body.contentType.trim()
    ? body.contentType.trim()
    : 'application/octet-stream'

  if (!rawFilename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  const accountId = env('R2_ACCOUNT_ID', 'CF_R2_ACCOUNT_ID')
  const accessKeyId = env('R2_ACCESS_KEY_ID', 'CF_R2_ACCESS_KEY_ID')
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY', 'CF_R2_SECRET_ACCESS_KEY')
  const bucketName = env('R2_BUCKET_NAME', 'CF_R2_BUCKET_NAME')
  const endpoint = env('R2_ENDPOINT') ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    return NextResponse.json({ error: 'Missing R2 upload URL configuration' }, { status: 503 })
  }

  const key = `audio/${Date.now()}-${cleanFilename(rawFilename)}`
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  })

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    })
    const url = await getSignedUrl(client as any, command as any, { expiresIn: 300 })
    const publicUrl = `${publicBaseUrl(endpoint)}/${key}`
    return NextResponse.json({ url, uploadUrl: url, publicUrl, key })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create upload URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
