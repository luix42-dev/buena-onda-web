'use client'

import { useState } from 'react'

interface NotifyFormProps {
  dropName?: string
  dropDate?: string
}

export default function NotifyForm({ dropDate }: NotifyFormProps) {
  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    // TODO: connect to /api/newsletter or a dedicated drops-notify endpoint
    await new Promise(r => setTimeout(r, 600))
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <p className="font-mono text-xs text-burnished">
        ✓ We&apos;ll notify you when it drops.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {dropDate && (
        <p className="archive-label text-[0.6rem] text-sky-steel">
          Dropping {dropDate} — join the list
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 max-w-xs"
        aria-label="Get drop notification"
      >
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 border border-pale-stone bg-transparent px-3 py-2
                     font-mono text-xs focus:border-warm-sand focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-4 py-2 bg-warm-sand text-near-black font-mono text-xs
                     tracking-wider uppercase hover:bg-terracotta
                     disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? '...' : 'Notify'}
        </button>
      </form>
    </div>
  )
}
