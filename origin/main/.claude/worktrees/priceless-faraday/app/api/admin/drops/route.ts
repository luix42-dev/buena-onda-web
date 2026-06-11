import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function GET() {
  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await supabase
    .from('drops')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    name,
    description,
    price,
    status = 'upcoming',
    drop_date,
    available = false,
  } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const slug = slugify(name)

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('drops')
    .insert({
      name,
      slug,
      description:  description || null,
      price:        price != null ? parseFloat(price) : null,
      status,
      drop_date:    drop_date || null,
      available:    !!available,
      images:       [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
