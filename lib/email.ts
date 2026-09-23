import { escapeHtml } from '@/lib/utils'
import { formatShippingLines, type ShippingAddress } from '@/lib/shipping'

export type EmailSendResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: string }

function formatAmount(amountTotal: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountTotal / 100)
}

export async function sendOrderConfirmationEmail(
  itemTitle: string,
  customerEmail: string | null,
  amountTotal: number,
  currency: string,
  shipping: ShippingAddress | null = null,
): Promise<EmailSendResult> {
  if (!customerEmail) {
    return { ok: false, reason: 'No customer email on order' }
  }

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, reason: 'RESEND_API_KEY not configured' }
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const safeItemTitle = escapeHtml(itemTitle)
  const amountText = formatAmount(amountTotal, currency)
  const shipToHtml = shipping
    ? `<p><strong>Delivering to:</strong><br />${formatShippingLines(shipping).map(escapeHtml).join('<br />')}</p>`
    : ''

  const { data, error } = await resend.emails.send({
    from: 'Buena Onda <noreply@buenaondalifestyle.com>',
    to: [customerEmail],
    subject: `Order confirmed: ${itemTitle}`,
    html: `
      <h2>Order Confirmed - Buena Onda</h2>
      <p><strong>Item:</strong> ${safeItemTitle}</p>
      <p><strong>Amount:</strong> ${amountText}</p>
      ${shipToHtml}
      <hr />
      <p>Thanks for your order. We'll be in touch to arrange delivery.</p>
    `,
  })

  if (error) {
    return { ok: false, reason: error.message ?? 'Resend send failed' }
  }

  return { ok: true, id: data?.id ?? null }
}
