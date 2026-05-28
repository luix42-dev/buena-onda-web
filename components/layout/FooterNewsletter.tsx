'use client'

import { useState } from 'react'

export default function FooterNewsletter() {
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
        body: JSON.stringify({ email }),
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
    return (
      <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: 'var(--teal)' }}>
        {message}
      </p>
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
