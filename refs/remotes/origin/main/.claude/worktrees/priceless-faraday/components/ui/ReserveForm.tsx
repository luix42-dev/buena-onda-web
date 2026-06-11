'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

interface FormData {
  name:    string
  email:   string
  phone:   string
  message: string
}

interface Props {
  itemId:    string
  itemTitle: string
}

const inputCls = `w-full border border-pale-stone bg-transparent px-4 py-3
                  font-mono text-sm text-near-black placeholder:text-stone-grey
                  focus:border-warm-sand focus:outline-none transition-colors`

const labelCls = `archive-label text-[0.62rem] block mb-1.5`

export default function ReserveForm({ itemId, itemTitle }: Props) {
  const [sent,            setSent]            = useState(false)
  const [alreadyReserved, setAlreadyReserved] = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>()

  const onSubmit = async (values: FormData) => {
    setError(null)
    const res = await fetch('/api/reserve', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ itemId, itemTitle, ...values }),
    })
    if (res.status === 409) {
      setAlreadyReserved(true)
    } else if (res.ok) {
      setSent(true)
    } else {
      setError('Something went wrong. Please try again.')
    }
  }

  if (sent) {
    return (
      <div className="py-6">
        <p className="font-mono text-sm text-teal">Reserved. We will be in touch.</p>
        <p className="font-mono text-xs text-stone-grey mt-1">We&apos;ll confirm availability and next steps within 24 hours.</p>
      </div>
    )
  }

  if (alreadyReserved) {
    return (
      <div className="py-6">
        <p className="font-mono text-sm text-teal">You have already reserved this piece.</p>
        <p className="font-mono text-xs text-stone-grey mt-1">We&apos;ll be in touch shortly.</p>
      </div>
    )
  }

  return (
    <>
      <h2 className="font-display text-[1.6rem] leading-none text-near-black mb-2">
        RESERVE THIS PIECE
      </h2>
      <p className="font-mono text-xs text-stone-grey mb-5 leading-relaxed max-w-xs">
        Leave your email to reserve this piece. We&apos;ll confirm availability and next steps within 24 hours.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className={labelCls} htmlFor="res-name">Name (optional)</label>
            <input
              id="res-name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              {...register('name')}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="res-email">Email *</label>
            <input
              id="res-email"
              type="email"
              placeholder="you@email.com"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern:  { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
              className={inputCls}
            />
            {errors.email && (
              <p className="archive-label text-[0.58rem] text-rose-magenta mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor="res-phone">Phone (optional)</label>
            <input
              id="res-phone"
              type="tel"
              placeholder="+1 305 000 0000"
              autoComplete="tel"
              {...register('phone')}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="res-message">Message (optional)</label>
            <textarea
              id="res-message"
              rows={3}
              placeholder="Questions, preferred pickup time..."
              {...register('message')}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {error && (
          <p className="archive-label text-[0.6rem] text-rose-magenta">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3.5 bg-near-black text-linen-peach
                     font-mono text-xs tracking-[0.2em] uppercase
                     hover:bg-burnished disabled:opacity-50 transition-colors self-start"
        >
          {isSubmitting ? 'Reserving...' : 'Reserve this piece →'}
        </button>
      </form>
    </>
  )
}
