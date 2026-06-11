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
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const err = params.get('error')
    if (err) setErrorMsg(decodeURIComponent(err))
  }, [params])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password) return

    setBusy(true)
    setErrorMsg(null)

    try {
      const response = await fetch('/studio/auth/start', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          password,
          from: params.get('from') || '/studio',
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setErrorMsg(typeof data?.error === 'string' ? data.error : 'Unable to sign in')
        return
      }

      window.location.assign(typeof data?.redirectTo === 'string' ? data.redirectTo : '/studio')
    } catch {
      setErrorMsg('Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="studio-login">
      <div className="login-card">
        <div className="login-mark">ANALOG CULTURE HOUSE</div>
        <div className="login-title">STUDIO</div>
        <div className="login-sub">the back room of the house</div>

        <form className="login-row" onSubmit={onSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            disabled={busy}
            required
          />
          <button type="submit" className="btn" disabled={busy || !password}>
            {busy ? 'Entering...' : 'Enter'}
          </button>
        </form>

        <div className="login-hint">Enter the studio password.</div>
        {errorMsg && <div className="login-err">{errorMsg}</div>}
      </div>
    </div>
  )
}
