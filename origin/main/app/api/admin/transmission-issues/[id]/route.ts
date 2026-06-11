export const runtime = 'edge'

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'

interface Params { params: Promise<{ id: string }> }

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('transmission_issues')
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
  const { title, excerpt, body: issueBody, status } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const issueStatus = status === 'live' ? 'live' : 'draft'
  const supabase = await createServiceClient()
  const { data: existing } = await supabase
    .from('transmission_issues')
    .select('published_at,status')
    .eq('id', id)
    .single()

  const update: Record<string, unknown> = {
    title,
    slug: slugify(title),
    excerpt: excerpt || null,
    body: issueBody || null,
    status: issueStatus,
  }

  if (issueStatus === 'live') {
    update.published_at = existing?.published_at ?? new Date().toISOString()
  } else {
    update.published_at = null
  }

  const { data, error } = await supabase
    .from('transmission_issues')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!(await isStudioAuthorized(request))) {
    return unauthorizedStudioResponse()
  }

  const { id } = await params
  const supabase = await createServiceClient()
  const { error } = await supabase.from('transmission_issues').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
