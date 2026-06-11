import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('drops')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()
  const {
    name,
    slug,
    description,
    price,
    status,
    drop_date,
    available,
  } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('drops')
    .update({
      name,
      slug,
      description:  description || null,
      price:        price != null ? parseFloat(price) : null,
      status,
      drop_date:    drop_date || null,
      available:    !!available,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServiceClient()
  const { error } = await supabase.from('drops').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
