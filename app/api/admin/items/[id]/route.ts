import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, theme:themes(id, title, code)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()
  const {
    title, slug, theme_id, price, buy_url,
    description, tags, cover_image_url, status, details,
  } = body

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const update: Record<string, unknown> = {
    title,
    slug,
    theme_id:        theme_id || null,
    price:           price ?? null,
    buy_url:         buy_url || null,
    description:     description || null,
    tags:            tags ?? [],
    cover_image_url: cover_image_url || null,
    details:         details ?? null,
    status,
  }

  if (status === 'published') {
    // Set published_at only if transitioning to published (don't overwrite)
    const { data: existing } = await supabase
      .from('items').select('published_at, status').eq('id', id).single()
    if (existing && existing.status !== 'published') {
      update.published_at = new Date().toISOString()
    }
  }

  const { data, error } = await supabase
    .from('items')
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
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
