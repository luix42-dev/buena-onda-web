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

export default function PersistentPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [deckOpen, setDeckOpen] = useState(true)

  useEffect(() => {
    fetch('/api/radio/tracks')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTracks(data)
      })
      .catch(() => {})
  }, [])

  const track: Track | null = tracks[trackIdx] ?? null
  const hasTrack = Boolean(track)

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
    } catch {
      // WebAudio is optional feedback.
    }
  }, [])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !track) return
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }, [track])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setPlaying(false)
  }, [])

  const expand = useCallback(() => {
    thunk()
    setDeckOpen(true)
  }, [thunk])

  const minimize = useCallback(() => {
    thunk()
    setDeckOpen(false)
  }, [thunk])

  const toggle = useCallback(() => {
    thunk()
    if (playing) {
      pause()
    } else {
      void play()
    }
  }, [pause, play, playing, thunk])

  const prev = useCallback(() => {
    thunk()
    setTrackIdx(index => (tracks.length > 0 ? (index - 1 + tracks.length) % tracks.length : 0))
  }, [tracks.length, thunk])

  const next = useCallback(() => {
    thunk()
    setTrackIdx(index => (tracks.length > 0 ? (index + 1) % tracks.length : 0))
  }, [tracks.length, thunk])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onEnd = () => setTrackIdx(index => (tracks.length > 0 ? (index + 1) % tracks.length : 0))
    const onPause = () => setPlaying(false)
    const onPlay = () => setPlaying(true)

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('play', onPlay)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('play', onPlay)
    }
  }, [tracks.length])

  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    if (playing) void play()
  }, [play, playing, trackIdx])

  const progress = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0
  const label = trackLabel(track)

  return (
    <>
      {track ? <audio ref={audioRef} src={track.src} preload="metadata" /> : null}

      {!deckOpen ? (
        <button
          type="button"
          onClick={expand}
          className="bo-radio-pill"
          aria-label="Expand Buena Onda Radio player"
        >
          <span className="bo-live-dot" aria-hidden="true" />
          <span>BUENA ONDA RADIO</span>
          <span aria-hidden="true" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>▴</span>
        </button>
      ) : null}

      <section className={`bo-tape-deck ${deckOpen ? 'bo-tape-deck-open' : ''}`} aria-label="Buena Onda Radio player">
        <div className="bo-deck-top">
          <span>BUENA ONDA RADIO</span>
          <button type="button" onClick={minimize} aria-label="Minimize player">▾</button>
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

      <style suppressHydrationWarning>{`
        .bo-radio-pill {
          position: fixed;
          left: 18px;
          bottom: 18px;
          z-index: 60;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #1A9E9E;
          background: #2F2F2D;
          color: #F8F7F3;
          padding: 0 16px;
          font-family: var(--font-sans);
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          box-shadow: 0 12px 34px rgba(47,47,45,0.28);
          transition: transform 160ms ease, border-color 160ms ease;
        }
        .bo-radio-pill:hover { transform: translateY(-2px); border-color: #08CCFC; }
        .bo-live-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #E8176A;
          box-shadow: 0 0 0 0 rgba(232,23,106,0.55);
          animation: boPulse 1.4s ease-out infinite;
        }
        .bo-tape-deck {
          position: fixed;
          left: 18px;
          bottom: 18px;
          z-index: 60;
          width: min(680px, calc(100vw - 36px));
          background: #2F2F2D;
          color: #F8F7F3;
          border: 1px solid #0F6E6E;
          border-top: 5px solid #1A9E9E;
          box-shadow: 0 24px 70px rgba(47,47,45,0.42);
          transform: translateY(calc(100% + 36px));
          opacity: 0;
          pointer-events: none;
          transition: transform 360ms ease, opacity 220ms ease;
          overflow: hidden;
        }
        .bo-tape-deck::before {
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
        .bo-tape-deck-open {
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
        @keyframes boPulse {
          0% { box-shadow: 0 0 0 0 rgba(232,23,106,0.55); }
          100% { box-shadow: 0 0 0 10px rgba(232,23,106,0); }
        }
        @keyframes boMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes boVu {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
        @media (max-width: 640px) {
          .bo-radio-pill {
            right: 14px;
            left: 14px;
            bottom: 14px;
            justify-content: center;
          }
          .bo-tape-deck {
            left: 10px;
            right: 10px;
            bottom: 10px;
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
