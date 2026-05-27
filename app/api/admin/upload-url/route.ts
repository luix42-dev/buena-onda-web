import { randomUUID } from 'crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type UploadBody = {
  fileName?: string
  contentType?: string
  folder?: string
}

function getR2Client(): { client: S3Client | null; error: string | null } {
  const accountId = process.env.CF_R2_ACCOUNT_ID
  const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return { client: null, error: 'Missing R2 environment variables' }
  }

  return {
    error: null,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      // SDK v3 defaults to WHEN_SUPPORTED for flexible checksums, which injects
      // x-amz-checksum-crc32 into the signed headers. R2 rejects the browser PUT
      // with 403 because the browser never sends that header. Opt out entirely.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    }),
  }
}

function sanitizeBaseName(fileName: string) {
  const withoutExt = fileName.replace(/\.[^.]+$/, '')
  return withoutExt
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'track'
}

async function isAuthorized(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim()
  const adminCookie = request.cookies.get('bo_admin')?.value

  if (adminPassword && adminCookie === adminPassword) return true

  const allowedEmail = process.env.STUDIO_ALLOWED_EMAIL?.trim().toLowerCase()
  if (!allowedEmail) {
    return !adminPassword
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email?.trim().toLowerCase()
    return !!user && email === allowedEmail
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: UploadBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const folder = body.folder ?? 'audio'
  if (folder !== 'audio') {
    return NextResponse.json({ error: 'Only audio uploads are supported here' }, { status: 400 })
  }

  const fileName = body.fileName?.trim() || ''
  const contentType = body.contentType?.trim().toLowerCase() || 'audio/mpeg'
  const allowedTypes = new Set(['audio/mpeg', 'audio/mp3'])

  if (!fileName.toLowerCase().endsWith('.mp3')) {
    return NextResponse.json({ error: 'MP3 files only' }, { status: 400 })
  }

  if (!allowedTypes.has(contentType)) {
    return NextResponse.json({ error: 'MP3 files only' }, { status: 400 })
  }

  const { client, error: configError } = getR2Client()
  if (configError || !client) {
    return NextResponse.json({ error: configError ?? 'Missing R2 environment variables' }, { status: 503 })
  }

  const bucketName = process.env.CF_R2_BUCKET_NAME
  const publicUrl = process.env.CF_R2_PUBLIC_URL
  if (!bucketName || !publicUrl) {
    return NextResponse.json({ error: 'Missing R2 bucket or public URL configuration' }, { status: 503 })
  }

  const key = `audio/${Date.now()}-${randomUUID()}-${sanitizeBaseName(fileName)}.mp3`

  try {
    const uploadUrl = await getSignedUrl(
      client as unknown as Parameters<typeof getSignedUrl>[0],
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
      { expiresIn: 60 * 10 }
    )

    return NextResponse.json({
      uploadUrl,
      publicUrl: `${publicUrl}/${key}`,
      key,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create upload URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
