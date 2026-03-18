import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

const Schema = z.object({
  itemId: z.string().uuid(),
  email:  z.string().email(),
})

export async function POST(request: NextRequest) {
  const body   = await request.json()
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, email } = parsed.data

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('item_notify_requests')
    .insert({ item_id: itemId, email })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
