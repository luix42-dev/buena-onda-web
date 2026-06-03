export const runtime = 'edge'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'
import { attachInstagramImage, notifyCulturePostLive } from '@/lib/culture-integrations'

export async function GET(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const body = await request.json()
  const {
    title,
    excerpt,
    body: postBody,
    cover_image,
    instagram_url,
    instagramUrl,
    tags,
    published,
    status,
  } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const supabase = await createServiceClient()
  const postStatus = status === 'live' || published === true ? 'live' : 'draft'
  const instagramUrlValue = instagram_url || instagramUrl || null
  let coverImage = cover_image || null

  if (instagramUrlValue) {
    try {
      const upload = await attachInstagramImage(supabase, instagramUrlValue, title)
      coverImage = upload.publicUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not attach Instagram image'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      slug,
      excerpt:      excerpt || null,
      body:         postBody || null,
      cover_image:  coverImage,
      instagram_url: instagramUrlValue,
      tags:         tags ?? [],
      status:       postStatus,
      published:    postStatus === 'live',
      published_at: postStatus === 'live' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (postStatus === 'live') {
    await notifyCulturePostLive(data.title, data.slug)
  }

  return NextResponse.json(data, { status: 201 })
}
