import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'
import { sendTelegramMessage } from '@/lib/telegram'

interface Params { params: Promise<{ id: string }> }

async function moveImageToPrimary(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  itemId: string,
  imageId: string,
) {
  const { data: images, error } = await supabase
    .from('item_images')
    .select('id, url, sort_order, created_at')
    .eq('item_id', itemId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!images || images.length === 0) {
    throw new Error('No images found for item')
  }

  const primaryIndex = images.findIndex(image => image.id === imageId)
  if (primaryIndex === -1) {
    throw new Error('Selected cover image not found')
  }

  const ordered = [images[primaryIndex], ...images.filter(image => image.id !== imageId)]

  for (let index = 0; index < ordered.length; index += 1) {
    const { error: tempError } = await supabase
      .from('item_images')
      .update({ sort_order: -(index + 1) })
      .eq('id', ordered[index].id)

    if (tempError) throw tempError
  }

  for (let index = 0; index < ordered.length; index += 1) {
    const { error: finalError } = await supabase
      .from('item_images')
      .update({ sort_order: index })
      .eq('id', ordered[index].id)

    if (finalError) throw finalError
  }

  return ordered[0].url
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

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
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const body = await request.json()
  const {
    title, slug, theme_id, price, buy_url,
    description, why_chosen, tags, cover_image_url, status, details,
    availability,
    sourcing_model,
    cover_image_id,
  } = body

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: existing } = await supabase
    .from('items')
    .select('published_at, status, title, slug')
    .eq('id', id)
    .single()

  let syncedCoverImageUrl =
    typeof cover_image_url === 'string' && cover_image_url.trim()
      ? cover_image_url
      : null

  if (typeof cover_image_id === 'string' && cover_image_id.trim()) {
    try {
      syncedCoverImageUrl = await moveImageToPrimary(supabase, id, cover_image_id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update cover image order'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const update: Record<string, unknown> = {
    title,
    slug,
    theme_id:        theme_id || null,
    price:           price ?? null,
    buy_url:         buy_url || null,
    description:     description || null,
    why_chosen:      why_chosen || null,
    tags:            tags ?? [],
    cover_image_url: syncedCoverImageUrl,
    details:         details ?? null,
    status,
    ...(availability !== undefined && { availability }),
    ...(sourcing_model !== undefined && { sourcing_model }),
  }

  if (status === 'published') {
    // Set published_at only if transitioning to published (don't overwrite)
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

  revalidatePath('/themes')
  revalidatePath('/sitemap.xml')
  if (existing?.slug) revalidatePath(`/items/${existing.slug}`)
  revalidatePath(`/items/${data.slug}`)
  if (existing?.status === 'draft' && data.status === 'published') {
    const telegram = await sendTelegramMessage(`New item live: ${data.title}`)
    return NextResponse.json({ ...data, telegram })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { data: images, error: imagesError } = await supabase
    .from('item_images')
    .select('id, storage_path')
    .eq('item_id', id)

  if (imagesError) {
    void logAudit({
      subsystem: 'catalog',
      action: 'delete',
      item_type: 'item',
      item_id: id,
      success: false,
      error_message: imagesError.message,
      metadata: { stage: 'fetch_images' },
    })
    return NextResponse.json({ error: imagesError.message }, { status: 400 })
  }

  const storageWarnings: string[] = []
  for (const image of images ?? []) {
    if (!image.storage_path) continue

    const { error: storageError } = await supabase.storage
      .from('catalog')
      .remove([image.storage_path])

    if (storageError) {
      console.error('[items/delete] Storage removal failed:', image.storage_path, storageError.message)
      storageWarnings.push(image.storage_path)
    }
  }

  const { error: imagesDeleteError } = await supabase
    .from('item_images')
    .delete()
    .eq('item_id', id)

  if (imagesDeleteError) {
    void logAudit({
      subsystem: 'catalog',
      action: 'delete',
      item_type: 'item',
      item_id: id,
      success: false,
      error_message: imagesDeleteError.message,
      metadata: {
        stage: 'delete_image_rows',
        image_count: images?.length ?? 0,
        storage_warnings: storageWarnings,
      },
    })
    return NextResponse.json({ error: imagesDeleteError.message }, { status: 400 })
  }

  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) {
    void logAudit({
      subsystem: 'catalog',
      action: 'delete',
      item_type: 'item',
      item_id: id,
      success: false,
      error_message: error.message,
      metadata: {
        stage: 'delete_item',
        image_count: images?.length ?? 0,
        storage_warnings: storageWarnings,
      },
    })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  void logAudit({
    subsystem: 'catalog',
    action: 'delete',
    item_type: 'item',
    item_id: id,
    success: true,
    metadata: {
      image_count: images?.length ?? 0,
      storage_warnings: storageWarnings,
      partial_storage_failure: storageWarnings.length > 0,
    },
  })
  return NextResponse.json({
    ok: true,
    ...(storageWarnings.length > 0 && {
      warning: `Storage removal failed for: ${storageWarnings.join(', ')}`,
    }),
  })
}
