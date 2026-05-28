import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

interface Params { params: Promise<{ id: string }> }

type ServiceClient = Awaited<ReturnType<typeof createServiceClient>>

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
  const { error } = await supabase.from('episodes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
