import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

interface Params { params: Promise<{ id: string }> }

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const body = await request.json()
  const {
    name,
    slug,
    tagline,
    description,
    tags,
    status,
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
  const { data: existing } = await supabase
    .from('events')
    .select('slug')
    .eq('id', id)
    .single()
  const { data, error } = await supabase
    .from('events')
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/events')
  if (existing?.slug) revalidatePath(`/events/${existing.slug}`)
  revalidatePath(`/events/${data.slug}`)
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { data: existing } = await supabase
    .from('events')
    .select('slug')
    .eq('id', id)
    .single()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  revalidatePath('/events')
  if (existing?.slug) revalidatePath(`/events/${existing.slug}`)
  return NextResponse.json({ ok: true })
}
