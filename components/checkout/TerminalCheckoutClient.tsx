'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js'

type IntentPayload = {
  clientSecret: string
  itemTitle: string
  itemPrice: number
  orderId: string
}

type CheckoutState = 'loading' | 'ready' | 'processing' | 'success' | 'error'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

const appearance: StripeElementsOptions['appearance'] = {
  theme: 'night',
  variables: {
    colorPrimary: '#2A9D9D',
    colorBackground: '#0D0D0D',
    colorText: '#FFB347',
    colorDanger: '#FF3C8E',
    colorTextSecondary: '#5ABFBF',
    fontFamily: 'var(--font-mono), "SF Mono", Consolas, monospace',
    borderRadius: '0px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#0D0D0D',
      border: '1px solid #2A9D9D',
      boxShadow: 'none',
      color: '#FFB347',
    },
    '.Input:focus': {
      border: '1px solid #5ABFBF',
      boxShadow: '0 0 0 1px #2A9D9D',
    },
    '.Label': {
      color: '#5ABFBF',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
    },
    '.Tab': {
      border: '1px solid rgba(42,157,157,0.55)',
      borderRadius: '0px',
      backgroundColor: '#0D0D0D',
    },
    '.Tab--selected': {
      borderColor: '#2A9D9D',
      boxShadow: '0 0 12px rgba(42,157,157,0.25)',
    },
  },
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function TerminalRows({ intent }: { intent: IntentPayload }) {
  return (
    <div className="terminal-order-grid" aria-label="Order summary">
      <span>ITEM</span>
      <strong>{intent.itemTitle}</strong>
      <span>PRICE</span>
      <strong>{money(intent.itemPrice)}</strong>
      <span>STATUS</span>
      <strong>AVAILABLE</strong>
    </div>
  )
}

function CheckoutForm({
  intent,
  itemId,
  onSuccess,
}: {
  intent: IntentPayload
  itemId: string
  onSuccess: (orderId: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<CheckoutState>('ready')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements || state === 'processing') return

    setState('processing')
    setError(null)

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        receipt_email: email,
        return_url: `${window.location.origin}/checkout/${itemId}`,
      },
    })

    if (result.error) {
      setError(result.error.message ?? 'Payment could not be confirmed.')
      setState('error')
      return
    }

    const paymentIntentId = result.paymentIntent?.id
    if (!paymentIntentId || result.paymentIntent?.status !== 'succeeded') {
      setError('Payment did not return a confirmed intent.')
      setState('error')
      return
    }

    const complete = await fetch('/api/checkout/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        orderId: intent.orderId,
        paymentIntentId,
        email,
      }),
    })

    const payload = await complete.json().catch(() => null)
    if (!complete.ok) {
      setError(payload?.error ?? 'Order confirmation failed.')
      setState('error')
      return
    }

    setState('success')
    onSuccess(payload.orderId ?? intent.orderId)
  }

  if (state === 'success') return null

  return (
    <form onSubmit={onSubmit} className="terminal-form">
      {error && <div className="terminal-error">! {error}</div>}

      <label className="terminal-field">
        <span>&gt; CARD DETAILS</span>
        <div className="terminal-payment-box">
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      </label>

      <label className="terminal-field">
        <span>&gt; EMAIL</span>
        <input
          type="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoComplete="email"
        />
      </label>

      <button type="submit" className="terminal-submit" disabled={!stripe || state === 'processing'}>
        <span>{state === 'processing' ? 'TRANSMITTING...' : 'CONFIRM TRANSMISSION ->'}</span>
        <i aria-hidden="true" />
      </button>
    </form>
  )
}

export default function TerminalCheckoutClient({ itemId }: { itemId: string }) {
  const [intent, setIntent] = useState<IntentPayload | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadIntent() {
      if (!publishableKey || !stripePromise) {
        setError('Stripe publishable key is not configured.')
        return
      }

      try {
        const res = await fetch(`/api/checkout/intent?itemId=${encodeURIComponent(itemId)}`, {
          cache: 'no-store',
        })
        const payload = await res.json().catch(() => null)

        if (!active) return
        if (!res.ok) {
          setError(payload?.error === 'ITEM_UNAVAILABLE' ? 'ITEM_UNAVAILABLE' : 'Checkout is unavailable.')
          return
        }

        setIntent(payload as IntentPayload)
      } catch {
        if (active) setError('Checkout is unavailable.')
      }
    }

    void loadIntent()
    return () => {
      active = false
    }
  }, [itemId])

  const options = useMemo<StripeElementsOptions | null>(() => {
    if (!intent?.clientSecret) return null
    return {
      clientSecret: intent.clientSecret,
      appearance,
    }
  }, [intent?.clientSecret])

  return (
    <main className="terminal-checkout-screen">
      <section className="terminal-checkout">
        <header className="terminal-header">
          <span className="terminal-mark">[B.O]</span>
          <span>CH 001 · FREQ 19.79</span>
        </header>

        <div className="terminal-body">
          {orderId ? (
            <div className="terminal-success">
              <h1>TRANSMISSION CONFIRMED.</h1>
              <p>ORDER: #{orderId}</p>
              <p>YOU WILL BE CONTACTED WITHIN 24 HOURS.</p>
              <div className="terminal-rule" />
              <Link href="/themes" className="terminal-return">
                &lt;- RETURN TO CATALOG
              </Link>
            </div>
          ) : (
            <>
              <h1>ORDER TRANSMISSION</h1>
              <div className="terminal-rule" />

              {error ? (
                <div className="terminal-error">! {error}</div>
              ) : !intent || !options || !stripePromise ? (
                <div className="terminal-loading">TUNING PAYMENT SIGNAL...</div>
              ) : (
                <>
                  <TerminalRows intent={intent} />
                  <div className="terminal-rule" />
                  <Elements stripe={stripePromise} options={options}>
                    <CheckoutForm intent={intent} itemId={itemId} onSuccess={setOrderId} />
                  </Elements>
                  <p className="terminal-note">
                    * EVERY PIECE IS PERSONALLY SOURCED AND DELIVERED BY OUR TEAM IN MIAMI.
                  </p>
                  <p className="terminal-policy">7-DAY RETURN POLICY. NO QUESTIONS.</p>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
