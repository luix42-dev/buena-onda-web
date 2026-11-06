export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isStudioAuthorized, unauthorizedStudioResponse } from '@/lib/studio-auth'
import { readLimitedJson, requestErrorResponse } from '@/lib/api/request-security'
import { z } from 'zod'
import { slugify } from '@/lib/utils'

const EpisodeSchema = z.object({
  title:          z.string().min(1).max(200),
  description:    z.string().optional(),
  audio_url:      z.string().url().optional().or(z.literal('')),
  cover_image:    z.string().url().optional().or(z.literal('')),
  duration:       z.number().int().positive().optional(),
  episode_number: z.number().int().positive().optional(),
  tags:           z.array(z.string()).optional(),
  published:      z.boolean().optional(),
  published_at:   z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = createPublicClient()
  const { searchParams } = new URL(request.url)

  const page   = Math.min(1000, Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1))
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20') || 20))
  const offset = (page - 1) * limit

  let query = supabase
    .from('episodes')
    .select('*', { count: 'exact' })
    .order('episode_number', { ascending: false })
    .range(offset, offset + limit - 1)

  query = query.eq('published', true)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'Could not load episodes' }, { status: 500 })
  }

  return NextResponse.json({ episodes: data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  if (!(await isStudioAuthorized(request))) return unauthorizedStudioResponse()
  const supabase = createServiceRoleClient()
  let body: unknown
  try { body = await readLimitedJson(request, 65_536) } catch (error) { return requestErrorResponse(error) }
  const parsed = EpisodeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const slug = slugify(parsed.data.title)
  const { data, error } = await supabase
    .from('episodes')
    .insert({ ...parsed.data, slug })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ episode: data }, { status: 201 })
}
