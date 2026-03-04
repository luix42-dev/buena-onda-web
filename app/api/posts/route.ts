import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { slugify } from '@/lib/utils'

const PostSchema = z.object({
  title:        z.string().min(1).max(200),
  excerpt:      z.string().max(400).optional(),
  body:         z.string().optional(),
  cover_image:  z.string().url().optional().or(z.literal('')),
  tags:         z.array(z.string()).optional(),
  published:    z.boolean().optional(),
  published_at: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const page    = parseInt(searchParams.get('page')  ?? '1')
  const limit   = parseInt(searchParams.get('limit') ?? '20')
  const tag     = searchParams.get('tag')
  const offset  = (page - 1) * limit

  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Public route: only return published posts unless admin
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    query = query.eq('published', true)
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body   = await request.json()
  const parsed = PostSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const slug = slugify(parsed.data.title)
  const { data, error } = await supabase
    .from('posts')
    .insert({ ...parsed.data, slug })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: data }, { status: 201 })
}
