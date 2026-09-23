'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Report = { fulfilled: string[]; canceled: string[]; released: string[]; unresolved: unknown[] }

export default function ReconcileButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/checkout/reconcile', { method: 'POST' })
      const data = (await response.json().catch(() => null)) as (Report & { error?: string }) | null
      if (!response.ok || !data) throw new Error(data?.error ?? 'Reconciliation failed')
      setMessage(
        `Released ${data.released.length} · fulfilled ${data.fulfilled.length} · closed ${data.canceled.length} · needs review ${data.unresolved.length}`,
      )
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Reconciliation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ textAlign: 'right' }}>
      <button type="button" className="btn" onClick={run} disabled={busy}>
        {busy ? 'Checking Stripe…' : 'Reconcile now'}
      </button>
      {message && <div style={{ fontSize: '0.75rem', marginTop: 6, opacity: 0.8 }}>{message}</div>}
    </div>
  )
}
