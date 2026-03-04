'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'

interface FormData {
  name:    string
  email:   string
  subject: string
  message: string
}

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again or email us directly.')
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <span className="font-mono text-2xl text-warm-sand">✓</span>
        <h2 className="font-display text-near-black text-2xl">
          Message received.
        </h2>
        <p className="text-charcoal text-sm">
          We&apos;ll be in touch. Good things take time.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      noValidate
    >
      {/* Name */}
      <div>
        <label className="archive-label text-[0.62rem] block mb-2" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          type="text"
          placeholder="Your name"
          autoComplete="name"
          {...register('name', { required: 'Name is required' })}
          className="w-full border border-pale-stone bg-transparent px-4 py-3
                     font-mono text-sm text-near-black placeholder:text-stone-grey
                     focus:border-warm-sand focus:outline-none transition-colors"
        />
        {errors.name && (
          <p className="archive-label text-[0.6rem] text-rose-magenta mt-1">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="archive-label text-[0.62rem] block mb-2" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value:   /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Enter a valid email address',
            },
          })}
          className="w-full border border-pale-stone bg-transparent px-4 py-3
                     font-mono text-sm text-near-black placeholder:text-stone-grey
                     focus:border-warm-sand focus:outline-none transition-colors"
        />
        {errors.email && (
          <p className="archive-label text-[0.6rem] text-rose-magenta mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Subject */}
      <div>
        <label className="archive-label text-[0.62rem] block mb-2" htmlFor="subject">
          Subject
        </label>
        <select
          id="subject"
          {...register('subject', { required: 'Please select a subject' })}
          className="w-full border border-pale-stone bg-cream px-4 py-3
                     font-mono text-sm text-near-black
                     focus:border-warm-sand focus:outline-none transition-colors
                     appearance-none cursor-pointer"
        >
          <option value="">Select a topic</option>
          <option value="general">General enquiry</option>
          <option value="press">Press &amp; media</option>
          <option value="radio">Radio / bookings</option>
          <option value="objects">Objects &amp; drops</option>
          <option value="collaboration">Collaboration</option>
        </select>
        {errors.subject && (
          <p className="archive-label text-[0.6rem] text-rose-magenta mt-1">
            {errors.subject.message}
          </p>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="archive-label text-[0.62rem] block mb-2" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          placeholder="What's on your mind?"
          {...register('message', {
            required:  'Message is required',
            minLength: { value: 20, message: 'Please write at least 20 characters' },
          })}
          className="w-full border border-pale-stone bg-transparent px-4 py-3
                     font-mono text-sm text-near-black placeholder:text-stone-grey
                     focus:border-warm-sand focus:outline-none transition-colors
                     resize-none"
        />
        {errors.message && (
          <p className="archive-label text-[0.6rem] text-rose-magenta mt-1">
            {errors.message.message}
          </p>
        )}
      </div>

      {error && (
        <p className="archive-label text-[0.6rem] text-rose-magenta">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start px-8 py-3.5 bg-near-black text-linen-peach
                   font-mono text-xs tracking-[0.2em] uppercase
                   hover:bg-burnished disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors paper-hover"
      >
        {isSubmitting ? 'Sending...' : 'Send message →'}
      </button>
    </form>
  )
}
