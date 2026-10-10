'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { FLOOR_CENTS, KIND_LABEL, SEED_PLOTS, dollars, priceCents, type Plot, type PlotEvent } from './plots'

/** Live plots from the API; the seed keeps the street complete offline or before the table exists. */
export function useAvenue() {
  const [plots, setPlots] = useState<Plot[]>(SEED_PLOTS)
  const [events, setEvents] = useState<PlotEvent[]>([])
  const [live, setLive] = useState(false)
  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/cruise/plots', { cache: 'no-store' }); if (!r.ok) throw new Error(String(r.status))
      const data = await r.json() as { plots: Plot[]; events: PlotEvent[]; live: boolean }
      setPlots(data.plots); setEvents(data.events); setLive(data.live)
    } catch { setLive(false) }
  }, [])
  useEffect(() => { void refresh(); const id = setInterval(refresh, 60_000); return () => clearInterval(id) }, [refresh])
  return { plots, events, live, refresh }
}

/**
 * Drive-bys: a plot counts once per run when the car moves through its approach window
 * (60 m → 5 m before it) while driving with the tab visible. Batched with sendBeacon.
 * These are drive-bys, not verified human-readable impressions.
 */
export function useDriveBys(plots: Plot[], drive: MutableRefObject<{ distance: number; paused: boolean }>, enabled: boolean, oncePerSession = false) {
  const seen = useRef(new Set<number>()), queue = useRef<number[]>([]), lastDistance = useRef(0)
  useEffect(() => {
    if (!enabled) return
    const flush = () => {
      if (!queue.current.length) return
      const body = JSON.stringify({ plots: queue.current.splice(0) })
      if (!navigator.sendBeacon?.('/api/cruise/plots/visit', new Blob([body], { type: 'application/json' }))) void fetch('/api/cruise/plots/visit', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => null)
    }
    const tick = setInterval(() => {
      const d = drive.current
      if (d.distance < lastDistance.current - 20 && !oncePerSession) seen.current.clear() // new run (unattended loops never reset)
      lastDistance.current = d.distance
      if (d.paused || document.hidden) return
      for (const p of plots) { const ahead = p.s - d.distance; if (ahead > 5 && ahead < 60 && !seen.current.has(p.number)) { seen.current.add(p.number); queue.current.push(p.number) } }
    }, 500)
    const send = setInterval(flush, 15_000); const hide = () => { if (document.hidden) flush() }
    document.addEventListener('visibilitychange', hide)
    return () => { clearInterval(tick); clearInterval(send); document.removeEventListener('visibilitychange', hide); flush() }
  }, [plots, drive, enabled, oncePerSession])
}

export function AvenueTicker({ plots, events }: { plots: Plot[]; events: PlotEvent[] }) {
  const items = useMemo(() => {
    const real = events.slice(0, 8).map(e => `PLOT #${e.plot} ${e.type === 'bought_out' ? 'CHANGED HANDS' : 'CLAIMED'} · ${e.name.toUpperCase()} · ${dollars(e.cents)}`)
    const open = plots.filter(p => p.status === 'open')
    const prompts = open.slice(0, 6).map(p => `PLOT #${p.number} · ${KIND_LABEL[p.kind].toUpperCase()} · OPEN · FROM ${dollars(priceCents(p)!)}`)
    return [...real, `${open.length} OF ${plots.length} PLOTS OPEN ON OCEAN DRIVE`, ...prompts]
  }, [plots, events])
  return <div className="av-ticker" aria-label="Avenue activity"><div className="av-ticker-track">{[...items, ...items].map((t, i) => <span key={i}>{t}</span>)}</div></div>
}

export function AvenueDrawer({ plots, live, onSelect, onClose }: { plots: Plot[]; live: boolean; onSelect: (n: number) => void; onClose: () => void }) {
  const ranked = [...plots].filter(p => p.status !== 'open').sort((a, b) => b.valueCents - a.valueCents || b.visits - a.visits)
  const open = plots.filter(p => p.status === 'open').sort((a, b) => FLOOR_CENTS[b.kind] - FLOOR_CENTS[a.kind] || a.number - b.number)
  const drives = plots.reduce((n, p) => n + p.visits, 0)
  return <aside className="av-drawer" aria-label="The Avenue">
    <header><div><small>THE AVENUE · OCEAN DRIVE</small><h2>Build it. Brand it. Defend it.</h2></div><button onClick={onClose} aria-label="Close the Avenue">×</button></header>
    <p className="av-lede">Every sign on the Cruise is a numbered plot. Claim an open one, put your name on the street, and keep it until someone pays more. {live ? `${drives.toLocaleString()} drive-bys counted.` : 'Live stats connect once the plots table is set up.'}</p>
    <h3>Open plots</h3>
    <ul className="av-list">{open.map(p => <li key={p.number}><button onClick={() => onSelect(p.number)}><b>#{p.number}</b><span>{KIND_LABEL[p.kind]}</span><em>from {dollars(priceCents(p)!)}</em></button></li>)}</ul>
    <h3>On the street</h3>
    <ul className="av-list">{ranked.map(p => <li key={p.number}><button onClick={() => onSelect(p.number)}><b>#{p.number}</b><span>{p.owner?.name}</span><em>{p.status === 'house' ? 'House' : dollars(p.valueCents)} · {p.visits.toLocaleString()} drive-bys</em></button></li>)}</ul>
  </aside>
}

export function PlotCard({ plot, onClose, onDrive, trade = true }: { plot: Plot; onClose: () => void; onDrive?: () => void; trade?: boolean }) {
  const [claiming, setClaiming] = useState(false)
  const price = trade ? priceCents(plot) : null
  return <div className="av-backdrop" onClick={onClose}><div className="av-card" role="dialog" aria-modal="true" aria-label={`Plot ${plot.number}`} onClick={e => e.stopPropagation()}
    onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
    <div className="av-card-top" style={{ background: plot.owner?.color ?? '#16122b' }}>
      <small>{trade ? `PLOT #${plot.number} · ${KIND_LABEL[plot.kind].toUpperCase()}` : 'ON OCEAN DRIVE'}</small>
      <h2>{plot.owner?.name ?? 'Open plot'}</h2>
      <p>{plot.owner?.tagline ?? 'Nobody owns this spot yet. Your name could ride with every cruise.'}</p>
    </div>
    {!claiming ? <div className="av-card-body">
      {trade && <dl><div><dt>Value</dt><dd>{plot.status === 'house' ? 'House' : plot.status === 'open' ? '—' : dollars(plot.valueCents)}</dd></div><div><dt>Drive-bys</dt><dd>{plot.visits.toLocaleString()}</dd></div><div><dt>{plot.status === 'claimed' ? 'Buyout' : 'Claim'}</dt><dd>{price === null ? 'Not for sale' : dollars(price)}</dd></div></dl>}
      <div className="av-actions">
        {plot.owner?.url && <a className="av-btn ghost" href={plot.owner.url} target="_blank" rel="noopener sponsored">Visit ↗</a>}
        {price !== null && <button className="av-btn" autoFocus onClick={() => setClaiming(true)}>{plot.status === 'claimed' ? `Buy out for ${dollars(price)}` : `Claim for ${dollars(price)}`}</button>}
        <button className="av-btn ghost" onClick={() => { onClose(); onDrive?.() }}>Back to the drive</button>
      </div>
      {trade && plot.status === 'claimed' && <p className="av-fine">Owners keep a plot until someone pays {Math.round((1.5 - 1) * 100)}% more. Defend it by holding the top bid.</p>}
    </div> : <ClaimForm plot={plot} price={price!} onCancel={() => setClaiming(false)} />}
  </div></div>
}

function ClaimForm({ plot, price, onCancel }: { plot: Plot; price: number; onCancel: () => void }) {
  const [state, setState] = useState<{ busy: boolean; error?: string }>({ busy: false })
  const [color, setColor] = useState(plot.owner?.color ?? '#ff4f9a')
  async function submit(form: FormData) {
    setState({ busy: true })
    try {
      const r = await fetch('/api/cruise/plots/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        plot: plot.number, expectedCents: price, email: form.get('email'),
        owner: { name: form.get('name'), tagline: form.get('tagline'), url: form.get('url'), color },
      }) })
      const data = await r.json().catch(() => ({})) as { checkoutUrl?: string; error?: string }
      if (r.ok && data.checkoutUrl) { location.href = data.checkoutUrl; return }
      setState({ busy: false, error: r.status === 503 ? 'Claims open soon. Payments are not switched on yet.' : r.status === 409 ? 'This plot just changed. Refresh to see the new price.' : data.error ?? 'Could not start checkout.' })
    } catch { setState({ busy: false, error: 'Network error. Try again.' }) }
  }
  return <form className="av-card-body av-form" onSubmit={e => { e.preventDefault(); void submit(new FormData(e.currentTarget)) }}>
    <label>Name on the sign<input name="name" required minLength={2} maxLength={32} placeholder="Your brand" /></label>
    <label>Tagline<input name="tagline" maxLength={48} placeholder="Short and loud" /></label>
    <label>Website (https)<input name="url" type="url" pattern="https://.*" maxLength={200} placeholder="https://" /></label>
    <label>Sign colour<input type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
    <label>Email for the receipt<input name="email" type="email" required /></label>
    <p className="av-fine">You pay {dollars(price)} once through Stripe. Your sign appears after payment clears and a quick content review.</p>
    {state.error && <p className="av-error" role="alert">{state.error}</p>}
    <div className="av-actions"><button type="button" className="av-btn ghost" onClick={onCancel}>Back</button><button className="av-btn" disabled={state.busy}>{state.busy ? 'Opening checkout…' : `Pay ${dollars(price)}`}</button></div>
  </form>
}
