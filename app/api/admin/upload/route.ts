import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'
import { requestErrorResponse, RequestBodyError } from '@/lib/api/request-security'
import { readUploadForm, safeStoragePath, validateFile } from './validation'

function env(name: string, fallback?: string) {
  return process.env[name] ?? (fallback ? process.env[fallback] : undefined)
}

function getR2Client(): { client: S3Client | null; error: string | null } {
  const accountId       = env('R2_ACCOUNT_ID',       'CF_R2_ACCOUNT_ID')
  const accessKeyId     = env('R2_ACCESS_KEY_ID',     'CF_R2_ACCESS_KEY_ID')
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY', 'CF_R2_SECRET_ACCESS_KEY')

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return {
      error: 'Missing R2 environment variables',
      client: null,
    }
  }

  return {
    error: null,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  }
}

export async function POST(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  let file: File, contentType: string, folder: string, path: string
  try {
    const formData = await readUploadForm(request)
    const rawFolder = formData.get('folder')
    folder = typeof rawFolder === 'string' && rawFolder ? rawFolder : 'catalog'
    if (!new Set(['catalog', 'audio', 'timeline', 'events', 'events/gallery', 'events/audio', 'events/partners', 'events/archive']).has(folder)) {
      throw new RequestBodyError('Invalid upload folder', 400)
    }
    const validated = await validateFile(formData.get('file'), folder.endsWith('audio') ? 'audio' : folder === 'events/archive' ? 'archive' : 'image')
    file = validated.file; contentType = validated.contentType
    const ext = file.name.split('.').pop()!.toLowerCase()
    const customPath = formData.get('storagePath')
    path = typeof customPath === 'string' && customPath.trim() ? customPath.trim() : `${folder}/${crypto.randomUUID()}.${ext}`
    if (!safeStoragePath(path) || !path.endsWith(`.${ext}`) || !(path.startsWith(`${folder}/`) || (folder === 'catalog' && path.startsWith('posts/culture/')))) {
      throw new RequestBodyError('Invalid storage path', 400)
    }
  } catch (error) { return requestErrorResponse(error) }
  const arrayBuf = await file.arrayBuffer()
  const buffer   = Buffer.from(arrayBuf)

  if (folder === 'audio') {
    const { client, error: configError } = getR2Client()

    if (configError || !client) {
      return NextResponse.json(
        { error: configError ?? 'Missing R2 environment variables' },
        { status: 503 }
      )
    }

    const bucketName = env('R2_BUCKET_NAME', 'CF_R2_BUCKET_NAME')
    const publicUrl  = env('R2_PUBLIC_URL',  'CF_R2_PUBLIC_URL')

    if (!bucketName || !publicUrl) {
      return NextResponse.json(
        { error: 'Missing R2 bucket or public URL configuration' },
        { status: 503 }
      )
    }

    try {
      await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: path,
        Body: buffer,
        ContentType: contentType,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'R2 upload failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({
      url:          `${publicUrl}/${path}`,
      storage_path: path,
    })
  }

  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return NextResponse.json(
      { error: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and keys in .env.local.' },
      { status: 503 }
    )
  }

  const { error: uploadError } = await supabase.storage
    .from('catalog')
    .upload(path, buffer, {
      contentType,
      upsert:      false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('catalog').getPublicUrl(path)

  return NextResponse.json({
    url:          urlData.publicUrl,
    storage_path: path,
  })
}
