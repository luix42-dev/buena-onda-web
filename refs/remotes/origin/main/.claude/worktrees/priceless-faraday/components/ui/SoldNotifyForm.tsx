'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

interface FormData {
  email: string
}

interface Props {
  itemId: string
}

export default function SoldNotifyForm({ itemId }: Props) {
  const [sent,  setSent]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>()

  const onSubmit = async ({ email }: FormData) => {
    setError(null)
    const res = await fetch('/api/notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId, email }),
    })
    if (res.ok) {
      setSent(true)
    } else {
      setError('Something went wrong. Please try again.')
    }
  }

  if (sent) {
    return (
      <p className="font-mono text-xs text-teal py-2">✓ We&apos;ll let you know.</p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2" noValidate>
      <label className="archive-label text-[0.62rem] block">
        Notify me if another arrives
      </label>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          {...register('email', {
            required: 'Email is required',
            pattern:  { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
          className="flex-1 border border-pale-stone bg-transparent px-4 py-2.5
                     font-mono text-sm text-near-black placeholder:text-stone-grey
                     focus:border-warm-sand focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 border border-pale-stone font-mono text-xs
                     tracking-[0.15em] uppercase text-stone-grey
                     hover:border-warm-sand hover:text-near-black
                     disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isSubmitting ? '...' : 'Notify me'}
        </button>
      </div>
      {errors.email && (
        <p className="archive-label text-[0.58rem] text-rose-magenta">{errors.email.message}</p>
      )}
      {error && (
        <p className="archive-label text-[0.58rem] text-rose-magenta">{error}</p>
      )}
    </form>
  )
}
