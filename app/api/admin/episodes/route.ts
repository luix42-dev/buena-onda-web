import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
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
  const body = await request.json()
  const {
    title,
    description,
    audio_url,
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
      episode_number:  episode_number != null ? parseInt(episode_number) : null,
      duration:        duration != null ? parseInt(duration) : null,
      tags:            tags ?? [],
      published,
      published_at:    published ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
