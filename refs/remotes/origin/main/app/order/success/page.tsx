import Link from 'next/link'
import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'
export const runtime = 'edge'


export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Order Confirmation',
}

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams

  return (
    <div className="pt-32 pb-32 bg-cream">
      <div className="max-w-site mx-auto px-5 md:px-10">
        <ScanReveal>
          <div className="max-w-2xl border border-pale-stone bg-warm-page p-8 md:p-10">
            <p className="archive-label text-[0.62rem] mb-4">Order received</p>
            <h1 className="font-display text-near-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1 }}>
              Thanks for your order.
            </h1>
            <p className="editorial-body text-base leading-relaxed mb-6">
              If payment completed, the order will finalize automatically once Stripe sends the webhook. This page is only a confirmation that your checkout session returned successfully.
            </p>
            {sessionId && (
              <p className="font-mono text-[0.68rem] text-stone-grey mb-6 break-all">
                Session ID: {sessionId}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/themes"
                className="px-8 py-3.5 bg-near-black text-linen-peach
                           font-mono text-xs tracking-[0.2em] uppercase
                           hover:bg-burnished transition-colors"
              >
                Back to catalog
              </Link>
              <Link
                href="/"
                className="px-8 py-3.5 border border-pale-stone text-stone-grey
                           font-mono text-xs tracking-[0.2em] uppercase
                           hover:border-burnished hover:text-near-black transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        </ScanReveal>
      </div>
    </div>
  )
}
