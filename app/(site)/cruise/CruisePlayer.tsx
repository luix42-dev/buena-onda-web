'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type PlayerScene = {
  id: string
  city: string
  city_label: string
  route_label: string | null
  time_of_day: string
  title: string
  video_url: string
}

export type PlayerChannel = {
  id: string
  name: string
  slug: string
  tracks: { key: string; url: string }[]
}

type Props = {
  scenes: PlayerScene[]
  channels: PlayerChannel[]
}

type Bucket = 'day' | 'sunset' | 'night'

// ── Brand tokens (inline only — Tailwind arbitrary colors get purged) ────────

const CREAM = '#F8F7F3'
const CHARCOAL = '#2F2F2D'
const PINK = '#E8176A'
const TEAL = '#1A9E9E'

// ── Miami time ───────────────────────────────────────────────────────────────

function miamiNow(): { hour: number; clock: string } {
  const now = new Date()
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(now),
  ) % 24
  const clock = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now)
  return { hour, clock }
}

function bucketForHour(hour: number): Bucket {
  if (hour >= 7 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'sunset'
  return 'night'
}

function trackName(key: string) {
  return decodeURIComponent(key.split('/').pop() ?? key).replace(/\.mp3$/i, '')
}

const BUCKETS: Bucket[] = ['day', 'sunset', 'night']

// ── Component ────────────────────────────────────────────────────────────────

export default function CruisePlayer({ scenes, channels }: Props) {
  // ── Miami clock ─────────────────────────────────────────────────────────────
  const [miami, setMiami] = useState<{ hour: number; clock: string } | null>(null)

  useEffect(() => {
    setMiami(miamiNow())
    const id = setInterval(() => setMiami(miamiNow()), 30_000)
    return () => clearInterval(id)
  }, [])

  // ── City / time selection ───────────────────────────────────────────────────
  const cities = useMemo(() => {
    const seen = new Set<string>()
    const out: { city: string; label: string }[] = []
    for (const s of scenes) {
      if (!seen.has(s.city)) {
        seen.add(s.city)
        out.push({ city: s.city, label: s.city_label })
      }
    }
    return out
  }, [scenes])

  const [activeCity, setActiveCity] = useState<string | null>(null)
  const [override, setOverride] = useState<Bucket | null>(null)

  const city = activeCity ?? cities[0]?.city ?? null
  const syncedBucket: Bucket = bucketForHour(miami?.hour ?? 17)
  const effectiveBucket: Bucket = override ?? syncedBucket

  const scene = useMemo(() => {
    if (!city) return null
    const cityScenes = scenes.filter(s => s.city === city)
    return cityScenes.find(s => s.time_of_day === effectiveBucket) ?? cityScenes[0] ?? null
  }, [scenes, city, effectiveBucket])

  // ── Video mute ──────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoMuted, setVideoMuted] = useState(true)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [audioPlaying, setAudioPlaying] = useState(false)

  const channelPlaying = activeChannelId !== null && audioPlaying
  const effectiveMuted = videoMuted || channelPlaying

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = effectiveMuted
  }, [effectiveMuted, scene?.id])

  // ── Audio channel playback ──────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement>(null)
  const [trackIndex, setTrackIndex] = useState(0)

  const activeChannel = channels.find(c => c.id === activeChannelId) ?? null
  const currentTrack = activeChannel?.tracks[trackIndex] ?? null

  function selectChannel(channel: PlayerChannel) {
    if (channel.tracks.length === 0) return
    if (channel.id === activeChannelId) {
      // Toggle pause/resume on the active channel
      const el = audioRef.current
      if (!el) return
      if (el.paused) { void el.play() } else { el.pause() }
      return
    }
    setActiveChannelId(channel.id)
    setTrackIndex(0)
  }

  // Start/advance playback whenever channel or track changes
  useEffect(() => {
    const el = audioRef.current
    if (!el || !currentTrack) return
    el.src = currentTrack.url
    void el.play().catch(() => setAudioPlaying(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId, trackIndex])

  function onTrackEnded() {
    if (!activeChannel) return
    if (activeChannel.tracks.length === 1) {
      // (i + 1) % 1 === i, so the play effect would never re-fire — replay directly
      const el = audioRef.current
      if (el) { el.currentTime = 0; void el.play() }
      return
    }
    setTrackIndex(i => (i + 1) % activeChannel.tracks.length)
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (scenes.length === 0) {
    return (
      <div style={{ background: CREAM, color: CHARCOAL, minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '64px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 7vw, 72px)', letterSpacing: '0.04em', margin: 0 }}>
          CRUISE
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, opacity: 0.7, margin: 0 }}>
          No scenes published yet. The first cruise is being cut.
        </p>
      </div>
    )
  }

  const badgeLabel = override
    ? 'MANUAL'
    : miami
      ? `SYNCED TO MIAMI TIME · ${miami.clock} ET`
      : 'SYNCING…'

  return (
    <div style={{ background: CREAM, color: CHARCOAL, minHeight: '100vh', padding: '32px 16px 96px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6vw, 64px)', letterSpacing: '0.04em', margin: 0, lineHeight: 1 }}>
            CRUISE
          </h1>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '0.12em', color: TEAL }}>
            CAST TO TV — CHROME CAST OR AIRPLAY FROM YOUR BROWSER
          </span>
        </header>

        {/* ── City tabs ──────────────────────────────────────────────────── */}
        <nav aria-label="Cities" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cities.map(c => {
            const on = c.city === city
            return (
              <button
                key={c.city}
                type="button"
                onClick={() => setActiveCity(c.city)}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  letterSpacing: '0.08em',
                  padding: '8px 18px',
                  background: 'transparent',
                  color: on ? PINK : CHARCOAL,
                  border: `1px solid ${on ? PINK : CHARCOAL}`,
                  borderRadius: 999,
                  cursor: 'pointer',
                  opacity: on ? 1 : 0.65,
                }}
              >
                {c.label.toUpperCase()}
              </button>
            )
          })}
        </nav>

        {/* ── Video window ───────────────────────────────────────────────── */}
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: CHARCOAL, aspectRatio: '16 / 9' }}>
          {scene && (
            <video
              key={scene.id}
              ref={videoRef}
              src={scene.video_url}
              loop
              muted
              playsInline
              autoPlay
              x-webkit-airplay="allow"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}

          {/* Scene label */}
          {scene && (
            <div style={{ position: 'absolute', left: 16, bottom: 14, display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.06em', color: CREAM, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
                {scene.title.toUpperCase()}
              </span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, letterSpacing: '0.1em', color: CREAM, opacity: 0.85, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                {(scene.route_label ?? scene.city_label).toUpperCase()}
              </span>
            </div>
          )}

          {/* Mute toggle */}
          <button
            type="button"
            onClick={() => setVideoMuted(m => !m)}
            disabled={channelPlaying}
            title={channelPlaying ? 'Video stays muted while a channel plays' : (videoMuted ? 'Unmute scene' : 'Mute scene')}
            style={{
              position: 'absolute',
              right: 14,
              bottom: 14,
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              letterSpacing: '0.1em',
              padding: '6px 12px',
              background: 'rgba(47,47,45,0.55)',
              color: CREAM,
              border: `1px solid ${CREAM}`,
              borderRadius: 999,
              cursor: channelPlaying ? 'default' : 'pointer',
              opacity: channelPlaying ? 0.5 : 1,
            }}
          >
            {effectiveMuted ? 'SOUND OFF' : 'SOUND ON'}
          </button>
        </div>

        {/* ── Time badge + override chips ────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              letterSpacing: '0.14em',
              padding: '6px 14px',
              border: `1px solid ${override ? PINK : TEAL}`,
              color: override ? PINK : TEAL,
              borderRadius: 999,
            }}
          >
            {badgeLabel}
          </span>

          <div style={{ display: 'flex', gap: 6 }}>
            {BUCKETS.map(b => {
              const on = override === b
              const isCurrent = !override && syncedBucket === b
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setOverride(prev => (prev === b ? null : b))}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    letterSpacing: '0.12em',
                    padding: '6px 14px',
                    background: 'transparent',
                    color: on ? PINK : CHARCOAL,
                    border: `1px solid ${on ? PINK : isCurrent ? TEAL : 'rgba(47,47,45,0.35)'}`,
                    borderRadius: 999,
                    cursor: 'pointer',
                  }}
                >
                  {b.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Now playing ────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            border: `1px solid rgba(47,47,45,0.2)`,
            borderRadius: 10,
            minHeight: 56,
          }}
        >
          {activeChannel && currentTrack ? (
            <>
              <button
                type="button"
                onClick={() => selectChannel(activeChannel)}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  letterSpacing: '0.1em',
                  padding: '8px 16px',
                  background: audioPlaying ? PINK : 'transparent',
                  color: audioPlaying ? CREAM : PINK,
                  border: `1px solid ${PINK}`,
                  borderRadius: 999,
                  cursor: 'pointer',
                }}
              >
                {audioPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.06em' }}>
                  {activeChannel.name.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {trackName(currentTrack.key)} · {trackIndex + 1}/{activeChannel.tracks.length}
                </span>
              </div>
            </>
          ) : (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, opacity: 0.6 }}>
              {channels.length > 0 ? 'Pick a channel to ride with.' : 'Channels are on the way.'}
            </span>
          )}
        </div>

        {/* ── Channel tabs ───────────────────────────────────────────────── */}
        {channels.length > 0 && (
          <nav aria-label="Channels" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {channels.map(ch => {
              const on = ch.id === activeChannelId
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => selectChannel(ch)}
                  disabled={ch.tracks.length === 0}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    letterSpacing: '0.1em',
                    padding: '8px 16px',
                    background: 'transparent',
                    color: on ? TEAL : CHARCOAL,
                    border: `1px solid ${on ? TEAL : 'rgba(47,47,45,0.35)'}`,
                    borderRadius: 999,
                    cursor: ch.tracks.length === 0 ? 'default' : 'pointer',
                    opacity: ch.tracks.length === 0 ? 0.4 : 1,
                  }}
                >
                  {ch.name.toUpperCase()}
                </button>
              )
            })}
          </nav>
        )}

        <audio
          ref={audioRef}
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          onEnded={onTrackEnded}
        />
      </div>
    </div>
  )
}
