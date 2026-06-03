export const runtime = 'nodejs'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'
import { attachInstagramImage, notifyCulturePostLive } from '@/lib/culture-integrations'

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
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
    title,
    slug,
    excerpt,
    body: postBody,
    cover_image,
    instagram_url,
    instagramUrl,
    tags,
    published,
    status,
  } = body

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: existing } = await supabase
    .from('posts')
    .select('published_at, published, status, instagram_url')
    .eq('id', id)
    .single()

  const postStatus = status === 'live' || published === true ? 'live' : 'draft'
  const instagramUrlValue = instagram_url || instagramUrl || null
  let coverImage = cover_image || null

  if (instagramUrlValue && instagramUrlValue !== existing?.instagram_url) {
    try {
      const upload = await attachInstagramImage(supabase, instagramUrlValue, title)
      coverImage = upload.publicUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not attach Instagram image'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const update: Record<string, unknown> = {
    title,
    slug,
    excerpt:     excerpt || null,
    body:        postBody || null,
    cover_image: coverImage,
    instagram_url: instagramUrlValue,
    tags:        tags ?? [],
    status:      postStatus,
    published:   postStatus === 'live',
  }

  if (postStatus === 'live') {
    if (existing && !existing.published_at) {
      update.published_at = new Date().toISOString()
    }
  } else {
    update.published_at = null
  }

  const { data, error } = await supabase
    .from('posts')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const wasLive = existing?.status === 'live' || existing?.published === true
  if (!wasLive && data.status === 'live') {
    await notifyCulturePostLive(data.title, data.slug)
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
