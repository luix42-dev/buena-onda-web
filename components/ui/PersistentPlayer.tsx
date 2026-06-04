'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Track } from '@/lib/radio'

function fmt(s: number) {
  if (!s || Number.isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2, '0')}`
}

function trackLabel(track: Track | null) {
  if (!track) return 'Signal warming up'
  return track.artist ? `${track.artist} - ${track.title}` : track.title
}

const XFADE_SECS = 3

export default function PersistentPlayer() {
  const audioRefA = useRef<HTMLAudioElement>(null)
  const audioRefB = useRef<HTMLAudioElement>(null)
  // Which slot is the currently-playing audio ('a' or 'b')
  const slotRef = useRef<'a' | 'b'>('a')
  const xfadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const xfadingRef = useRef(false)
  // Set to true by the crossfade when it completes, so the trackIdx effect
  // knows not to reload the src (the incoming audio is already playing).
  const xfadeCompletedRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  const [tracks, setTracks] = useState<Track[]>([])
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [deckOpen, setDeckOpen] = useState(false)

  const getActive = useCallback(
    () => (slotRef.current === 'a' ? audioRefA.current : audioRefB.current),
    [],
  )
  const getInactive = useCallback(
    () => (slotRef.current === 'a' ? audioRefB.current : audioRefA.current),
    [],
  )

  useEffect(() => {
    fetch('/api/radio/tracks')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTracks(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => { if (window.scrollY > 100) setDeckOpen(false) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const track: Track | null = tracks[trackIdx] ?? null
  const hasTrack = Boolean(track)

  const stopXfade = useCallback(() => {
    if (xfadeTimerRef.current !== null) {
      clearInterval(xfadeTimerRef.current)
      xfadeTimerRef.current = null
    }
    xfadingRef.current = false
    const inact = getInactive()
    if (inact) { inact.pause(); inact.volume = 1; inact.src = '' }
    const act = getActive()
    if (act) act.volume = 1
  }, [getActive, getInactive])

  const thunk = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = audioContextRef.current ?? new AudioCtx()
      audioContextRef.current = ctx
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = 'square'
      osc.frequency.setValueAtTime(115, now)
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.055)
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(720, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.085)
    } catch {}
  }, [])

  const play = useCallback(async () => {
    const audio = getActive()
    if (!audio || !track) return
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }, [getActive, track])

  const pause = useCallback(() => {
    stopXfade()
    getActive()?.pause()
    setPlaying(false)
  }, [getActive, stopXfade])

  const toggle = useCallback(() => {
    thunk()
    if (playing) pause()
    else void play()
  }, [pause, play, playing, thunk])

  const prev = useCallback(() => {
    thunk()
    stopXfade()
    setTrackIdx(i => (tracks.length > 0 ? (i - 1 + tracks.length) % tracks.length : 0))
  }, [tracks.length, thunk, stopXfade])

  const next = useCallback(() => {
    thunk()
    stopXfade()
    setTrackIdx(i => (tracks.length > 0 ? (i + 1) % tracks.length : 0))
  }, [tracks.length, thunk, stopXfade])

  // Attach playback-state event listeners to both audio elements
  useEffect(() => {
    const audioA = audioRefA.current
    const audioB = audioRefB.current
    if (!audioA || !audioB) return

    const onTimeA = () => { if (slotRef.current === 'a') setCurrentTime(audioA.currentTime) }
    const onTimeB = () => { if (slotRef.current === 'b') setCurrentTime(audioB.currentTime) }
    const onMetaA = () => { if (slotRef.current === 'a') setDuration(audioA.duration) }
    const onMetaB = () => { if (slotRef.current === 'b') setDuration(audioB.duration) }
    const onEndA = () => {
      if (slotRef.current !== 'a' || xfadingRef.current) return
      setTrackIdx(i => (tracks.length > 0 ? (i + 1) % tracks.length : 0))
    }
    const onEndB = () => {
      if (slotRef.current !== 'b' || xfadingRef.current) return
      setTrackIdx(i => (tracks.length > 0 ? (i + 1) % tracks.length : 0))
    }
    const onPauseA = () => { if (slotRef.current === 'a') setPlaying(false) }
    const onPauseB = () => { if (slotRef.current === 'b') setPlaying(false) }
    const onPlayA  = () => { if (slotRef.current === 'a') setPlaying(true) }
    const onPlayB  = () => { if (slotRef.current === 'b') setPlaying(true) }

    audioA.addEventListener('timeupdate', onTimeA)
    audioA.addEventListener('loadedmetadata', onMetaA)
    audioA.addEventListener('ended', onEndA)
    audioA.addEventListener('pause', onPauseA)
    audioA.addEventListener('play', onPlayA)
    audioB.addEventListener('timeupdate', onTimeB)
    audioB.addEventListener('loadedmetadata', onMetaB)
    audioB.addEventListener('ended', onEndB)
    audioB.addEventListener('pause', onPauseB)
    audioB.addEventListener('play', onPlayB)

    return () => {
      audioA.removeEventListener('timeupdate', onTimeA)
      audioA.removeEventListener('loadedmetadata', onMetaA)
      audioA.removeEventListener('ended', onEndA)
      audioA.removeEventListener('pause', onPauseA)
      audioA.removeEventListener('play', onPlayA)
      audioB.removeEventListener('timeupdate', onTimeB)
      audioB.removeEventListener('loadedmetadata', onMetaB)
      audioB.removeEventListener('ended', onEndB)
      audioB.removeEventListener('pause', onPauseB)
      audioB.removeEventListener('play', onPlayB)
    }
  }, [tracks.length])

  // Crossfade — re-registers whenever tracks list or current track index changes
  // so that the closure captures the correct nextIdx/nextSrc.
  useEffect(() => {
    const audioA = audioRefA.current
    const audioB = audioRefB.current
    if (!audioA || !audioB || tracks.length <= 1) return

    function tryStartXfade(el: HTMLAudioElement, elSlot: 'a' | 'b') {
      if (slotRef.current !== elSlot || xfadingRef.current) return
      const remaining = el.duration - el.currentTime
      if (!el.duration || remaining > XFADE_SECS || remaining <= 0) return

      xfadingRef.current = true
      const nextIdx = (trackIdx + 1) % tracks.length
      const nextSrc = tracks[nextIdx]?.src
      if (!nextSrc) { xfadingRef.current = false; return }

      const inact = elSlot === 'a' ? audioB : audioA
      if (!inact) { xfadingRef.current = false; return }
      inact.src = nextSrc
      inact.volume = 0
      inact.play().catch(() => { xfadingRef.current = false })

      const totalSteps = Math.round((XFADE_SECS * 1000) / 50)
      let step = 0
      xfadeTimerRef.current = setInterval(() => {
        step++
        const p = step / totalSteps
        el.volume = Math.max(0, 1 - p)
        if (inact) inact.volume = Math.min(1, p)
        if (step >= totalSteps) {
          clearInterval(xfadeTimerRef.current!)
          xfadeTimerRef.current = null
          el.pause()
          el.volume = 1
          if (inact) inact.volume = 1
          slotRef.current = elSlot === 'a' ? 'b' : 'a'
          xfadingRef.current = false
          xfadeCompletedRef.current = true
          setTrackIdx(nextIdx)
        }
      }, 50)
    }

    const onTimeA = () => tryStartXfade(audioA, 'a')
    const onTimeB = () => tryStartXfade(audioB, 'b')
    audioA.addEventListener('timeupdate', onTimeA)
    audioB.addEventListener('timeupdate', onTimeB)
    return () => {
      audioA.removeEventListener('timeupdate', onTimeA)
      audioB.removeEventListener('timeupdate', onTimeB)
    }
  }, [tracks, trackIdx])

  // Load new track src and optionally start playback when trackIdx changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const act = getActive()
    if (!act) return

    if (xfadeCompletedRef.current) {
      // The crossfade already loaded and started the incoming audio.
      // Just sync the displayed time/duration from the live element.
      xfadeCompletedRef.current = false
      setCurrentTime(act.currentTime)
      setDuration(Number.isFinite(act.duration) ? act.duration : 0)
      return
    }

    setCurrentTime(0)
    setDuration(0)
    if (!track) return
    act.src = track.src
    if (playing) void play()
  // tracks is included so this fires on initial track load (trackIdx stays 0).
  // play/playing/track are read from the same render that changed trackIdx/tracks.
  }, [trackIdx, tracks]) // eslint-disable-line react-hooks/exhaustive-deps

  const progress = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const label = trackLabel(track)

  return (
    <>
      <audio ref={audioRefA} preload="metadata" />
      <audio ref={audioRefB} preload="metadata" />

      {/* Floating panel — exact ed04d2c design, sits above the bar */}
      <section className={`bo-panel ${deckOpen ? 'bo-panel-open' : ''}`} aria-label="Buena Onda Radio expanded player">
        <div className="bo-deck-top">
          <span>BUENA ONDA RADIO</span>
          <button type="button" onClick={() => { thunk(); setDeckOpen(false) }} aria-label="Collapse panel">▾</button>
        </div>

        <div className="bo-deck-body">
          <div className="bo-transport" aria-label="Radio transport controls">
            <button type="button" className="bo-key" onClick={prev} disabled={!hasTrack} aria-label="Previous track">
              &#9668;&#9668;
            </button>
            <button type="button" className="bo-key bo-key-play" onClick={toggle} disabled={!hasTrack} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? 'II' : 'PLAY'}
            </button>
            <button type="button" className="bo-key" onClick={next} disabled={!hasTrack} aria-label="Next track">
              &#9658;&#9658;
            </button>
          </div>

          <div className={`bo-readout ${playing ? 'bo-readout-playing' : ''}`}>
            <div className="bo-progress" style={{ width: `${progress}%` }} />
            <div className="bo-now">NOW PLAYING</div>
            <div className="bo-track-window">
              <span>{label} &nbsp; / &nbsp; {label}</span>
            </div>
            <div className="bo-readout-foot">
              <span>{hasTrack ? `${fmt(currentTime)} / ${fmt(duration)}` : '0:00 / 0:00'}</span>
              <div className="bo-vu" aria-hidden="true">
                {Array.from({ length: 10 }).map((_, index) => (
                  <i key={index} style={{ animationDelay: `${index * 70}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-width bar — always visible */}
      <section className={`bo-tape-deck bo-tape-deck-open ${playing ? 'bo-readout-playing' : ''}`} aria-label="Buena Onda Radio player">
        <div className="bo-progress-bar" style={{ width: `${progress}%` }} />
        <div className="bo-bar">
          <span className="bo-bar-brand">BUENA ONDA RADIO</span>
          <div className="bo-bar-transport" aria-label="Radio transport controls">
            <button type="button" className="bo-bar-key" onClick={prev} disabled={!hasTrack} aria-label="Previous track">&#9668;&#9668;</button>
            <button type="button" className="bo-bar-key bo-bar-key-play" onClick={toggle} disabled={!hasTrack} aria-label={playing ? 'Pause' : 'Play'}>{playing ? 'II' : 'PLAY'}</button>
            <button type="button" className="bo-bar-key" onClick={next} disabled={!hasTrack} aria-label="Next track">&#9658;&#9658;</button>
          </div>
          <div className="bo-bar-track">
            <span>{label} &nbsp; / &nbsp; {label}</span>
          </div>
          <span className="bo-bar-time">{hasTrack ? `${fmt(currentTime)} / ${fmt(duration)}` : '0:00 / 0:00'}</span>
          <div className="bo-bar-vu" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <i key={index} style={{ animationDelay: `${index * 70}ms` }} />
            ))}
          </div>
          <button
            type="button"
            className="bo-toggle-btn"
            onClick={() => { thunk(); setDeckOpen(v => !v) }}
            aria-label={deckOpen ? 'Collapse panel' : 'Expand panel'}
          >
            {deckOpen ? '↓' : '↑'}
          </button>
        </div>
      </section>

      <style suppressHydrationWarning>{`
        /* ── Floating panel (ed04d2c design) ─────────────────── */
        .bo-panel {
          position: fixed;
          left: 18px;
          bottom: 58px;
          z-index: 61;
          width: min(680px, calc(100vw - 36px));
          background: #2F2F2D;
          color: #F8F7F3;
          border: 1px solid #0F6E6E;
          border-top: 5px solid #1A9E9E;
          box-shadow: 0 24px 70px rgba(47,47,45,0.42);
          transform: translateY(calc(100% + 80px));
          opacity: 0;
          pointer-events: none;
          transition: transform 360ms ease, opacity 220ms ease;
          overflow: hidden;
        }
        .bo-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.18;
          background: repeating-linear-gradient(
            to bottom,
            rgba(248,247,243,0.12) 0,
            rgba(248,247,243,0.12) 1px,
            transparent 1px,
            transparent 5px
          );
        }
        .bo-panel-open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        .bo-deck-top {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-height: 40px;
          padding: 0 14px;
          border-bottom: 1px solid rgba(26,158,158,0.45);
          font-family: var(--font-sans);
          color: #1A9E9E;
          font-size: 0.68rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .bo-deck-top button {
          color: #E8176A;
          font-size: 1rem;
          line-height: 1;
        }
        .bo-deck-body {
          position: relative;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 18px;
          align-items: stretch;
          padding: 18px;
        }
        .bo-transport {
          display: flex;
          align-items: stretch;
          gap: 8px;
        }
        .bo-key {
          min-width: 66px;
          min-height: 70px;
          padding: 0 12px;
          background: #F8F7F3;
          color: #2F2F2D;
          border: 1px solid #2F2F2D;
          border-bottom: 8px solid #0F6E6E;
          font-family: var(--font-sans);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          transition: transform 80ms ease, border-bottom-width 80ms ease;
        }
        .bo-key-play {
          min-width: 82px;
          background: #1A9E9E;
          color: #F8F7F3;
          border-bottom-color: #0F6E6E;
        }
        .bo-key:active {
          transform: translateY(2px);
          border-bottom-width: 3px;
        }
        .bo-key:disabled {
          opacity: 0.45;
          cursor: default;
        }
        .bo-readout {
          position: relative;
          min-width: 0;
          overflow: hidden;
          background: #0F6E6E;
          border: 1px solid #1A9E9E;
          padding: 13px 14px 10px;
        }
        .bo-progress {
          position: absolute;
          left: 0;
          top: 0;
          height: 2px;
          background: #E8176A;
          transition: width 180ms linear;
        }
        .bo-now {
          color: #E8176A;
          font-family: var(--font-sans);
          font-size: 0.58rem;
          letter-spacing: 0.18em;
          line-height: 1;
          margin-bottom: 10px;
        }
        .bo-track-window {
          overflow: hidden;
          white-space: nowrap;
          color: #08CCFC;
          font-family: var(--font-display);
          font-size: 1.18rem;
          letter-spacing: 0;
          line-height: 1.1;
        }
        .bo-track-window span {
          display: inline-block;
          min-width: 100%;
        }
        .bo-readout-playing .bo-track-window span {
          animation: boMarquee 16s linear infinite;
        }
        .bo-readout-foot {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-top: 12px;
          color: #F8F7F3;
          font-family: var(--font-sans);
          font-size: 0.58rem;
          letter-spacing: 0.1em;
        }
        .bo-vu {
          display: flex;
          align-items: end;
          gap: 3px;
          height: 18px;
        }
        .bo-vu i {
          display: block;
          width: 4px;
          height: 100%;
          transform-origin: bottom;
          transform: scaleY(0.25);
          background: #C46D63;
        }
        .bo-readout-playing .bo-vu i {
          animation: boVu 620ms ease-in-out infinite;
        }

        /* ── Full-width bar ──────────────────────────────────── */
        .bo-tape-deck {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 60;
          height: 48px;
          background: #2F2F2D;
          color: #F8F7F3;
          border-top: 2px solid #1A9E9E;
          box-shadow: 0 -4px 24px rgba(47,47,45,0.42);
          transform: translateY(100%);
          opacity: 0;
          pointer-events: none;
          transition: transform 320ms ease, opacity 200ms ease;
          overflow: hidden;
        }
        .bo-tape-deck-open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        .bo-progress-bar {
          position: absolute;
          left: 0;
          top: 0;
          height: 2px;
          background: #E8176A;
          transition: width 180ms linear;
        }
        .bo-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          height: 100%;
          padding: 0 12px;
          font-family: var(--font-sans);
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .bo-bar-brand {
          color: #1A9E9E;
          white-space: nowrap;
          letter-spacing: 0.18em;
        }
        .bo-bar-transport {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .bo-bar-key {
          height: 30px;
          min-width: 38px;
          padding: 0 8px;
          background: #F8F7F3;
          color: #2F2F2D;
          border: 1px solid #2F2F2D;
          border-bottom: 3px solid #0F6E6E;
          font-family: var(--font-sans);
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          transition: transform 80ms ease, border-bottom-width 80ms ease;
        }
        .bo-bar-key-play {
          min-width: 46px;
          background: #1A9E9E;
          color: #F8F7F3;
          border-bottom-color: #0F6E6E;
        }
        .bo-bar-key:active {
          transform: translateY(1px);
          border-bottom-width: 1px;
        }
        .bo-bar-key:disabled {
          opacity: 0.45;
          cursor: default;
        }
        .bo-bar-track {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          color: #08CCFC;
          font-family: var(--font-sans);
          font-size: 0.68rem;
          letter-spacing: 0.1em;
        }
        .bo-bar-track span {
          display: inline-block;
          min-width: 100%;
        }
        .bo-readout-playing .bo-bar-track span {
          animation: boMarquee 16s linear infinite;
        }
        .bo-bar-time {
          color: #F8F7F3;
          white-space: nowrap;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          flex-shrink: 0;
        }
        .bo-bar-vu {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 14px;
          flex-shrink: 0;
        }
        .bo-bar-vu i {
          display: block;
          width: 3px;
          height: 100%;
          transform-origin: bottom;
          transform: scaleY(0.25);
          background: #C46D63;
        }
        .bo-readout-playing .bo-bar-vu i {
          animation: boVu 620ms ease-in-out infinite;
        }
        .bo-toggle-btn {
          color: #1A9E9E;
          font-size: 1rem;
          line-height: 1;
          flex-shrink: 0;
          padding: 0 4px;
        }

        /* ── Keyframes ───────────────────────────────────────── */
        @keyframes boPulse {
          0%   { box-shadow: 0 0 0 0 rgba(232,23,106,0.55); }
          100% { box-shadow: 0 0 0 10px rgba(232,23,106,0); }
        }
        @keyframes boMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes boVu {
          0%, 100% { transform: scaleY(0.25); }
          50%      { transform: scaleY(1); }
        }

        /* ── Mobile ──────────────────────────────────────────── */
        @media (max-width: 480px) {
          .bo-bar-brand { display: none; }
          .bo-bar-time  { display: none; }
          .bo-bar-vu    { display: none; }
        }
        @media (max-width: 640px) {
          .bo-panel {
            left: 10px;
            right: 10px;
            bottom: 58px;
            width: auto;
          }
          .bo-deck-body {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 12px;
          }
          .bo-transport {
            order: 2;
            display: grid;
            grid-template-columns: 1fr 1.25fr 1fr;
          }
          .bo-key {
            min-width: 0;
            min-height: 54px;
          }
          .bo-readout {
            order: 1;
          }
          .bo-track-window {
            font-size: 0.96rem;
          }
        }
      `}</style>
    </>
  )
}
