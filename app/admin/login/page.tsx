'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from') ?? '/admin'
  const inputRef     = useRef<HTMLInputElement>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const password = inputRef.current?.value ?? ''

    const res = await fetch('/api/admin/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push(from)
      router.refresh()
    } else {
      setError('Incorrect password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-sand-bg flex items-center justify-center px-5">
      <div className="w-full max-w-sm">

        <div className="mb-10">
          <p className="archive-label text-[0.6rem] text-stone-grey mb-1">Admin Access</p>
          <h1 className="font-display text-near-black text-3xl">Buena Onda</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="archive-label text-[0.62rem] block mb-2" htmlFor="password">
              Password
            </label>
            <input
              ref={inputRef}
              id="password"
              type="password"
              autoFocus
              required
              placeholder="••••••••"
              className="w-full border border-pale-stone bg-transparent px-4 py-3
                         font-mono text-sm text-near-black placeholder:text-stone-grey
                         focus:border-warm-sand focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="archive-label text-[0.6rem] text-rose-magenta">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-3.5 bg-near-black text-linen-peach
                       font-mono text-xs tracking-[0.2em] uppercase
                       hover:bg-burnished disabled:opacity-50
                       transition-colors mt-2"
          >
            {loading ? 'Entering...' : 'Enter →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
