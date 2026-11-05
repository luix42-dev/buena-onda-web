'use client'

import { useEffect, useRef, useState } from 'react'
import { bufferedAhead, timelineSeconds, type HybridPlaybackSnapshot, type HybridSegment } from './contract'
import './hybrid.css'

export type HybridWorldPlayerProps = {
  segments?: readonly HybridSegment[]
  videoUrl?: string
  paused: boolean
  posterUrl?: string
  className?: string
  restartKey?: number
  /** Only enable with a separately verified last-to-first visual join. */
  loop?: boolean
  onReady?: (ready: boolean) => void
  onPlayback?: (snapshot: HybridPlaybackSnapshot) => void
}

/** Owns only two muted decoder slots. Never creates, pauses, or measures radio audio. */
export default function HybridWorldPlayer({ segments, videoUrl, paused, posterUrl, className = '', restartKey = 0, loop = false, onReady, onPlayback }: HybridWorldPlayerProps) {
  const elements = useRef<[HTMLVideoElement | null, HTMLVideoElement | null]>([null, null])
  const controls = useRef({ paused, onReady, onPlayback })
  controls.current = { paused, onReady, onPlayback }
  const playCurrent = useRef<(() => void) | null>(null)
  const [slot, setSlot] = useState(0)
  const [status, setStatus] = useState<HybridPlaybackSnapshot['status']>('unavailable')
  const [message, setMessage] = useState('Authored world plates are not available yet.')
  const sourceKey = JSON.stringify(segments ?? (videoUrl ? [{ id: 'plate', url: videoUrl, durationSeconds: 0, fps: 30, content: 'diagnosticReference', provenance: 'URL supplied to experiment; authorship unverified.' }] : []))

  useEffect(() => {
    const sources: HybridSegment[] = JSON.parse(sourceKey)
    // React clears DOM refs before passive unmount cleanup. Retain these exact owned
    // elements so switching approaches still pauses and releases both decoder slots.
    const videos: [HTMLVideoElement | null, HTMLVideoElement | null] = [...elements.current]
    let alive = true, active = 0, index = 0, switching = false, finished = false, failed = false, raf = 0, transitions = 0
    let firstFrameMs: number | null = null, gap: number | null = null, lastReport = 0
    const start = performance.now()
    const cleanups: (() => void)[] = []
    const frameRequests: [HTMLVideoElement, number][] = []
    const emit = (nextStatus: HybridPlaybackSnapshot['status'], text?: string) => {
      if (!alive) return
      setStatus(nextStatus)
      setMessage(text ?? '')
      const v = videos[active], q = v?.getVideoPlaybackQuality()
      controls.current.onPlayback?.({ status: nextStatus, segmentId: sources[index]?.id ?? null, segmentIndex: index,
        mediaSeconds: v?.currentTime ?? 0, timelineSeconds: timelineSeconds(sources, index, v?.currentTime ?? 0),
        presentedFrames: q ? Math.max(0, q.totalVideoFrames - q.droppedVideoFrames) : 0, droppedFrames: q?.droppedVideoFrames ?? 0,
        bufferedAheadSeconds: v ? bufferedAhead(v) : 0, transitions, lastTransitionGapMs: gap, firstFrameMs, message: text })
    }
    const listen = (v: HTMLVideoElement, name: string, fn: () => void) => {
      v.addEventListener(name, fn); cleanups.push(() => v.removeEventListener(name, fn))
    }
    const firstFrame = (v: HTMLVideoElement, callback: () => void) => {
      if (v.requestVideoFrameCallback) {
        const handle = v.requestVideoFrameCallback(() => { if (alive) callback() })
        frameRequests.push([v, handle])
      } else {
        // readyState is only a decoder fallback; no frame-accurate claim on this browser.
        const ready = () => { if (v.readyState >= 2 && alive) callback() }
        if (v.readyState >= 2) ready(); else listen(v, 'loadeddata', ready)
      }
    }
    const load = (which: number, sourceIndex: number) => {
      const v = videos[which], source = sources[sourceIndex]
      if (!v || !source) return
      v.pause(); v.muted = true; v.loop = false; v.src = source.url; v.load()
    }
    const fail = (text: string) => { failed = true; videos.forEach(v => v?.pause()); controls.current.onReady?.(false); emit('error', text) }
    const play = () => {
      const v = videos[active]
      if (!v || finished || switching || document.hidden || controls.current.paused) return
      failed = false
      void v.play().then(() => { if (alive && !controls.current.paused) emit('playing') }).catch(() => fail('Playback needs a user gesture. Resume the drive to retry.'))
    }
    playCurrent.current = () => {
      if (controls.current.paused || document.hidden) { videos.forEach(v => v?.pause()); if (!finished) emit('paused') }
      else play()
    }
    const next = () => {
      if (switching || finished || !alive) return
      if (index + 1 >= sources.length && !loop) { finished = true; emit('ended'); return }
      switching = true
      const switchStart = performance.now(), targetSlot = 1 - active, targetIndex = (index + 1) % sources.length
      const v = videos[targetSlot]
      if (!v) return
      emit('buffering', 'Preparing the next decoded segment.')
      let revealed = false
      const reveal = () => {
        if (!alive || revealed) return
        revealed = true
        videos[active]?.pause(); active = targetSlot; index = targetIndex; transitions++; gap = performance.now() - switchStart
        switching = false; setSlot(active)
        // Do not loop arbitrary footage. The next slot starts only after a presented frame.
        const afterIndex = (index + 1) % sources.length
        if (sources.length > 1 && (index + 1 < sources.length || loop)) load(1 - active, afterIndex)
        if (controls.current.paused || document.hidden) { v.pause(); emit('paused') } else emit('playing')
      }
      firstFrame(v, reveal)
      // Muted inline media only. Starting hidden slot primes the decoder without radio coupling.
      if (!controls.current.paused && !document.hidden) void v.play().catch(() => fail('The next segment could not play. Resume to retry.'))
      else if (v.readyState >= 2) reveal()
    }
    setSlot(0); controls.current.onReady?.(false)
    if (!sources.length) { emit('unavailable', 'Authored world plates are not available yet.'); return () => { alive = false } }
    emit('loading', 'Loading world footage.')
    for (const v of videos) {
      if (!v) continue
      listen(v, 'error', () => fail('World footage could not load. The independent radio can remain available.'))
      listen(v, 'ended', () => { if (v === videos[active]) next() })
      listen(v, 'waiting', () => { if (v === videos[active] && !controls.current.paused) emit('buffering') })
      listen(v, 'playing', () => { if (v === videos[active] && !switching) emit('playing') })
    }
    const initial = videos[0]
    if (initial) {
      listen(initial, 'loadedmetadata', () => { if (!sources[0].durationSeconds) sources[0].durationSeconds = initial.duration })
      listen(initial, 'loadeddata', () => {
        if (firstFrameMs !== null) return
        // First decodable frame readiness, separately from frame presentation metrics.
        firstFrameMs = performance.now() - start; controls.current.onReady?.(true)
        emit(controls.current.paused ? 'paused' : 'loading'); play()
      })
      load(0, 0)
      if (sources.length > 1) load(1, 1)
    }
    const visibility = () => playCurrent.current?.()
    document.addEventListener('visibilitychange', visibility)
    const tick = (now: number) => {
      if (!alive) return
      if (now - lastReport >= 250) {
        lastReport = now
        const v = videos[active]
        if (!switching && !finished && !failed && v && v.readyState >= 2) {
          // Preserve browser clock; do not invent route progression during waiting or pause.
          emit(controls.current.paused || document.hidden ? 'paused' : v.paused ? 'buffering' : 'playing')
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      alive = false; cancelAnimationFrame(raf); cleanups.forEach(fn => fn())
      frameRequests.forEach(([v, id]) => v.cancelVideoFrameCallback?.(id))
      document.removeEventListener('visibilitychange', visibility); playCurrent.current = null
      videos.forEach(v => { if (v) { v.pause(); v.removeAttribute('src'); v.load() } })
    }
  }, [sourceKey, restartKey, loop])

  useEffect(() => { playCurrent.current?.() }, [paused])
  return <div className={`world-hybrid ${className}`} data-hybrid-status={status} data-hybrid-slot={slot}>
    {[0, 1].map(i => <video key={i} ref={v => { elements.current[i] = v }} className={slot === i ? 'world-hybrid-video visible' : 'world-hybrid-video'} muted playsInline preload="auto" poster={posterUrl} aria-label="Muted world footage" />)}
    {message && <div className="world-hybrid-message" role={status === 'error' ? 'alert' : 'status'}>{message}</div>}
  </div>
}

export type { HybridSegment, HybridPlaybackSnapshot } from './contract'
