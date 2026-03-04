import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, slug, code, description, editorial_text,
          featured, published, sort_order } = body

  if (!title || !slug || !code) {
    return NextResponse.json({ error: 'title, slug, code are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('themes')
    .insert({
      title,
      slug,
      code:           code.toUpperCase(),
      description:    description || null,
      editorial_text: editorial_text || null,
      featured:       featured ?? false,
      published:      published ?? false,
      sort_order:     sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
