'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export type ModerationPlot = {
  number: number; kind: string; status: string; reviewState: string; approved: boolean
  ownerName: string | null; ownerTagline: string | null; ownerUrl: string | null; ownerColor: string | null; ownerEmail: string | null
  value: string; nextPrice: string; visits: number; clicks: number; session: string | null; claimedAt: string | null; reviewedAt: string | null
}
export type ModerationEntry = { id: number; plot: number | null; action: string; actor: string; reason: string | null; claim_session_id: string | null; at: string }
export type RefundEntry = {
  stripe_session_id: string; plot: number | null; reason: string; amount_cents: number | null; currency: string | null; email: string | null
  detail: string | null; created_at: string; resolved_at: string | null; resolved_by: string | null
}

const STATE_LABEL: Record<string, string> = { none: 'Open', pending: 'Pending review', approved: 'Live', pulled: 'Pulled' }
const when = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) : '—'
const money = (cents: number | null, currency: string | null) => cents == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(cents / 100)

export default function AvenueModerationClient({ plots, history, refunds }: { plots: ModerationPlot[]; history: ModerationEntry[]; refunds: RefundEntry[] }) {
  const router = useRouter()
  const [actor, setActor] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<'claimed' | 'all'>('claimed')

  async function act(key: string, payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    const reason = payload.action === 'note' || payload.action === 'pull' || payload.action === 'refund_resolved'
      ? window.prompt(payload.action === 'note' ? 'Note' : 'Reason (saved to the audit log)') : null
    if (reason === null && (payload.action === 'note' || payload.action === 'pull' || payload.action === 'refund_resolved')) return // cancelled
    if (payload.action === 'note' && !reason) return
    setBusy(key); setMessage(null)
    try {
      const r = await fetch('/api/cruise/plots/moderate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, reason, actor: actor.trim() || undefined }) })
      const data = await r.json().catch(() => ({})) as { result?: string; error?: string }
      setMessage(r.ok ? `Done: ${payload.action}${payload.plot ? ` · plot #${payload.plot}` : ''}` : data.result === 'stale' ? 'A newer claim landed on this plot. Reloaded, review it again.' : data.error ?? data.result ?? `Failed (${r.status})`)
      router.refresh()
    } catch { setMessage('Network error') } finally { setBusy(null) }
  }

  const shown = filter === 'all' ? plots : plots.filter(p => p.status === 'claimed')
  const pending = plots.filter(p => p.reviewState === 'pending').length
  const openRefunds = refunds.filter(r => !r.resolved_at)

  return (
    <div className="avm">
      <style>{`
        .avm { padding: 24px 16px 64px; max-width: 1040px; font-family: inherit; }
        .avm h1 { font-size: 1.4rem; margin: 0 0 4px; }
        .avm h2 { font-size: 0.8rem; letter-spacing: 0.14em; text-transform: uppercase; margin: 32px 0 12px; opacity: 0.7; }
        .avm .sub, .avm .meta { font-size: 0.85rem; opacity: 0.75; }
        .avm .bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 14px 0; }
        .avm input { padding: 6px 8px; border: 1px solid rgba(127,127,127,0.4); border-radius: 4px; background: transparent; color: inherit; }
        .avm button { padding: 6px 10px; border: 1px solid currentColor; border-radius: 4px; background: transparent; color: inherit; cursor: pointer; font-size: 0.8rem; }
        .avm button:disabled { opacity: 0.4; cursor: default; }
        .avm .cards { display: grid; gap: 10px; }
        .avm .card { border: 1px solid rgba(127,127,127,0.3); border-radius: 6px; padding: 12px 14px; }
        .avm .row { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: baseline; justify-content: space-between; }
        .avm .tag { font-family: monospace; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; border: 1px solid currentColor; }
        .avm .tag.pending { color: #C2410C; } .avm .tag.approved { color: #15803D; } .avm .tag.pulled { color: #B91C1C; }
        .avm .swatch { display: inline-block; width: 12px; height: 12px; border-radius: 2px; vertical-align: middle; margin-right: 6px; border: 1px solid rgba(127,127,127,0.5); }
        .avm .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .avm table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        .avm td, .avm th { text-align: left; padding: 6px 8px; border-bottom: 1px solid rgba(127,127,127,0.2); vertical-align: top; }
        .avm .msg { font-size: 0.85rem; padding: 8px 10px; border: 1px solid rgba(127,127,127,0.4); border-radius: 4px; }
        .avm .scroll { overflow-x: auto; }
        .avm a { color: inherit; }
      `}</style>

      <p className="meta"><Link href="/studio/cruise">← Cruise</Link></p>
      <h1>Avenue moderation</h1>
      <p className="sub">Paid claims and buyouts stay hidden on the street until approved here. Every action is written to the audit log. Owner emails are visible only in the studio. Drive-bys are an anonymous, unverified counter.</p>

      <div className="bar">
        <label className="meta">Your name for the log <input value={actor} onChange={e => setActor(e.target.value)} maxLength={40} placeholder="operator" /></label>
        <button onClick={() => setFilter(filter === 'all' ? 'claimed' : 'all')}>{filter === 'all' ? 'Show claimed only' : 'Show all plots'}</button>
        <span className="meta">{pending} pending · {openRefunds.length} refunds needed</span>
      </div>
      {message && <p className="msg" role="status">{message}</p>}

      <h2>Plots</h2>
      <div className="cards">
        {shown.length === 0 && <p className="meta">No claimed plots yet.</p>}
        {shown.map(p => (
          <div className="card" key={p.number}>
            <div className="row">
              <div><b>#{p.number}</b> · {p.kind} · <span className={`tag ${p.reviewState}`}>{p.status === 'house' ? 'House' : STATE_LABEL[p.reviewState] ?? p.reviewState}</span></div>
              <div className="meta">value {p.value} · next {p.nextPrice} · {p.visits.toLocaleString()} drive-bys · {p.clicks.toLocaleString()} clicks</div>
            </div>
            {p.status === 'claimed' && <>
              <div style={{ marginTop: 8 }}>
                <div>{p.ownerColor && <span className="swatch" style={{ background: p.ownerColor }} />}<b>{p.ownerName}</b>{p.ownerTagline ? ` — ${p.ownerTagline}` : ''}</div>
                <div className="meta">{p.ownerUrl ? <a href={p.ownerUrl} target="_blank" rel="noopener noreferrer nofollow">{p.ownerUrl}</a> : 'no website'} · {p.ownerEmail ?? 'no email'} · claimed {when(p.claimedAt)} · reviewed {when(p.reviewedAt)}</div>
                <div className="meta" style={{ fontFamily: 'monospace' }}>{p.session}</div>
              </div>
              <div className="actions">
                <button disabled={!!busy || p.reviewState !== 'pending'} onClick={() => act(`a${p.number}`, { action: 'approve', plot: p.number, session: p.session }, `Approve "${p.ownerName}" on plot #${p.number}? It goes live on the street.`)}>Approve</button>
                <button disabled={!!busy || (p.reviewState !== 'pending' && p.reviewState !== 'approved')} onClick={() => act(`p${p.number}`, { action: 'pull', plot: p.number, session: p.session })}>Pull</button>
                <button disabled={!!busy || p.reviewState !== 'pulled'} onClick={() => act(`r${p.number}`, { action: 'restore', plot: p.number, session: p.session }, `Restore "${p.ownerName}" on plot #${p.number}?`)}>Restore</button>
                <button disabled={!!busy} onClick={() => act(`n${p.number}`, { action: 'note', plot: p.number })}>Add note</button>
              </div>
            </>}
          </div>
        ))}
      </div>

      <h2>Refunds needed</h2>
      <p className="meta">Paid sessions that could not be applied (lost a buyout race, amount or currency mismatch, plot not for sale). Refund them in the Stripe Dashboard, then mark them resolved here.</p>
      <div className="scroll"><table>
        <thead><tr><th>When</th><th>Plot</th><th>Reason</th><th>Amount</th><th>Email</th><th>Session</th><th /></tr></thead>
        <tbody>
          {refunds.length === 0 && <tr><td colSpan={7} className="meta">None.</td></tr>}
          {refunds.map(r => <tr key={r.stripe_session_id}>
            <td>{when(r.created_at)}</td><td>{r.plot ?? '—'}</td><td>{r.reason}{r.detail ? <div className="meta">{r.detail}</div> : null}</td>
            <td>{money(r.amount_cents, r.currency)}</td><td>{r.email ?? '—'}</td><td style={{ fontFamily: 'monospace' }}>{r.stripe_session_id}</td>
            <td>{r.resolved_at ? <span className="meta">resolved {when(r.resolved_at)} by {r.resolved_by}</span> : <button disabled={!!busy} onClick={() => act(`f${r.stripe_session_id}`, { action: 'refund_resolved', session: r.stripe_session_id }, 'Mark as refunded? Do this only after refunding in Stripe.')}>Mark refunded</button>}</td>
          </tr>)}
        </tbody>
      </table></div>

      <h2>Moderation history</h2>
      <div className="scroll"><table>
        <thead><tr><th>When</th><th>Plot</th><th>Action</th><th>By</th><th>Reason / note</th></tr></thead>
        <tbody>
          {history.length === 0 && <tr><td colSpan={5} className="meta">No actions yet.</td></tr>}
          {history.map(h => <tr key={h.id}><td>{when(h.at)}</td><td>{h.plot ?? '—'}</td><td>{h.action}</td><td>{h.actor}</td><td>{h.reason ?? ''}</td></tr>)}
        </tbody>
      </table></div>
    </div>
  )
}
