import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { slugify } from '@/lib/utils'

const EpisodeSchema = z.object({
  title:          z.string().min(1).max(200),
  description:    z.string().optional(),
  audio_url:      z.string().url().optional().or(z.literal('')),
  cover_image:    z.string().url().optional().or(z.literal('')),
  duration:       z.number().int().positive().optional(),
  episode_number: z.number().int().positive().optional(),
  tags:           z.array(z.string()).optional(),
  published:      z.boolean().optional(),
  published_at:   z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const page   = parseInt(searchParams.get('page')  ?? '1')
  const limit  = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  const { data: { session } } = await supabase.auth.getSession()

  let query = supabase
    .from('episodes')
    .select('*', { count: 'exact' })
    .order('episode_number', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!session) {
    query = query.eq('published', true)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ episodes: data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body   = await request.json()
  const parsed = EpisodeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const slug = slugify(parsed.data.title)
  const { data, error } = await supabase
    .from('episodes')
    .insert({ ...parsed.data, slug })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ episode: data }, { status: 201 })
}
