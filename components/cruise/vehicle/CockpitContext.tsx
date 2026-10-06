'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { useCruiseAudio } from '../audio/useCruiseAudio'
import type { CruiseVehicleId } from '@/lib/cruise/types'
import { canPlayCruiseStation, getCruiseStation, CRUISE_STATIONS } from '@/lib/cruise/stations'

type Action = 'tuning' | 'volume' | 'preset' | 'lights'
export type RadioAction = 'power' | 'preset' | 'seek' | 'volume' | 'mute'
export const RADIO_PRESETS = CRUISE_STATIONS.filter(canPlayCruiseStation)
export type CockpitCommand = { action: Action; started: number }
type Controls = {
  audio: ReturnType<typeof useCruiseAudio>; command: CockpitCommand | null
  request: (action: Action, commit: () => void) => boolean
  selectStation: (id: string) => boolean
  lights: boolean; toggleLights: () => void; tuning: boolean
  radioFocused: boolean; focusRadio?: () => void
  operateRadio: (action: RadioAction, value?: string | number) => void
}
const Context = createContext<Controls | null>(null)
export const useCockpit = () => useContext(Context)

export function CockpitProvider({ audio, vehicleId, autoLights, children, instant = false, radioFocused = false, focusRadio, onRadioAction }: { audio: ReturnType<typeof useCruiseAudio>; vehicleId: CruiseVehicleId; autoLights: boolean; children: ReactNode; instant?: boolean; radioFocused?: boolean; focusRadio?: () => void; onRadioAction?: (action: RadioAction) => void }) {
  const [command, setCommand] = useState<CockpitCommand | null>(null)
  const [lights, setLights] = useState(false)
  const [tuning, setTuning] = useState(false)
  const busy = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const tuningSound = useRef<AudioContext | null>(null)
  const previousAutoLights = useRef(false)
  const selected = useRef(audio.stationId)
  selected.current = audio.stationId
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(feedbackTimer.current), [])
  function operateRadio(action: RadioAction, value?: string | number) {
    if (action === 'power') audio.toggle()
    if (action === 'mute') audio.setMuted(!audio.muted)
    if (action === 'volume') { audio.setVolume(Number(value)); audio.setMuted(false) }
    if (action === 'preset' || action === 'seek') {
      const index = RADIO_PRESETS.findIndex(item => item.id === selected.current)
      const id = action === 'preset' ? String(value) : RADIO_PRESETS[(index + Number(value || 1) + RADIO_PRESETS.length) % RADIO_PRESETS.length].id
      if (audio.selectStation(id)) selected.current = id
    }
    setCommand({action: action === 'volume' ? 'volume' : action === 'seek' ? 'tuning' : 'preset', started: performance.now()})
    clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setCommand(null), 220)
    onRadioAction?.(action)
  }
  useEffect(() => {
    busy.current = false; setCommand(null); setTuning(false)
    return () => { timers.current.forEach(clearTimeout); timers.current = []; busy.current = false; void tuningSound.current?.close(); tuningSound.current = null }
  }, [vehicleId])
  function request(action: Action, commit: () => void) {
    if (instant) { commit(); return true }
    if (busy.current) return false
    busy.current = true
    if (action === 'tuning' && audio.playing && !audio.muted) {
      try { tuningSound.current = new AudioContext(); void tuningSound.current.resume() } catch { /* Visual tuning still works without Web Audio. */ }
    }
    setCommand({ action, started: performance.now() })
    timers.current = [
      setTimeout(() => {
        if (action === 'tuning') {
          setTuning(true)
          const context = tuningSound.current
          if (context && context.state === 'running') {
            const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.18), context.sampleRate)
            const samples = buffer.getChannelData(0)
            for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / samples.length)
            const source = context.createBufferSource(), gain = context.createGain()
            source.buffer = buffer; gain.gain.value = audio.volume * 0.07
            source.connect(gain); gain.connect(context.destination); source.onended = () => { source.disconnect(); gain.disconnect() }; source.start()
          }
        } else commit()
      }, 1150),
      setTimeout(() => { if (action === 'tuning') commit() }, 1350),
      setTimeout(() => setTuning(false), 2050),
      setTimeout(() => { setCommand(null); busy.current = false; timers.current = []; void tuningSound.current?.close(); tuningSound.current = null }, 3250),
    ]
    return true
  }
  function selectStation(id: string) {
    const station = getCruiseStation(id)
    if (id === audio.stationId || !station || !canPlayCruiseStation(station)) return false
    return request('tuning', () => { audio.selectStation(id) })
  }
  const toggleLights = () => { request('lights', () => setLights(value => !value)) }
  useEffect(() => {
    if (previousAutoLights.current === autoLights || busy.current) return
    previousAutoLights.current = autoLights
    request('lights', () => setLights(autoLights))
    // A pending manual interaction finishes before the automatic light reach.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLights, command])
  return <Context.Provider value={{ audio, command, request, selectStation, lights, toggleLights, tuning: tuning || audio.loading, radioFocused, focusRadio, operateRadio }}>{children}</Context.Provider>
}
