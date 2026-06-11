import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await request.json()
  const { year, title, summary, story, photo, photos } = body

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('timeline')
    .update({ year, title, summary, story, photo: photo ?? null, photos: photos ?? [] })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServiceClient()
  const { error } = await supabase.from('timeline').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
