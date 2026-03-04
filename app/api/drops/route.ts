import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { slugify } from '@/lib/utils'

const DropSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().optional(),
  price:       z.number().positive().optional(),
  images:      z.array(z.string()).optional(),
  status:      z.enum(['upcoming', 'live', 'sold_out']).optional(),
  drop_date:   z.string().datetime().optional(),
  available:   z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status')

  let query = supabase
    .from('drops')
    .select('*')
    .order('drop_date', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ drops: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body   = await request.json()
  const parsed = DropSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const slug = slugify(parsed.data.name)
  const { data, error } = await supabase
    .from('drops')
    .insert({ ...parsed.data, slug })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ drop: data }, { status: 201 })
}
