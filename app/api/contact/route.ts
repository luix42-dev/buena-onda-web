export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { escapeHtml } from '@/lib/utils'

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(20).max(2000),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = ContactSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, subject, message } = parsed.data
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeSubject = escapeHtml(subject)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
      from: 'Buena Onda Contact Form <onboarding@resend.dev>',
      to: ['hello@buenaonda.com'],
      replyTo: email,
      subject: `[Contact] ${subject} - from ${name}`,
      html: `
        <p><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <p>${safeMessage}</p>
      `,
    })

    if (error) {
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
