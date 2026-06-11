export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

export async function GET(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('cruise_scenes')
    .select('*')
    .order('sort', { ascending: true })
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
    city,
    city_label,
    route_label,
    time_of_day,
    title,
    video_key,
    duration_seconds,
    sort = 0,
    published = false,
  } = body

  if (!city || !city_label || !time_of_day || !title) {
    return NextResponse.json(
      { error: 'city, city_label, time_of_day, and title are required' },
      { status: 400 },
    )
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('cruise_scenes')
    .insert({
      city,
      city_label,
      route_label:      route_label || null,
      time_of_day,
      title,
      video_key:        video_key || null,
      duration_seconds: duration_seconds != null ? Number(duration_seconds) : null,
      sort:             Number(sort) || 0,
      published,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
