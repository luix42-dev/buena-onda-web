export const dynamic = 'force-dynamic'

import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getR2Config } from '@/lib/radio'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

interface Params { params: Promise<{ id: string }> }

async function deleteR2Key(key: string) {
  if (!key.startsWith('cruise/') || key.includes('..') || key.startsWith('/')) return
  const { client, bucketName } = getR2Config()
  await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('cruise_scenes')
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
  const supabase = await createServiceClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('cruise_scenes')
    .select('video_key')
    .eq('id', id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 })

  const newVideoKey = body.video_key ?? null
  const oldVideoKey = existing?.video_key

  if (
    oldVideoKey &&
    typeof oldVideoKey === 'string' &&
    oldVideoKey.startsWith('cruise/') &&
    newVideoKey !== oldVideoKey
  ) {
    try { await deleteR2Key(oldVideoKey) } catch { /* best-effort */ }
  }

  const {
    city,
    city_label,
    route_label,
    time_of_day,
    title,
    video_key,
    duration_seconds,
    sort,
    published,
  } = body

  const update: Record<string, unknown> = {
    city,
    city_label,
    route_label:      route_label || null,
    time_of_day,
    title,
    video_key:        video_key || null,
    duration_seconds: duration_seconds != null ? Number(duration_seconds) : null,
    sort:             sort != null ? Number(sort) : 0,
  }

  if (typeof published === 'boolean') {
    update.published = published
  }

  const { data, error } = await supabase
    .from('cruise_scenes')
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

  const { data, error } = await supabase
    .from('cruise_scenes')
    .update({ published: body.published })
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

  const { data: scene, error: fetchErr } = await supabase
    .from('cruise_scenes')
    .select('video_key')
    .eq('id', id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 })

  if (scene?.video_key && typeof scene.video_key === 'string' && scene.video_key.startsWith('cruise/')) {
    try { await deleteR2Key(scene.video_key) } catch { /* best-effort */ }
  }

  const { error } = await supabase.from('cruise_scenes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
