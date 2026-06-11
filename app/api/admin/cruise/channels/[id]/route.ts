export const dynamic = 'force-dynamic'

import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getR2Config } from '@/lib/radio'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('cruise_channels')
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
    name,
    slug,
    track_keys,
    sort,
    published,
  } = body

  const update: Record<string, unknown> = {
    name,
    slug,
    track_keys: Array.isArray(track_keys) ? track_keys : [],
    sort:       sort != null ? Number(sort) : 0,
  }

  if (typeof published === 'boolean') {
    update.published = published
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('cruise_channels')
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
    .from('cruise_channels')
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

  const { data: channel, error: fetchErr } = await supabase
    .from('cruise_channels')
    .select('track_keys')
    .eq('id', id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 })

  if (Array.isArray(channel?.track_keys) && channel.track_keys.length > 0) {
    const { client, bucketName } = getR2Config()
    for (const key of channel.track_keys) {
      if (
        typeof key === 'string' &&
        key.startsWith('cruise/') &&
        !key.includes('..') &&
        !key.startsWith('/')
      ) {
        try {
          await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
        } catch { /* best-effort */ }
      }
    }
  }

  const { error } = await supabase.from('cruise_channels').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
