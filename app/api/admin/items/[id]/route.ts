import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'
import { sendTelegramMessage } from '@/lib/telegram'

export const runtime = 'edge'

interface Params { params: Promise<{ id: string }> }

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
  } = body

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: existing } = await supabase
    .from('items')
    .select('published_at, status, title')
    .eq('id', id)
    .single()

  const update: Record<string, unknown> = {
    title,
    slug,
    theme_id:        theme_id || null,
    price:           price ?? null,
    buy_url:         buy_url || null,
    description:     description || null,
    why_chosen:      why_chosen || null,
    tags:            tags ?? [],
    cover_image_url: cover_image_url || null,
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
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
