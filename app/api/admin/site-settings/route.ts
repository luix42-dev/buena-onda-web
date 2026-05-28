import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

type SiteSettingsPayload = {
  hero?: Record<string, unknown>
  social?: Record<string, unknown>
  contact?: Record<string, unknown>
  newsletter?: Record<string, unknown>
}

export async function GET(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  let supabase: Awaited<ReturnType<typeof createServiceClient>>
  try {
    supabase = await createServiceClient()
  } catch {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('key,value,updated_at')
    .in('key', ['hero', 'social', 'contact', 'newsletter'])
    .order('key')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data ?? [] })
}

export async function PUT(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const body = (await request.json()) as SiteSettingsPayload
  const entries = Object.entries(body).filter(([, value]) => value && typeof value === 'object')

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No settings provided' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { error } = await service
    .from('site_settings')
    .upsert(entries.map(([key, value]) => ({ key, value })))

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = await service
    .from('site_settings')
    .select('key,value,updated_at')
    .in('key', entries.map(([key]) => key))
    .order('key')

  return NextResponse.json({ settings: data ?? [] })
}
