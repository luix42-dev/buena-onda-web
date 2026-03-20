import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('timeline')
      .select('*')
      .order('sort_order')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { slug, year, title, summary, story, photo, photos, sort_order } = body

  if (!slug || !year || !title) {
    return NextResponse.json({ error: 'slug, year, title are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('timeline')
    .insert({ slug, year, title, summary: summary ?? '', story: story ?? '', photo: photo ?? null, photos: photos ?? [], sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
