'use client'

import { useState } from 'react'

interface NewsletterFormProps {
  className?: string
  layout?: 'row' | 'stack'
  variant?: 'light' | 'dark'
}

export default function NewsletterForm({ className = '', layout = 'row', variant = 'light' }: NewsletterFormProps) {
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
      <p className={`font-mono text-xs text-teal ${className}`}>
        {message}
      </p>
    )
  }

  const inputClass = variant === 'dark'
    ? 'flex-1 border-0 border-b border-white/10 bg-transparent px-0 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-neon-pink focus:shadow-[0_2px_8px_rgba(255,60,142,0.25)] focus:outline-none transition-colors'
    : 'flex-1 border border-gray-muted bg-transparent px-4 py-3 font-mono text-sm text-near-black placeholder:text-stone-grey input-neon-focus transition-colors'

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        'flex gap-2',
        layout === 'stack' ? 'flex-col sm:flex-row' : 'flex-row',
        className,
      ].join(' ')}
      aria-label="Subscribe to newsletter"
    >
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className={inputClass}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-hollow-coral disabled:opacity-50 whitespace-nowrap"
      >
        {status === 'loading' ? '...' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p className={`font-mono text-xs text-coral ${layout === 'stack' ? '' : 'self-center'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
