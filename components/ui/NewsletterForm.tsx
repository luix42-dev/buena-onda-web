'use client'

import { useState } from 'react'

interface NewsletterFormProps {
  className?: string
  layout?: 'row' | 'stack'
}

export default function NewsletterForm({ className = '', layout = 'row' }: NewsletterFormProps) {
  const [email,     setEmail]     = useState('')
  const [status,    setStatus]    = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    // TODO: connect to /api/newsletter when endpoint is added
    await new Promise(r => setTimeout(r, 600))
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <p className={`font-mono text-xs text-terracotta ${className}`}>
        ✓ You&apos;re on the list.
      </p>
    )
  }

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
        className="flex-1 border border-pale-stone bg-cream px-4 py-3
                   font-mono text-sm text-near-black placeholder:text-stone-grey
                   focus:border-terracotta focus:outline-none transition-colors"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-6 py-3 bg-terracotta text-cream font-mono text-xs
                   tracking-[0.2em] uppercase hover:bg-burnished
                   disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {status === 'loading' ? '...' : 'Subscribe'}
      </button>
    </form>
  )
}
