'use client'

import { useState } from 'react'

interface NotifyFormProps {
  dropName?: string
  dropDate?: string
}

export default function NotifyForm({ dropName, dropDate }: NotifyFormProps) {
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
        throw new Error(
          typeof (body as { error?: string }).error === 'string'
            ? (body as { error: string }).error
            : 'Could not subscribe right now.'
        )
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
      <p className="font-mono text-xs text-teal">
        {message}
        {dropName ? ` We will use the list for ${dropName} updates too.` : ''}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {dropDate ? (
        <p className="archive-label text-[0.6rem] text-sky-steel">
          Dropping {dropDate} - join the list
        </p>
      ) : null}
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
          className="flex-1 border border-gray-muted bg-transparent px-3 py-2 font-mono text-xs focus:border-teal focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-hollow-coral disabled:opacity-50 py-2 px-4 text-[0.65rem]"
        >
          {status === 'loading' ? '...' : 'Notify'}
        </button>
      </form>
      {status === 'error' ? (
        <p className="font-mono text-xs text-coral">{message}</p>
      ) : null}
    </div>
  )
}
