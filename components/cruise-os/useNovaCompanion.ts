'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'
import { createNovaState, decide, spoke, DISCOVERY_DELAY_SEC, FIRST_ENCOUNTER_AFTER_SEC, QUIET_AFTER_SEC, VOICE_BASE, LINES, type Chattiness, type Line, type Moment, type NovaState } from '@/lib/cruise/nova/persona'

type Audio = ReturnType<typeof useCruiseAudio>
const MODE_KEY = 'buena-onda:nova:mode', VISITED_KEY = 'buena-onda:nova:visited'
const readMode = (): Chattiness => { try { const v = localStorage.getItem(MODE_KEY); if (v === 'off' || v === 'quiet' || v === 'occasional' || v === 'chatty') return v } catch { /* storage unavailable */ } return 'occasional' }

/** NOVA's runtime. Presentation-free: returns the line on air (for the caption) and the chattiness control.
 * Music ownership stays with useCruiseAudio; NOVA only ducks it around a line and restores from live state. */
export function useNovaCompanion({ audio, active, night, held = false, preview = false }: { audio: Audio; active: boolean; night: boolean; held?: boolean; preview?: boolean }) {
  const [mode, setModeState] = useState<Chattiness>('occasional'), [current, setCurrent] = useState<Line | null>(null), [speaking, setSpeaking] = useState(false)
  const live = useRef(audio); live.current = audio
  const inputs = useRef({ active, night, held }); inputs.current = { active, night, held }
  const onAir = useRef<Line | null>(null); onAir.current = current
  const state = useRef<NovaState>(createNovaState('occasional')), clock = useRef(0), lastTick = useRef(0)
  const voice = useRef<HTMLAudioElement | null>(null), duck = useRef<{ from: number; to: number } | null>(null), hide = useRef<ReturnType<typeof setTimeout>>()
  const discovery = useRef<{ station: string; at: number } | null>(null), station = useRef(audio.stationId), visited = useRef(false)
  useEffect(() => { const m = readMode(); setModeState(m); state.current = { ...state.current, mode: m }; try { visited.current = !!localStorage.getItem(VISITED_KEY) } catch { /* ignore */ } }, [])
  const setMode = useCallback((m: Chattiness) => { setModeState(m); state.current = { ...state.current, mode: m }; try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ } if (m === 'off') stop() }, []) // eslint-disable-line react-hooks/exhaustive-deps -- stop is stable through refs

  const restore = () => { const d = duck.current, a = live.current; duck.current = null; if (d && Math.abs(a.volume - d.to) < .02) a.setVolume(d.from) }
  const stop = () => { if (hide.current) clearTimeout(hide.current); voice.current?.pause(); voice.current = null; restore(); setSpeaking(false); setCurrent(null) }
  const deliver = (line: Line) => {
    onAir.current = line
    state.current = spoke(state.current, line, clock.current)
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* ignore */ }
    setCurrent(line)
    const a = live.current, caption = Math.max(3500, line.text.length * 80)
    const finish = (ms: number) => { if (hide.current) clearTimeout(hide.current); hide.current = setTimeout(() => { restore(); setSpeaking(false); setCurrent(null); voice.current = null }, ms) }
    finish(caption + 1500)
    setSpeaking(false)
    // Pre-rendered voice when the clip exists; otherwise the caption alone carries the line.
    const clip = new Audio(`${VOICE_BASE}${line.id}.ogg`); clip.preload = 'auto'
    clip.volume = Math.min(1, .25 + a.volume * 1.1)
    // `speaking` starts the talking face on the voice's first audible frame, not on the caption.
    clip.onplaying = () => { setSpeaking(true); if (!duck.current && !a.muted) { duck.current = { from: a.volume, to: a.volume * .35 }; a.setVolume(duck.current.to) } }
    clip.onended = () => { setSpeaking(false); finish(900) }
    clip.onerror = () => { voice.current = null }
    voice.current = clip; void clip.play().catch(() => { voice.current = null })
  }
  const offer = (moment: Moment) => {
    const a = live.current
    // `held`: Giant NOVA is on air with an ad; the companion waits rather than talking over it.
    if (onAir.current || !inputs.current.active || inputs.current.held) return
    const line = decide(state.current, moment, { playing: preview ? a.requested : a.playing && !a.loading && !a.tuning && !a.error, stable: !a.tuning, now: clock.current })
    if (line) deliver(line)
  }

  // Station changes: interrupt NOVA, then maybe react once the new station has settled.
  useEffect(() => {
    if (audio.stationId === station.current) return
    station.current = audio.stationId; stop()
    const [lo, hi] = DISCOVERY_DELAY_SEC
    discovery.current = { station: audio.stationId, at: clock.current + lo + Math.random() * (hi - lo) }
  }, [audio.stationId]) // eslint-disable-line react-hooks/exhaustive-deps
  // Leaving her drive mode (or any other deactivation) cuts a line short.
  useEffect(() => { if (!active) stop() }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
  // Pausing the radio silences her too.
  useEffect(() => { if (!audio.requested) stop() }, [audio.requested]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setInterval(() => {
      const a = live.current, now = performance.now() / 1000, dt = lastTick.current ? Math.min(2, now - lastTick.current) : 0; lastTick.current = now
      const { active, night } = inputs.current
      if (!active || (!a.playing && !preview)) return
      clock.current += dt
      const t = clock.current
      if (!state.current.greeted && t >= FIRST_ENCOUNTER_AFTER_SEC) offer(visited.current ? 'welcome_back' : 'first_encounter')
      const d = discovery.current
      if (d && t >= d.at) { discovery.current = null; if (d.station === a.stationId) offer('discovery') }
      if (!night && t > 120) offer('sunset')
      const hour = new Date().getHours()
      if ((hour >= 23 || hour < 4) && t > 300) offer('late_night')
      const last = state.current.spokenAt[state.current.spokenAt.length - 1] ?? 0
      if (t - last > QUIET_AFTER_SEC) offer('quiet')
    }, 1000)
    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- one ticker; inputs arrive through refs (the host re-renders every 200 ms)

  useEffect(() => () => stop(), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (new URLSearchParams(location.search).get('diagnostics') !== '1') return
    const w = window as Window & { __nova?: unknown }
    w.__nova = { snapshot: () => ({ mode: state.current.mode, active: inputs.current.active, clock: clock.current, said: state.current.said, current: onAir.current?.id ?? null }), say: (id: string) => { const line = LINES.find(l => l.id === id); if (line) { stop(); deliver(line) } } }
    return () => { delete w.__nova }
  })
  return { mode, setMode, current, speaking }
}
