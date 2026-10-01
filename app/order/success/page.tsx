import Link from 'next/link'
import type { Metadata } from 'next'
import ScanReveal from '@/components/ui/ScanReveal'
import GAPurchase from '@/components/analytics/GAPurchase'
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
    <>
      <GAPurchase sessionId={sessionId} />
      <div className="pt-32 pb-32 bg-cream">
      <div className="max-w-site mx-auto px-5 md:px-10">
        <ScanReveal>
          <div className="max-w-2xl border border-pale-stone bg-warm-page p-8 md:p-10">
            <p className="archive-label text-[0.62rem] mb-4">Order received</p>
            <h1 className="font-display text-near-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1 }}>
              Thank you for shopping with us.
            </h1>
            <p className="editorial-body text-base leading-relaxed mb-6">
              Your order confirmation and details will arrive by email shortly.
              Thank you for choosing Buena Onda.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/themes"
                className="px-8 py-3.5 bg-near-black text-linen-peach
                           font-mono text-xs tracking-[0.2em] uppercase
                           hover:bg-burnished transition-colors"
              >
                Continue exploring
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
    </>
  )
}
