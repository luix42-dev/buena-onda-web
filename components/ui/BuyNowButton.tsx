'use client'

import Link from 'next/link'

interface Props {
  itemId: string
  itemTitle: string
}

export default function BuyNowButton({ itemId, itemTitle }: Props) {
  return (
    <div className="space-y-3">
      <Link
        href={`/checkout/${itemId}`}
        className="px-8 py-3.5 bg-near-black text-linen-peach
                   font-mono text-xs tracking-[0.2em] uppercase
                   hover:bg-burnished transition-colors self-start inline-block"
      >
        Buy now -&gt;
      </Link>
      <p className="font-mono text-[0.62rem] text-stone-grey leading-relaxed max-w-xs">
        Secure checkout opens in the Buena Onda terminal and is powered by Stripe Elements.
      </p>
      <p className="font-mono text-[0.62rem] text-stone-grey">
        {itemTitle}
      </p>
    </div>
  )
}
