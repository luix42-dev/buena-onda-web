export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { escapeHtml } from '@/lib/utils'

const ReserveSchema = z.object({
  itemId: z.string().uuid(),
  itemTitle: z.string(),
  name: z.string().max(100).optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = ReserveSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, itemTitle, name, email, phone, message } = parsed.data

  const supabase = await createServiceClient()

  const { data: existing } = await supabase
    .from('item_notify_requests')
    .select('id')
    .eq('item_id', itemId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'already_reserved' }, { status: 409 })
  }

  await supabase.from('item_notify_requests').insert({ item_id: itemId, email })

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const safeItemTitle = escapeHtml(itemTitle)
    const safeItemId = escapeHtml(itemId)
    const safeName = escapeHtml(name?.trim() || 'Not provided')
    const safeEmail = escapeHtml(email)
    const safePhone = phone?.trim() ? escapeHtml(phone) : null
    const safeMessage = message?.trim()
      ? escapeHtml(message).replace(/\n/g, '<br />')
      : null

    await resend.emails.send({
      from: 'Buena Onda <onboarding@resend.dev>',
      to: ['hello@buenaonda.com'],
      replyTo: email,
      subject: `Reserve request: ${itemTitle}`,
      html: `
        <h2>Reserve Request - Buena Onda</h2>
        <p><strong>Item:</strong> ${safeItemTitle}</p>
        <p><strong>Item ID:</strong> ${safeItemId}</p>
        <hr />
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
        ${safeMessage ? `<p><strong>Message:</strong><br />${safeMessage}</p>` : ''}
      `,
    })
  }

  return NextResponse.json({ ok: true })
}
