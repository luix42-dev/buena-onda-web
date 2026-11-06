export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { publicWriteGuard, readLimitedJson, requestErrorResponse } from '@/lib/api/request-security'

const guard = publicWriteGuard()

const Schema = z.object({
  itemId: z.string().uuid(),
  email:  z.string().trim().email().max(254).transform(email => email.toLowerCase()),
})

export async function POST(request: NextRequest) {
  const denied = guard(request)
  if (denied) return denied
  let body: unknown
  try { body = await readLimitedJson(request, 4096) } catch (error) { return requestErrorResponse(error) }
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, email } = parsed.data

  const supabase = await createServiceClient()
  const { data: item } = await supabase.from('items').select('id').eq('id', itemId).eq('status', 'published').maybeSingle()
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  const { error } = await supabase
    .from('item_notify_requests')
    .insert({ item_id: itemId, email })

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: 'Could not save notification request' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
