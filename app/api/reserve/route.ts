export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { escapeHtml } from '@/lib/utils'
import { publicWriteGuard, readLimitedJson, requestErrorResponse } from '@/lib/api/request-security'

const guard = publicWriteGuard()

const ReserveSchema = z.object({
  itemId: z.string().uuid(),
  itemTitle: z.string().max(200).optional(),
  name: z.string().max(100).optional(),
  email: z.string().trim().email().max(254).transform(email => email.toLowerCase()),
  phone: z.string().max(40).optional(),
  message: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const denied = guard(request)
  if (denied) return denied
  let body: unknown
  try { body = await readLimitedJson(request) } catch (error) { return requestErrorResponse(error) }
  const parsed = ReserveSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { itemId, name, email, phone, message } = parsed.data

  const supabase = await createServiceClient()
  const { data: item } = await supabase.from('items').select('id,title').eq('id', itemId).eq('status', 'published').maybeSingle()
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  const itemTitle: string = item.title

  const { data: existing } = await supabase
    .from('item_notify_requests')
    .select('id')
    .eq('item_id', itemId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true })
  }

  const { error: insertError } = await supabase.from('item_notify_requests').insert({ item_id: itemId, email })
  if (insertError?.code === '23505') return NextResponse.json({ ok: true })
  if (insertError) return NextResponse.json({ error: 'Could not save request' }, { status: 500 })

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
