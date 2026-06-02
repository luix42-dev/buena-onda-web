import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

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

  const status = request.nextUrl.searchParams.get('status')
  let query = supabase
    .from('events')
    .select('*')
    .order('updated_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const body = await request.json()
  const {
    name,
    slug,
    tagline,
    description,
    tags,
    status = 'recurring',
    venue_name,
    venue_city,
    event_date,
    lineup,
    cover_image_url,
    gallery,
    videos,
    playlist_url,
    audio_files,
    partners,
    archive_sheets,
    archive_notes,
  } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .insert({
      name,
      slug,
      tagline: tagline || null,
      description: description || null,
      tags: tags ?? [],
      status,
      venue_name: venue_name || null,
      venue_city: venue_city || null,
      event_date: event_date || null,
      lineup: lineup || null,
      cover_image_url: cover_image_url || null,
      gallery: asArray(gallery),
      videos: asArray(videos),
      playlist_url: playlist_url || null,
      audio_files: asArray(audio_files),
      partners: asArray(partners),
      archive_sheets: asArray(archive_sheets),
      archive_notes: archive_notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
