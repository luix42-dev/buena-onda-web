import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { S3Client } from '@aws-sdk/client-s3'
import { NextResponse, type NextRequest } from 'next/server'
import { logAudit } from '@/lib/audit'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

interface Params { params: Promise<{ id: string }> }

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>

function env(name: string, fallback?: string) {
  return process.env[name] ?? (fallback ? process.env[fallback] : undefined)
}

function getR2DeleteConfig() {
  const accountId = env('R2_ACCOUNT_ID', 'CF_R2_ACCOUNT_ID')
  const accessKeyId = env('R2_ACCESS_KEY_ID', 'CF_R2_ACCESS_KEY_ID')
  const secretAccessKey = env('R2_SECRET_ACCESS_KEY', 'CF_R2_SECRET_ACCESS_KEY')
  const bucketName = env('R2_BUCKET_NAME', 'CF_R2_BUCKET_NAME')
  const endpoint = env('R2_ENDPOINT') ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !endpoint) {
    throw new Error('Missing R2 environment variables')
  }

  return {
    bucketName,
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    }),
  }
}

async function buildPublishedUpdate(supabase: ServiceClient, id: string, published: boolean) {
  if (!published) {
    return { published: false, published_at: null }
  }

  const { data: existing } = await supabase
    .from('episodes')
    .select('published, published_at')
    .eq('id', id)
    .single()

  return {
    published: true,
    published_at: existing?.published && existing.published_at
      ? existing.published_at
      : new Date().toISOString(),
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const body = await request.json()
  const {
    title,
    slug,
    description,
    audio_url,
    audio_key,
    episode_number,
    duration,
    tags,
    published,
  } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const update: Record<string, unknown> = {
    title,
    slug,
    description:    description || null,
    audio_url:      audio_url || null,
    audio_key:      audio_key || null,
    episode_number: episode_number != null ? parseInt(episode_number) : null,
    duration:       duration != null ? parseInt(duration) : null,
    tags:           tags ?? [],
  }

  if (typeof published === 'boolean') {
    Object.assign(update, await buildPublishedUpdate(supabase, id, published))
  }

  const { data, error } = await supabase
    .from('episodes')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const body = await request.json()

  if (typeof body?.published !== 'boolean') {
    return NextResponse.json({ error: 'published boolean is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const update = await buildPublishedUpdate(supabase, id, body.published)

  const { data, error } = await supabase
    .from('episodes')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()

  const { data: episode, error: fetchError } = await supabase
    .from('episodes')
    .select('audio_key')
    .eq('id', id)
    .single()

  if (fetchError) {
    void logAudit({
      subsystem: 'radio',
      action: 'delete',
      item_type: 'episode',
      item_id: id,
      success: false,
      error_message: fetchError.message,
    })
    return NextResponse.json({ error: fetchError.message }, { status: 404 })
  }

  let warning: string | undefined
  const audioKey = typeof episode?.audio_key === 'string' ? episode.audio_key.trim() : ''

  if (audioKey && audioKey.startsWith('episodes/') && !audioKey.includes('..') && !audioKey.startsWith('/')) {
    try {
      const { client, bucketName } = getR2DeleteConfig()
      await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: audioKey }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete episode audio from R2.'
      warning = `Episode row deleted, but R2 cleanup failed: ${message}`
      console.error('[radio] deleteEpisode: R2 cleanup failed', { id, audioKey, message })
    }
  }

  const { error } = await supabase.from('episodes').delete().eq('id', id)
  if (error) {
    void logAudit({
      subsystem: 'radio',
      action: 'delete',
      item_type: 'episode',
      item_id: id,
      item_key: audioKey || undefined,
      success: false,
      error_message: error.message,
      metadata: warning ? { warning } : undefined,
    })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  void logAudit({
    subsystem: 'radio',
    action: 'delete',
    item_type: 'episode',
    item_id: id,
    item_key: audioKey || undefined,
    success: true,
    metadata: warning ? { warning } : undefined,
  })
  return NextResponse.json(warning ? { ok: true, warning } : { ok: true })
}
