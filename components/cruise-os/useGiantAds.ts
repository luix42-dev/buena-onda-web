'use client'

import { useEffect, useRef, useState } from 'react'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'
import { ADS_VOICE_BASE, GIANT_ADS, GIANT_AD_TIMING, type GiantAd } from '@/lib/cruise/nova/giant-ads'

type Audio = ReturnType<typeof useCruiseAudio>

/** Schedules Giant NOVA's house ads. Presentation-free: returns the ad on air (for the giant and its
 * disclosure label) and `speaking` (the ad voice is audible, so the giant's lips start with it).
 * Waits while the companion is talking; ducks the radio like the companion and restores from live state. */
export function useGiantAds({ audio, active, companionBusy, preview = false }: { audio: Audio; active: boolean; companionBusy: boolean; preview?: boolean }) {
  const [ad, setAd] = useState<GiantAd | null>(null), [speaking, setSpeaking] = useState(false)
  const live = useRef(audio); live.current = audio
  const inputs = useRef({ active, companionBusy }); inputs.current = { active, companionBusy }
  const onAir = useRef<GiantAd | null>(null); onAir.current = ad
  const clock = useRef(0), lastTick = useRef(0), next = useRef(preview?6:GIANT_AD_TIMING.firstAfterSec), count = useRef(0)
  const voice = useRef<HTMLAudioElement | null>(null), duck = useRef<{ from: number; to: number } | null>(null), hide = useRef<ReturnType<typeof setTimeout>>()

  const restore = () => { const d = duck.current, a = live.current; duck.current = null; if (d && Math.abs(a.volume - d.to) < .02) a.setVolume(d.from) }
  const stop = () => { if (hide.current) clearTimeout(hide.current); voice.current?.pause(); voice.current = null; restore(); setSpeaking(false); setAd(null) }
  const play = (pick: GiantAd) => {
    onAir.current = pick; setAd(pick); setSpeaking(false)
    const a = live.current
    // The giant rises first (~1 s), then speaks; the label stays up through her dissolve.
    const finish = (ms: number) => { if (hide.current) clearTimeout(hide.current); hide.current = setTimeout(() => { restore(); setSpeaking(false); setAd(null); voice.current = null }, ms) }
    finish(9000)
    const clip = new Audio(`${ADS_VOICE_BASE}${pick.id}.ogg`); clip.preload = 'auto'
    clip.volume = Math.min(1, .25 + a.volume * 1.1)
    clip.onplaying = () => { setSpeaking(true); if (!duck.current && !a.muted) { duck.current = { from: a.volume, to: a.volume * .35 }; a.setVolume(duck.current.to) } }
    clip.onended = () => { setSpeaking(false); restore(); finish(1800) }
    clip.onerror = () => { voice.current = null; finish(1500) }
    voice.current = clip
    setTimeout(() => { if (voice.current === clip) void clip.play().catch(() => { voice.current = null }) }, 1100)
  }

  // A station change or pause interrupts an ad.
  useEffect(() => { stop() }, [audio.stationId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!audio.requested) stop() }, [audio.requested]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!active) stop() }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const first = Number(new URLSearchParams(location.search).get('adFirst'))
    if (first > 0) next.current = first
    const timer = setInterval(() => {
      const a = live.current, now = performance.now() / 1000, dt = lastTick.current ? Math.min(2, now - lastTick.current) : 0; lastTick.current = now
      if (!inputs.current.active || (!a.playing && !preview)) return
      clock.current += dt
      if (onAir.current || inputs.current.companionBusy || clock.current < next.current) return
      const pick = GIANT_ADS[count.current++ % GIANT_ADS.length]
      next.current = clock.current + GIANT_AD_TIMING.everySec + (Math.sin(count.current * 12.9898) * .5 + .5) * GIANT_AD_TIMING.jitterSec
      play(pick)
    }, 1000)
    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- one ticker; inputs arrive through refs
  useEffect(() => () => stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (new URLSearchParams(location.search).get('diagnostics') !== '1') return
    const w = window as Window & { __giantAd?: unknown }
    w.__giantAd = { play: (id?: string) => { stop(); play(GIANT_ADS.find(x => x.id === id) ?? GIANT_ADS[0]) }, snapshot: () => ({ ad: onAir.current?.id ?? null, clock: clock.current, next: next.current }) }
    return () => { delete w.__giantAd }
  })
  return { ad, speaking }
}
