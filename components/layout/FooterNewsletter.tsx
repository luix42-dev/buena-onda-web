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
    return <p className="font-mono text-xs text-warm-sand">✓ You&apos;re on the list.</p>
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
        className="flex-1 bg-transparent border border-charcoal rounded-sm px-3 py-2
                   font-mono text-xs text-pale-stone placeholder:text-charcoal
                   focus:border-warm-sand focus:outline-none transition-colors"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-4 py-2 bg-warm-sand text-near-black font-mono text-xs tracking-wider
                   uppercase hover:bg-burnished disabled:opacity-50 transition-colors rounded-sm"
      >
        {status === 'loading' ? '...' : 'Join'}
      </button>
    </form>
  )
}
