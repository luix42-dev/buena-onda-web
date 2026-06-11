import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const themeId = searchParams.get('theme_id')

  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return NextResponse.json([], { status: 200 })
  }
  let query = supabase
    .from('items')
    .select('*, theme:themes(id, title, code)')
    .order('created_at', { ascending: false })

  if (status)  query = query.eq('status', status)
  if (themeId) query = query.eq('theme_id', themeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    title, slug, theme_id, price, buy_url,
    description, tags, cover_image_url, status = 'draft', details,
  } = body

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Generate catalog number if theme is set and status is being published
  let catalog_number: string | null = null
  if (theme_id) {
    const { data: numData, error: numErr } = await supabase
      .rpc('generate_catalog_number', { p_theme_id: theme_id })
    if (!numErr) catalog_number = numData as string
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      title,
      slug,
      catalog_number,
      theme_id:        theme_id || null,
      price:           price ?? null,
      buy_url:         buy_url || null,
      description:     description || null,
      tags:            tags ?? [],
      cover_image_url: cover_image_url || null,
      details:         details ?? null,
      status,
      published_at:    status === 'published' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // If an image URL was provided, also insert into item_images
  if (cover_image_url && data) {
    await supabase.from('item_images').insert({
      item_id:    data.id,
      url:        cover_image_url,
      sort_order: 0,
    })
  }

  return NextResponse.json(data, { status: 201 })
}
