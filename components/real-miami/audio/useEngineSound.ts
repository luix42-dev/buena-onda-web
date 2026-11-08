'use client'
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { createEngineVoice, ENGINE_PROFILES, type EngineVoice } from '@/lib/cruise/engine-audio'
import type { RideVehicleId } from '@/lib/real-miami/ride-vehicles'
import type { NightState } from '../nightdrive/state'
import type { MirrorAudio } from '@/lib/cruise/mirror-audio'

const ENGINE_KEY = 'buena-onda:cruise:engine:v1', LEVEL = .3

/** The chosen car's own engine under the radio. Its own AudioContext (radio playback is untouched), started by the
 * first tap/key after the drive starts; muffled from the cockpit, silent when parked, hidden or switched off. */
export function useEngineSound({ state, vehicle, active, cockpit }: { state: MutableRefObject<NightState>; vehicle: RideVehicleId; active: boolean; cockpit: boolean }) {
  const [on, setOn] = useState(() => { try { return typeof localStorage === 'undefined' || localStorage.getItem(ENGINE_KEY) !== 'off' } catch { return true } })
  const audio = useRef<{ context: AudioContext; master: GainNode; cabin: BiquadFilterNode } | null>(null), voice = useRef<EngineVoice | null>(null)
  const mirror = useRef<MirrorAudio | null>(null)
  const live = useRef({ active, cockpit, on }); live.current = { active, cockpit, on }
  const toggle = () => setOn(value => { const next = !value; try { localStorage.setItem(ENGINE_KEY, next ? 'on' : 'off') } catch { /* private mode */ } return next })

  const ensureAudio = useCallback(() => {
    if (!audio.current) {
      const Context = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Context) throw new Error('Engine audio sharing is unavailable in this browser.')
      const context = new Context(), cabin = context.createBiquadFilter(), master = context.createGain()
      cabin.type = 'lowpass'; cabin.frequency.value = 9000; master.gain.value = 0
      cabin.connect(master).connect(context.destination); audio.current = { context, master, cabin }
    }
    return audio.current
  }, [])

  const createMirrorAudio = useCallback(async (): Promise<MirrorAudio> => {
    mirror.current?.dispose()
    const { context, master } = ensureAudio()
    const output = context.createMediaStreamDestination()
    master.connect(output)
    let localSilent = false, disposed = false
    let resolveStopped!: () => void
    const stopped = new Promise<void>(resolve => { resolveStopped = resolve })
    const capture: MirrorAudio = {
      stream: output.stream,
      setLocalSilent(silent) {
        if (disposed || silent === localSilent) return
        if (silent) master.disconnect(context.destination)
        else master.connect(context.destination)
        localSilent = silent
      },
      dispose() {
        if (disposed) return
        if (localSilent && context.state !== 'closed') master.connect(context.destination)
        disposed = true
        resolveStopped()
        master.disconnect(output)
        output.stream.getTracks().forEach(track => track.stop())
        if (mirror.current === capture) mirror.current = null
      },
    }
    mirror.current = capture
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([context.resume(), stopped, new Promise<void>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Tap Cast again to enable engine audio sharing.')), 5000)
      })])
      if (disposed) throw new Error('Engine audio sharing was cancelled.')
      return capture
    } catch (error) { capture.dispose(); throw error }
    finally { clearTimeout(timeout) }
  }, [ensureAudio])

  // One context for the page; created and resumed only from a user gesture once the drive is running.
  useEffect(() => {
    if (!active || !on || typeof window === 'undefined' || new URLSearchParams(location.search).get('engine') === 'off') return
    const wake = () => {
      try { const { context } = ensureAudio(); if (context.state === 'suspended') void context.resume().catch(() => {}) } catch { /* Audio is optional. */ }
    }
    wake()
    addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true)
    return () => { removeEventListener('pointerdown', wake, true); removeEventListener('keydown', wake, true) }
  }, [active, on, ensureAudio])

  // A voice per car: switching rides swaps the engine.
  useEffect(() => {
    if (!active || !on || new URLSearchParams(location.search).get('engine') === 'off') return
    let disposed = false
    const build = () => {
      const a = audio.current
      if (disposed || !a || voice.current) return
      voice.current = createEngineVoice(a.context, ENGINE_PROFILES[vehicle] ?? ENGINE_PROFILES.countach, a.cabin)
    }
    const timer = setInterval(() => {
      build()
      const a = audio.current, v = voice.current, s = state.current, l = live.current
      if (!a || !v) return
      const now = a.context.currentTime, playing = l.active && l.on && !s.paused && !document.hidden
      // Throttle from the drive's own acceleration; braking and coasting fall back toward engine braking.
      const load = s.brake ? 0 : Math.max(0, Math.min(1, .18 + s.acceleration * .3))
      v.render(Math.max(0, s.speed), load, now)
      a.master.gain.setTargetAtTime(playing ? LEVEL : 0, now, .25)
      a.cabin.frequency.setTargetAtTime(l.cockpit ? 1500 : 9000, now, .2)
    }, 100)
    return () => { disposed = true; clearInterval(timer); voice.current?.dispose(); voice.current = null }
  }, [active, on, vehicle, state])

  // ?diagnostics=1: live state, and an offline render of any car (idle, rev, cruise) as a WAV data URL.
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('diagnostics')) return
    const w = window as Window & { __engine?: () => unknown; __engineDemo?: (id: RideVehicleId) => Promise<string> }
    w.__engine = () => ({ on: live.current.on, context: audio.current?.context.state ?? 'none', rpm: voice.current ? Math.round(voice.current.rpm()) : null, profile: ENGINE_PROFILES[vehicle]?.label })
    w.__engineDemo = async id => {
      const rate = 44100, seconds = 7, offline = new OfflineAudioContext(1, rate * seconds, rate), demo = createEngineVoice(offline, ENGINE_PROFILES[id], offline.destination)
      for (let t = 0; t < seconds; t += .1) { const speed = t < 1.5 ? 0 : t < 4.5 ? (t - 1.5) * 9 : 27 - (t - 4.5) * 2, load = t < 1.5 ? .05 : t < 4.5 ? .95 : .2; demo.render(speed, load, t) }
      const data = (await offline.startRendering()).getChannelData(0), bytes = new DataView(new ArrayBuffer(44 + data.length * 2))
      const text = (o: number, v: string) => { for (let i = 0; i < v.length; i++) bytes.setUint8(o + i, v.charCodeAt(i)) }
      text(0, 'RIFF'); bytes.setUint32(4, 36 + data.length * 2, true); text(8, 'WAVEfmt '); bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 1, true)
      bytes.setUint32(24, rate, true); bytes.setUint32(28, rate * 2, true); bytes.setUint16(32, 2, true); bytes.setUint16(34, 16, true); text(36, 'data'); bytes.setUint32(40, data.length * 2, true)
      for (let i = 0; i < data.length; i++) bytes.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i] * .9)) * 32767, true)
      let binary = ''; const raw = new Uint8Array(bytes.buffer); for (let i = 0; i < raw.length; i += 32768) binary += String.fromCharCode(...raw.subarray(i, i + 32768))
      return 'data:audio/wav;base64,' + btoa(binary)
    }
    return () => { delete w.__engine; delete w.__engineDemo }
  }, [vehicle])

  useEffect(() => () => { mirror.current?.dispose(); voice.current?.dispose(); void audio.current?.context.close().catch(() => {}); audio.current = null }, [])
  return { on, toggle, label: ENGINE_PROFILES[vehicle]?.label ?? '', createMirrorAudio }
}
