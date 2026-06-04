'use client'

import { useState } from 'react'

interface Props {
  itemId: string
  itemTitle: string
}

export default function BuyNowButton({ itemId, itemTitle }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    if (isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error ?? 'Checkout failed')
      }
      if (!data?.checkoutUrl) {
        throw new Error('Missing checkout URL')
      }
      window.location.assign(data.checkoutUrl)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="px-8 py-3.5 bg-near-black text-linen-peach
                   font-mono text-xs tracking-[0.2em] uppercase
                   hover:bg-burnished transition-colors self-start inline-block
                   disabled:opacity-60 disabled:cursor-wait"
      >
        {isLoading ? 'Redirecting...' : 'Buy now ->'}
      </button>
      <p className="font-mono text-[0.62rem] text-stone-grey leading-relaxed max-w-xs">
        Secure checkout opens in Stripe Checkout.
      </p>
      <p className="font-mono text-[0.62rem] text-stone-grey">
        {itemTitle}
      </p>
      {error && (
        <p className="font-mono text-[0.62rem] text-burnished leading-relaxed max-w-xs">
          {error}
        </p>
      )}
    </div>
  )
}
