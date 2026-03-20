import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()
  const { title, slug, excerpt, body: postBody, cover_image, tags, published } = body

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const update: Record<string, unknown> = {
    title,
    slug,
    excerpt:     excerpt || null,
    body:        postBody || null,
    cover_image: cover_image || null,
    tags:        tags ?? [],
    published:   published ?? false,
  }

  if (published) {
    const { data: existing } = await supabase
      .from('posts')
      .select('published_at, published')
      .eq('id', id)
      .single()
    if (existing && !existing.published_at) {
      update.published_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServiceClient()
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
