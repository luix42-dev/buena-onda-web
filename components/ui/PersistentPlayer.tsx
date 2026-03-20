'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import type { Track } from '@/lib/radio'

function fmt(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const m  = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${String(ss).padStart(2, '0')}`
}

export default function PersistentPlayer() {
  const audioRef                      = useRef<HTMLAudioElement>(null)
  const progressRef                   = useRef<HTMLDivElement>(null)
  const [tracks, setTracks]           = useState<Track[]>([])
  const [trackIdx, setTrackIdx]       = useState(0)
  const [playing, setPlaying]         = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]       = useState(0)
  const [dismissed, setDismissed]     = useState(false)
  const [visible, setVisible]         = useState(false)

  useEffect(() => {
    fetch('/api/radio/tracks')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTracks(data) })
      .catch(() => {})
  }, [])

  const track: Track | null = tracks[trackIdx] ?? null

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Audio event listeners
  useEffect(() => {
    const a = audioRef.current
    if (!a) return

    const onTime = () => setCurrentTime(a.currentTime)
    const onMeta = () => setDuration(a.duration)
    const onEnd  = () => {
      if (trackIdx < tracks.length - 1) {
        setTrackIdx(i => i + 1)
      } else {
        setPlaying(false)
        setCurrentTime(0)
      }
    }

    a.addEventListener('timeupdate', onTime)
    a.addEventListener('loadedmetadata', onMeta)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('ended', onEnd)
    }
  }, [trackIdx, tracks])

  // Auto-play next track when trackIdx changes
  useEffect(() => {
    const a = audioRef.current
    if (!a || !playing) return
    a.play().catch(() => setPlaying(false))
  }, [trackIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async () => {
    const a = audioRef.current
    if (!a || !track) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      try {
        await a.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
    }
  }, [playing, track])

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !duration) return
    const rect  = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    a.currentTime = ratio * duration
  }, [duration])

  if (dismissed) return null

  const progress = duration ? (currentTime / duration) * 100 : 0
  const hasTrack = Boolean(track)

  return (
    <>
      {track && (
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
        />
      )}

      {/* Player bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500"
        style={{
          background:   '#0D0D0D',
          transform:    visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* 4-color top stripe */}
        <div className="flex" style={{ height: '2px' }}>
          <div className="flex-1" style={{ background: '#2A9D9D' }} />
          <div className="flex-1" style={{ background: '#D9685A' }} />
          <div className="flex-1" style={{ background: '#1A7070' }} />
          <div className="flex-1" style={{ background: '#E8927F' }} />
        </div>

        <div className="max-w-site mx-auto px-4 md:px-10 flex items-center gap-4 md:gap-6"
          style={{ height: '56px' }}
        >
          {/* Play / Pause */}
          <button
            onClick={toggle}
            disabled={!hasTrack}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center border transition-all duration-200"
            style={{
              borderColor: playing ? '#2A9D9D' : 'rgba(255,255,255,0.12)',
              color:       playing ? '#2A9D9D' : hasTrack ? '#666' : '#333',
            }}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                <rect x="0" y="0" width="3.5" height="12" />
                <rect x="6.5" y="0" width="3.5" height="12" />
              </svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                <polygon points="0,0 10,6 0,12" />
              </svg>
            )}
          </button>

          {/* Label + track info + progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              {/* Status label */}
              <span
                className="font-mono flex-shrink-0"
                style={{
                  color:         playing ? '#2A9D9D' : '#444',
                  fontSize:      '0.45rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                }}
              >
                {playing ? 'Now Playing' : hasTrack ? 'On Air' : 'Signal'}
              </span>

              {/* Track title */}
              <span
                className="font-display text-white truncate"
                style={{ fontSize: '0.8rem', letterSpacing: '0.06em' }}
              >
                {hasTrack ? track!.title : 'Coming Soon'}
              </span>

              {/* Artist — hidden on mobile */}
              {track?.artist && (
                <span
                  className="font-mono hidden md:block flex-shrink-0"
                  style={{ color: '#444', fontSize: '0.5rem', letterSpacing: '0.15em' }}
                >
                  {track.artist}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div
              ref={progressRef}
              onClick={hasTrack ? seek : undefined}
              className="relative"
              style={{
                height:     '2px',
                background: 'rgba(255,255,255,0.08)',
                cursor:     hasTrack ? 'pointer' : 'default',
              }}
            >
              <div
                style={{
                  position:   'absolute',
                  left:        0,
                  top:         0,
                  height:      '100%',
                  width:       `${progress}%`,
                  background:  '#2A9D9D',
                  transition:  'width 0.25s linear',
                }}
              />
            </div>
          </div>

          {/* Time */}
          <span
            className="font-mono flex-shrink-0 hidden sm:block"
            style={{ color: '#444', fontSize: '0.55rem', letterSpacing: '0.1em' }}
          >
            {hasTrack ? `${fmt(currentTime)} / ${fmt(duration)}` : '—:—'}
          </span>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 transition-colors duration-150 hover:text-white"
            style={{ color: '#333', fontSize: '1.1rem', lineHeight: 1 }}
            aria-label="Dismiss player"
          >
            ×
          </button>
        </div>
      </div>
    </>
  )
}
