import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'

const ReserveSchema = z.object({
  itemId:    z.string().uuid(),
  itemTitle: z.string(),
  name:      z.string().max(100).optional(),
  email:     z.string().email(),
  phone:     z.string().optional(),
  message:   z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body   = await request.json()
  const parsed = ReserveSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, itemTitle, name, email, phone, message } = parsed.data

  const supabase = await createServiceClient()

  // Duplicate check
  const { data: existing } = await supabase
    .from('item_notify_requests')
    .select('id')
    .eq('item_id', itemId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'already_reserved' }, { status: 409 })
  }

  // Persist reservation
  await supabase.from('item_notify_requests').insert({ item_id: itemId, email })

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from:    'Buena Onda <onboarding@resend.dev>',
      to:      [process.env.CONTACT_EMAIL ?? 'hello@buenaonda.com'],
      replyTo: email,
      subject: `Reserve request: ${itemTitle}`,
      html: `
        <h2>Reserve Request — Buena Onda</h2>
        <p><strong>Item:</strong> ${itemTitle}</p>
        <p><strong>Item ID:</strong> ${itemId}</p>
        <hr />
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
        ${message ? `<p><strong>Message:</strong><br />${message.replace(/\n/g, '<br />')}</p>` : ''}
      `,
    })
  }

  return NextResponse.json({ ok: true })
}
