export const runtime = 'edge'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

function getR2Client(): { client: S3Client | null; error: string | null } {
  const accountId = process.env.CF_R2_ACCOUNT_ID
  const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY

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

  const formData = await request.formData()
  const file     = formData.get('file') as File | null
  const folder   = (formData.get('folder') as string) || 'catalog'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext           = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const ts            = Date.now()
  const customPath    = (formData.get('storagePath') as string | null)?.trim()
  const path          = customPath || `${folder}/${ts}.${ext}`
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

    const bucketName = process.env.CF_R2_BUCKET_NAME
    const publicUrl = process.env.CF_R2_PUBLIC_URL

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
        ContentType: file.type,
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
      contentType: file.type,
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
