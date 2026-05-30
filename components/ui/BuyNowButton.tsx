'use client'

import { useState } from 'react'

interface Props {
  itemId: string
  itemSlug: string
  itemTitle: string
}

export default function BuyNowButton({ itemId, itemSlug, itemTitle }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemSlug, itemTitle }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error ?? 'Checkout is temporarily unavailable.')
        setIsLoading(false)
        return
      }

      if (!data?.checkoutUrl) {
        setError('Stripe checkout URL was not returned.')
        setIsLoading(false)
        return
      }

      window.location.assign(data.checkoutUrl)
    } catch {
      setError('Checkout is temporarily unavailable.')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="px-8 py-3.5 bg-near-black text-linen-peach
                   font-mono text-xs tracking-[0.2em] uppercase
                   hover:bg-burnished disabled:opacity-50 transition-colors self-start"
      >
        {isLoading ? 'Redirecting...' : `Buy now â†’`}
      </button>
      <p className="font-mono text-[0.62rem] text-stone-grey leading-relaxed max-w-xs">
        Secure checkout is handled by Stripe. Your payment confirms only after the webhook updates the order.
      </p>
      {error && (
        <p className="font-mono text-[0.6rem] text-rose-magenta">{error}</p>
      )}
      <p className="font-mono text-[0.62rem] text-stone-grey">
        {itemTitle}
      </p>
    </div>
  )
}
