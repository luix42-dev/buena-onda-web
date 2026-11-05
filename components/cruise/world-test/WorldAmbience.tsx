'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { NightAmbience } from '../nightdrive/NightAmbience'
import { useCockpit } from '../vehicle/CockpitContext'
import type { HybridPlaybackSnapshot } from './hybrid/contract'

// Authored station speed and its integral from world-first-1.0.0; not vehicle physics.
export function authoredMotion(seconds: number) {
  const time = Number.isFinite(seconds) ? Math.max(0, Math.min(60, seconds)) : 0
  let distance = 0, speed = 10
  for (const [start, end, from, to] of [[0, 10, 10, 12], [10, 40, 12, 12], [40, 50, 12, 14], [50, 60, 14, 10]]) {
    const duration = end - start, u = Math.max(0, Math.min(1, (time - start) / duration))
    distance += duration * (from * u + (to - from) * (u ** 3 - .5 * u ** 4))
    if (time >= start) speed = from + (to - from) * (3 * u * u - 2 * u ** 3)
  }
  return { speed, distance }
}

export function authoredSpeed(seconds: number) { return authoredMotion(seconds).speed }

export default function WorldAmbience({ playback, radioPlaying, radioMuted, authored }: {
  playback: HybridPlaybackSnapshot | null; radioPlaying: boolean; radioMuted: boolean; authored: boolean
}) {
  const cockpit = useCockpit()
  const musicPlaying = radioPlaying && !cockpit?.audio.loading
  const musicMuted = radioMuted || cockpit?.audio.volume === 0
  const ambience = useMemo(() => new NightAmbience(), [])
  const [on, setOn] = useState(false), [gain, setGain] = useState(.12), [error, setError] = useState('')
  const input = useRef({ playback, radioPlaying: musicPlaying, radioMuted: musicMuted, authored })
  const intent = useRef(false), revision = useRef(0), update = useRef(() => {})
  input.current = { playback, radioPlaying: musicPlaying, radioMuted: musicMuted, authored }

  useEffect(() => { ambience.setGain(gain) }, [ambience, gain])
  useEffect(() => {
    ambience.setEnabled(intent.current)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const tick = () => {
      const { playback: p, radioPlaying: playing, radioMuted: muted, authored: valid } = input.current
      const motion = valid && p ? authoredMotion(p.timelineSeconds) : { speed: 0, distance: 0 }
      ambience.update({ ...motion, moving: valid && p?.status === 'playing', visible: !document.hidden,
        musicPlaying: playing, musicMuted: muted, camera: 'driver', districtMix: 0,
        reduced: reduced.matches, traffic: [] })
      const snapshot = ambience.snapshot()
      document.documentElement.dataset.worldAmbience = JSON.stringify(snapshot)
      setError(snapshot.error || '')
    }
    update.current = tick
    tick()
    const timer = window.setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick)
    reduced.addEventListener('change', tick)
    return () => {
      revision.current++
      update.current = () => {}
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      reduced.removeEventListener('change', tick)
      ambience.dispose()
      delete document.documentElement.dataset.worldAmbience
    }
  }, [ambience])
  // Lifecycle transitions silence the graph without waiting for the low-rate parameter poll.
  useEffect(() => { update.current() }, [playback, musicPlaying, musicMuted, authored])

  const toggle = () => {
    const next = !intent.current, token = ++revision.current
    intent.current = next
    setOn(next)
    ambience.setEnabled(false)
    update.current()
    if (!next) return
    // Create/resume synchronously in this gesture. Rapid Off/unmount invalidates completion.
    void ambience.unlock().then(() => {
      if (token !== revision.current) return
      const fault = ambience.snapshot().error
      if (fault) { intent.current = false; setOn(false); setError(fault); return }
      ambience.setEnabled(true)
      update.current()
    }).catch(() => {
      if (token !== revision.current) return
      intent.current = false
      setOn(false)
      ambience.setEnabled(false)
      setError('Ambience unavailable; the radio remains independent.')
    })
  }

  return <div className="world-ambience">
    <button onClick={toggle} aria-pressed={on} aria-label="Toggle driving ambience">Ambience {on ? 'On' : 'Off'}</button>
    <label>Level<input aria-label="Ambience volume" type="range" min={0} max={.4} step={.01} value={gain} onChange={e => setGain(Number(e.target.value))} /></label>
    {error && <span role="status">{error}</span>}
    <small>Subtle synthesized audition · independent of radio</small>
  </div>
}
