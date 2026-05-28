import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

interface Params { params: Promise<{ id: string; imgId: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { imgId } = await params
  const body = await request.json()
  const { sort_order, alt_text } = body

  const supabase = await createServiceClient()
  const update: Record<string, unknown> = {}
  if (sort_order !== undefined) update.sort_order = sort_order
  if (alt_text    !== undefined) update.alt_text   = alt_text

  const { data, error } = await supabase
    .from('item_images')
    .update(update)
    .eq('id', imgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id, imgId } = await params
  const supabase = await createServiceClient()

  // Fetch row before deleting so we have storage_path + url
  const { data: img, error: fetchError } = await supabase
    .from('item_images')
    .select('url, storage_path')
    .eq('id', imgId)
    .single()

  if (fetchError || !img) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  // Remove from storage
  if (img.storage_path) {
    await supabase.storage.from('catalog').remove([img.storage_path])
  }

  // Delete DB row
  const { error: delError } = await supabase
    .from('item_images')
    .delete()
    .eq('id', imgId)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  // If this was the item's cover, promote the next remaining image (or null)
  const { data: item } = await supabase
    .from('items')
    .select('cover_image_url')
    .eq('id', id)
    .single()

  if (item?.cover_image_url === img.url) {
    const { data: remaining } = await supabase
      .from('item_images')
      .select('url')
      .eq('item_id', id)
      .order('sort_order', { ascending: true })
      .limit(1)

    const newCover = remaining && remaining.length > 0 ? remaining[0].url : null
    await supabase.from('items').update({ cover_image_url: newCover }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
