import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('item_images')
    .select('*')
    .eq('item_id', id)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServiceClient()

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const ts       = Date.now()
  const path     = `items/${id}/${ts}.${ext}`
  const arrayBuf = await file.arrayBuffer()
  const buffer   = Buffer.from(arrayBuf)

  const { error: uploadError } = await supabase.storage
    .from('catalog')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('catalog').getPublicUrl(path)
  const url = urlData.publicUrl

  // Determine sort_order = current max + 1
  const { data: existing } = await supabase
    .from('item_images')
    .select('sort_order')
    .eq('item_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data: imgRow, error: insertError } = await supabase
    .from('item_images')
    .insert({ item_id: id, url, storage_path: path, sort_order: nextOrder })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // If item has no cover yet, set this as cover
  const { data: item } = await supabase
    .from('items')
    .select('cover_image_url')
    .eq('id', id)
    .single()

  if (item && !item.cover_image_url) {
    await supabase.from('items').update({ cover_image_url: url }).eq('id', id)
  }

  return NextResponse.json(imgRow, { status: 201 })
}
