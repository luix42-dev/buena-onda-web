export const runtime = 'edge'
import { NextResponse, type NextRequest } from 'next/server'
import { logAudit } from '@/lib/audit'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export async function GET(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .order('episode_number', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const body = await request.json()
  const {
    title,
    description,
    audio_url,
    audio_key,
    episode_number,
    duration,
    tags,
    published = false,
  } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('episodes')
    .insert({
      title,
      slug,
      description:     description || null,
      audio_url:       audio_url || null,
      audio_key:       audio_key || null,
      episode_number:  episode_number != null ? parseInt(episode_number) : null,
      duration:        duration != null ? parseInt(duration) : null,
      tags:            tags ?? [],
      status:          published ? 'published' : 'draft',
      published,
      published_at:    published ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    void logAudit({
      subsystem: 'radio',
      action: 'create',
      item_type: 'episode',
      item_key: typeof audio_key === 'string' ? audio_key : undefined,
      success: false,
      error_message: error.message,
      metadata: { title, episode_number },
    })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  void logAudit({
    subsystem: 'radio',
    action: 'create',
    item_type: 'episode',
    item_id: data?.id ? String(data.id) : undefined,
    item_key: typeof data?.audio_key === 'string' ? data.audio_key : undefined,
    success: true,
    metadata: { title: data?.title, episode_number: data?.episode_number },
  })
  return NextResponse.json(data, { status: 201 })
}
