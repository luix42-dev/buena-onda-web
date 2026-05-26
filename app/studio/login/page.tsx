'use client'

import { useState, useEffect, Suspense, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'

export default function StudioLoginPage() {
  return (
    <Suspense fallback={<div className="studio-login" />}>
      <LoginCard />
    </Suspense>
  )
}

function LoginCard() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const err = params.get('error')
    if (err) setErrorMsg(decodeURIComponent(err))
  }, [params])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setErrorMsg(null)
    try {
      await fetch('/studio/auth/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
    } catch {
      // Always show success — request hardening, not user-facing failure.
    }
    setSent(true)
    setBusy(false)
  }

  return (
    <div className="studio-login">
      <div className="login-card">
        <div className="login-mark">ANALOG CULTURE HOUSE</div>
        <div className="login-title">STUDIO</div>
        <div className="login-sub">the back room of the house</div>

        {!sent ? (
          <form className="login-row" onSubmit={onSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              disabled={busy}
              required
            />
            <button type="submit" className="btn" disabled={busy || !email.trim()}>
              {busy ? 'Sending…' : 'Enter'}
            </button>
          </form>
        ) : (
          <div className="login-hint" style={{ marginTop: 0, fontSize: 14, color: 'var(--ink)' }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>Check your email.</strong>
            If your address is on the allowlist, a sign-in link is on the way.
          </div>
        )}

        {!sent && (
          <div className="login-hint">We&apos;ll send you a sign-in link.</div>
        )}
        {errorMsg && <div className="login-err">{errorMsg}</div>}
      </div>
    </div>
  )
}
