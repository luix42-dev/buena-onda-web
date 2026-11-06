'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { useCruiseAudio } from '../audio/useCruiseAudio'
import type { NowPlaying } from '../audio/useRadioLibrary'
import type { CruiseVehicleId, CruiseStation } from '@/lib/real-miami/types'
import { canPlayCruiseStation, CRUISE_STATIONS } from '@/lib/real-miami/stations'

type Action = 'tuning' | 'volume' | 'preset' | 'lights'
export type RadioAction = 'power' | 'preset' | 'seek' | 'volume' | 'mute'
export const RADIO_PRESETS = CRUISE_STATIONS.filter(canPlayCruiseStation)
export type CockpitCommand = { action: Action; started: number }
type Controls = {
  presets: readonly CruiseStation[]; audio: ReturnType<typeof useCruiseAudio>; command: CockpitCommand | null
  request: (action: Action, commit: () => void) => boolean
  selectStation: (id: string) => boolean
  lights: boolean; toggleLights: () => void; tuning: boolean
  radioFocused: boolean; focusRadio?: () => void
  operateRadio: (action: RadioAction, value?: string | number) => void
  nowPlaying?: NowPlaying
}
const Context = createContext<Controls | null>(null)
export const useCockpit = () => useContext(Context)

export function CockpitProvider({ audio, vehicleId, autoLights, children, stations = CRUISE_STATIONS, instant = false, radioFocused = false, focusRadio, onRadioAction, nowPlaying }: { audio: ReturnType<typeof useCruiseAudio>; vehicleId: CruiseVehicleId; autoLights: boolean; children: ReactNode; stations?: readonly CruiseStation[]; instant?: boolean; radioFocused?: boolean; focusRadio?: () => void; onRadioAction?: (action: RadioAction) => void; nowPlaying?: NowPlaying }) {
  const presets = useMemo(() => stations.filter(canPlayCruiseStation), [stations])
  const [command, setCommand] = useState<CockpitCommand | null>(null)
  const [lights, setLights] = useState(false)
  const [tuning, setTuning] = useState(false)
  const busy = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const previousAutoLights = useRef(false)
  const selected = useRef(audio.stationId)
  selected.current = audio.stationId
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(feedbackTimer.current), [])
  function operateRadio(action: RadioAction, value?: string | number) {
    if (action === 'power') audio.toggle()
    if (action === 'mute') audio.setMuted(!audio.muted)
    if (action === 'volume') { audio.setVolume(Number(value)); audio.setMuted(false) }
    if (action === 'preset' || action === 'seek') {
      const index = presets.findIndex(item => item.id === selected.current)
      const id = action === 'preset' ? String(value) : presets[(index + Number(value || 1) + presets.length) % presets.length]?.id
      if (id && audio.selectStation(id)) selected.current = id
    }
    setCommand({action: action === 'volume' ? 'volume' : action === 'seek' ? 'tuning' : 'preset', started: performance.now()})
    clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setCommand(null), 220)
    onRadioAction?.(action)
  }
  useEffect(() => {
    busy.current = false; setCommand(null); setTuning(false)
    return () => { timers.current.forEach(clearTimeout); timers.current = []; busy.current = false }
  }, [vehicleId])
  function request(action: Action, commit: () => void) {
    if (instant) { commit(); return true }
    if (busy.current) return false
    busy.current = true
    setCommand({ action, started: performance.now() })
    timers.current = [
      setTimeout(() => {
        if (action === 'tuning') {
          setTuning(true)
        } else commit()
      }, 1150),
      setTimeout(() => { if (action === 'tuning') commit() }, 1350),
      setTimeout(() => setTuning(false), 2050),
      setTimeout(() => { setCommand(null); busy.current = false; timers.current = [] }, 3250),
    ]
    return true
  }
  function selectStation(id: string) {
    const station = stations.find(item => item.id === id)
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
  return <Context.Provider value={{ presets, audio, command, request, selectStation, lights, toggleLights, tuning: tuning || audio.loading, radioFocused, focusRadio, operateRadio, nowPlaying }}>{children}</Context.Provider>
}
