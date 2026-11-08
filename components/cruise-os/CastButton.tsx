'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Cast } from 'lucide-react'
import ScreenMirrorHelp from '@/components/experience/ScreenMirrorHelp'
import { liveCastSupported, observeLiveCast, prepareLiveCast, readLiveCast, startLiveCast, stopLiveCast } from '@/lib/cruise/live-cast'

/** One tap opens Google's TV picker and shares the drive already on this device. */
export default function CastButton() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(readLiveCast)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => observeLiveCast(setState), [])
  useEffect(() => {
    const warning = (event: Event) => setError((event as CustomEvent<{ message: string }>).detail.message)
    window.addEventListener('cruise:mirror-audio-warning', warning)
    return () => window.removeEventListener('cruise:mirror-audio-warning', warning)
  }, [])
  useEffect(() => {
    let mounted = true
    if (liveCastSupported()) void prepareLiveCast().then(value => { if (mounted) setReady(value) })
      .catch(() => { if (mounted) setError('Could not connect to Google Cast. Refresh and try again.') })
    return () => { mounted = false }
  }, [])
  const connected = state.phase === 'playing', connecting = state.phase === 'connecting'
  const label = connected ? `Stop casting to ${state.device}` : connecting ? 'Cancel connecting to TV' : 'Cast Cruise to your TV'
  const message = error || state.error
  const cast = () => {
    setError('')
    if (connected || connecting) { stopLiveCast(); return }
    if (!liveCastSupported()) { setOpen(true); return }
    if (!ready) { setError('Cast is getting ready. Try again in a moment.'); return }
    void startLiveCast().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not connect to your TV.'))
  }
  return <>
    <button type="button" className="dd-icon" aria-label={label} title={label}
      aria-pressed={connected} data-cast-state={state.phase} onClick={cast}
      style={connected ? { color: '#dfb37c' } : undefined}><Cast size={20} /></button>
    <ScreenMirrorHelp open={open} onClose={() => setOpen(false)} />
    {message && typeof document !== 'undefined' && createPortal(<div role="alert"
      style={{ position: 'fixed', zIndex: 10000, bottom: 28, left: '50%', transform: 'translateX(-50%)', width: 'min(90vw, 440px)', padding: '16px 20px', borderRadius: 12, background: '#122329', color: '#f1e6d2', font: '14px/1.5 system-ui', boxShadow: '0 8px 40px #0008', pointerEvents: 'auto' }}>
      {message}<button type="button" aria-label="Dismiss cast message" onClick={() => { setError(''); if (state.phase === 'error') stopLiveCast() }}
        style={{ marginLeft: 12, background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}>Close</button>
    </div>, document.body)}
  </>
}
