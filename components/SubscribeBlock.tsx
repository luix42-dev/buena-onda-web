'use client'

import { useState } from 'react'

type Props = {
  source: string
}

type State = 'idle' | 'success' | 'error'

export default function SubscribeBlock({ source }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })
      const data = await res.json() as { ok?: boolean }
      if (res.ok && data.ok) {
        setState('success')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: '#0E0E0E', color: '#F8F7F3', padding: '80px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <p
          className="font-mono"
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: '#E8176A',
            marginBottom: 18,
          }}
        >
          The Transmission
        </p>

        {state === 'success' ? (
          <p
            className="font-display"
            style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: '#E8176A', margin: '0 0 16px' }}
          >
            You&apos;re on the list.
          </p>
        ) : (
          <>
            <h2
              className="font-display"
              style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', marginBottom: 16 }}
            >
              Subscribe to the signal.
            </h2>

            <p
              className="font-serif"
              style={{
                fontStyle: 'italic',
                fontSize: 18,
                color: '#C8C6C0',
                maxWidth: '46ch',
                margin: '0 auto 32px',
                lineHeight: 1.6,
              }}
            >
              A cultural bulletin from an analog culture house in Miami. No schedule, no noise.
              When there&apos;s something worth transmitting, we send it.
            </p>

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                maxWidth: 460,
                margin: '0 auto',
                border: '1px solid #F8F7F3',
              }}
            >
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="font-mono"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  padding: '16px 20px',
                  color: '#F8F7F3',
                  fontSize: 13,
                  outline: 'none',
                  minWidth: 0,
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                className="font-mono"
                style={{
                  background: '#F8F7F3',
                  color: '#0E0E0E',
                  border: 'none',
                  padding: '16px 24px',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  cursor: submitting ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {submitting ? '...' : 'Subscribe'}
              </button>
            </form>

            {state === 'error' && (
              <p
                className="font-mono"
                style={{ fontSize: 12, color: '#E8176A', marginTop: 16 }}
              >
                Something went wrong. Try again.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
