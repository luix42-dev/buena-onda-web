'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Cast } from 'lucide-react'
import ScreenMirrorHelp from '@/components/experience/ScreenMirrorHelp'
import { attachCast, castDeviceName, castSupported, disconnectCast, loadCastSdk, requestCast, type CastConnectionState } from '@/lib/cruise/google-cast'
import { readCastSource } from '@/lib/cruise/cast-source'

/** Google's picker launches an independent TV player; this device becomes its remote. */
export default function CastButton() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<CastConnectionState>('disconnected')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const warning = (event: Event) => setError((event as CustomEvent<string>).detail)
    window.addEventListener('cruise:cast-error', warning)
    return () => window.removeEventListener('cruise:cast-error', warning)
  }, [])
  useEffect(() => {
    let mounted = true
    let cleanup: (() => void) | undefined
    if (castSupported()) void loadCastSdk().then(() => {
      if (!mounted) return
      cleanup = attachCast(() => {}, () => {}, setState)
      setReady(true)
    })
      .catch(() => { if (mounted) setError('Could not connect to Google Cast. Refresh and try again.') })
    // Leaving the page detaches the remote. Only the Stop button ends TV playback.
    return () => { mounted = false; cleanup?.() }
  }, [])
  useEffect(() => {
    if (state !== 'connecting') return
    const timer = setTimeout(() => {
      setError('The TV could not start Cruise. Please try connecting again.')
      disconnectCast()
    }, 120000)
    return () => clearTimeout(timer)
  }, [state])
  const connected = state === 'connected', connecting = state === 'connecting'
  const label = connected ? `Stop casting to ${castDeviceName()}` : connecting ? 'Cancel connecting to TV' : 'Cast Cruise to your TV'
  const message = error
  const cast = () => {
    setError('')
    if (connected || connecting) { disconnectCast(); return }
    if (!castSupported()) { setOpen(true); return }
    if (!ready) { setError('Cast is getting ready. Try again in a moment.'); return }
    const source = readCastSource()
    if (!source) { setError('Your drive is still getting ready. Try again in a moment.'); return }
    void requestCast(source.command, source.playlist).catch(reason => {
      setError(reason instanceof Error ? reason.message : 'Could not connect to your TV.')
      disconnectCast()
    })
  }
  return <>
    <button type="button" className="dd-icon" aria-label={label} title={label}
      aria-pressed={connected} data-cast-state={state} onClick={cast}
      style={connected ? { color: '#dfb37c' } : undefined}><Cast size={20} /></button>
    <ScreenMirrorHelp open={open} onClose={() => setOpen(false)} />
    {message && typeof document !== 'undefined' && createPortal(<div role="alert"
      style={{ position: 'fixed', zIndex: 10000, bottom: 28, left: '50%', transform: 'translateX(-50%)', width: 'min(90vw, 440px)', padding: '16px 20px', borderRadius: 12, background: '#122329', color: '#f1e6d2', font: '14px/1.5 system-ui', boxShadow: '0 8px 40px #0008', pointerEvents: 'auto' }}>
      {message}<button type="button" aria-label="Dismiss cast message" onClick={() => setError('')}
        style={{ marginLeft: 12, background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}>Close</button>
    </div>, document.body)}
  </>
}
