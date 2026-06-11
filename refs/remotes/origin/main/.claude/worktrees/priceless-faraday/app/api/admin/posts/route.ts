import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
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
  const body = await request.json()
  const { title, excerpt, body: postBody, cover_image, tags, published } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      slug,
      excerpt:      excerpt || null,
      body:         postBody || null,
      cover_image:  cover_image || null,
      tags:         tags ?? [],
      published:    published ?? false,
      published_at: published ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
