'use client'

import { useState } from 'react'

export default function FooterNewsletter() {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    await new Promise(r => setTimeout(r, 600))
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: 'var(--teal)' }}>
        ✓ You&apos;re on the list.
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
          fontFamily:  'var(--font-sans)',
          color:       'var(--charcoal)',
          border:      '1px solid var(--gray-muted)',
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-4 py-2 text-xs tracking-wider uppercase disabled:opacity-50 transition-colors"
        style={{
          fontFamily:  'var(--font-display)',
          background:  'var(--teal)',
          color:       '#fff',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--teal-deep)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--teal)')}
      >
        {status === 'loading' ? '...' : 'Join'}
      </button>
    </form>
  )
}
