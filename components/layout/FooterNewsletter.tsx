'use client'

import { useState } from 'react'

type Props = {
  variant?: 'footer' | 'transmission'
  source?: string
}

export default function FooterNewsletter({ variant = 'footer', source }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source ? { email: email.trim(), source } : { email: email.trim() }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        const nextMessage = typeof (body as { error?: string }).error === 'string'
          ? (body as { error: string }).error
          : 'Could not subscribe right now.'
        throw new Error(nextMessage)
      }

      setStatus('done')
      setMessage(
        typeof (body as { message?: string }).message === 'string'
          ? (body as { message: string }).message
          : 'You are on the list.'
      )
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Could not subscribe right now.')
    }
  }

  if (status === 'done') {
    if (variant === 'transmission') {
      return (
        <p
          className="font-display"
          style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: '#E8176A', margin: '0 0 16px' }}
        >
          You&apos;re on the list.
        </p>
      )
    }

    return (
      <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: 'var(--teal)' }}>
        {message}
      </p>
    )
  }

  if (variant === 'transmission') {
    return (
      <>
        <h2
          className="font-display"
          style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', marginBottom: 16 }}
        >
          Subscribe to the signal.
        </h2>

        <p
          className="font-serif"
          style={{
            fontStyle: 'italic',
            fontSize: 18,
            color: '#C8C6C0',
            maxWidth: '46ch',
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}
        >
          A cultural bulletin from an analog culture house in Miami. No schedule, no noise.
          When there&apos;s something worth transmitting, we send it.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            maxWidth: 460,
            margin: '0 auto',
            border: '1px solid #F8F7F3',
          }}
          aria-label="Subscribe to newsletter"
        >
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="font-mono"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '16px 20px',
              color: '#F8F7F3',
              fontSize: 13,
              outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="font-mono"
            style={{
              background: '#F8F7F3',
              color: '#0E0E0E',
              border: 'none',
              padding: '16px 24px',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              cursor: status === 'loading' ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {status === 'loading' ? '...' : 'Subscribe'}
          </button>
        </form>

        {status === 'error' && (
          <p className="font-mono" style={{ fontSize: 12, color: '#E8176A', marginTop: 16 }}>
            Something went wrong. Try again.
          </p>
        )}
      </>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2"
      aria-label="Subscribe to newsletter"
    >
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 bg-transparent px-3 py-2 text-xs transition-colors focus:outline-none"
        style={{
          fontFamily: 'var(--font-sans)',
          color: 'var(--charcoal)',
          border: '1px solid var(--gray-muted)',
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-4 py-2 text-xs tracking-wider uppercase disabled:opacity-50 transition-colors"
        style={{
          fontFamily: 'var(--font-display)',
          background: 'var(--teal)',
          color: '#fff',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--teal-deep)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--teal)')}
      >
        {status === 'loading' ? '...' : 'Join'}
      </button>
      {status === 'error' && (
        <p className="text-xs self-center" style={{ fontFamily: 'var(--font-sans)', color: 'var(--coral)' }}>
          {message}
        </p>
      )}
    </form>
  )
}
