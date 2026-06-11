import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

const NewsletterSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
})

function isDuplicateError(error: { code?: string; message?: string } | null) {
  if (!error) return false
  if (error.code === '23505') return true
  return typeof error.message === 'string' && error.message.toLowerCase().includes('duplicate key')
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = NewsletterSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const source = parsed.data.source ?? null

  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email, confirmed: true, source })

  if (isDuplicateError(error)) {
    return NextResponse.json({ ok: true, existing: true })
  }

  if (error) {
    return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
