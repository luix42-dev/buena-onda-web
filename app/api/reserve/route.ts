import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ReserveSchema = z.object({
  itemId:    z.string(),
  itemTitle: z.string(),
  name:      z.string().min(1).max(100),
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

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from:    'Buena Onda <contact@buenaonda.com>',
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
