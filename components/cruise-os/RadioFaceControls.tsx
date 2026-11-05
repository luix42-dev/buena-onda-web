'use client'

import { useEffect, useRef, useState } from 'react'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'
import { randomStation } from '@/lib/human-radio/explore'
import { canPlayCruiseStation } from '@/lib/real-miami/stations'
import { stationWebsite } from '@/lib/human-radio/station-site'

type Audio = ReturnType<typeof useCruiseAudio>
type Props = {
  audio: Audio
  favorites: readonly string[]
  stationSaved: boolean
  canSaveFind: boolean
  findSaved: boolean
  findKind: 'track' | 'show'
  onSaveStation: () => void
  onSaveFind: () => boolean
  onStations: () => void
  onFinds: () => void
  onStationChange: () => void
}

/** Touch targets follow the projected in-car head unit while its tiny 3D knobs remain usable. */
export default function RadioFaceControls(p: Props) {
  const face = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  const playable = p.audio.stations.filter(canPlayCruiseStation)
  const website = stationWebsite(p.audio.station)
  const presets = [...p.favorites.map(id => playable.find(station => station.id === id)).filter((station): station is Audio['station'] => !!station), ...playable.filter(station => !p.favorites.includes(station.id))].slice(0, 6)
  useEffect(() => setMessage(''), [p.audio.stationId])
  useEffect(() => {
    const place = () => {
      const el = face.current
      if (!el) return
      const raw = document.documentElement.dataset.physicalRadioBounds
      if (!raw) return
      try {
        const { left, right, top, bottom, at } = JSON.parse(raw)
        if (![left, right, top, bottom, at].every(Number.isFinite) || performance.now() - at > 500) return
        const width = Math.min(innerWidth - 24, 560)
        el.style.width = `${width}px`
        const height = el.offsetHeight
        const wantedTop = bottom + 10
        const deckTop = document.querySelector('.dd-bar')?.getBoundingClientRect().top ?? innerHeight - 16
        const fitsBelow = wantedTop + height + 12 < deckTop
        const returnTop = document.querySelector('.os-return-drive')?.getBoundingClientRect().top
        const wantedAbove = Math.min(top - height - 10, (returnTop ?? top) - height - 12)
        el.style.left = `${Math.max(12, Math.min(innerWidth - width - 12, (left + right - width) / 2))}px`
        el.style.top = `${Math.max(72, Math.min(deckTop - height - 12, fitsBelow ? wantedTop : wantedAbove >= 72 ? wantedAbove : wantedTop))}px`
        el.dataset.placed = 'true'
      } catch { /* The scene may replace the projection during a vehicle change. */ }
    }
    place()
    const timer = setInterval(place, 100)
    return () => clearInterval(timer)
  }, [])
  const tune = (id: string) => {
    if (p.audio.selectStation(id)) {
      p.audio.start()
      p.onStationChange()
    }
  }
  const surprise = () => {
    const eligible = playable.filter(station => station.playback !== 'playlist' || station.id === 'veridian-club').map(station => station.id)
    const next = randomStation(eligible, p.audio.stationId)
    if (next) tune(next)
    else setMessage('No other station is available right now.')
  }
  const saveFind = () => {
    if (!p.onSaveFind()) return
    setMessage(p.findKind === 'show' ? 'Broadcast saved' : 'Song saved')
  }
  return <div ref={face} className="os-radio-face" role="group" aria-label="Physical radio controls" data-placed="false">
    <div className="os-radio-face-head"><span>BUENA ONDA / IN-DASH RADIO</span>{website?<a className="os-radio-face-site" href={website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${p.audio.station.name} station website`}>{p.audio.station.name} ↗</a>:<strong>{p.audio.station.name}</strong>}</div>
    <div className="os-radio-face-actions">
      <button type="button" aria-pressed={p.stationSaved} onClick={p.onSaveStation}>{p.stationSaved ? '★ Saved station' : '☆ Save station'}</button>
      {p.canSaveFind && <button type="button" aria-pressed={p.findSaved} onClick={saveFind}>{p.findSaved ? '✓ Saved' : p.findKind === 'show' ? 'Save broadcast' : 'Save song'}</button>}
      <button type="button" onClick={surprise}>Surprise me</button>
      <button type="button" onClick={p.onStations}>Explore stations</button>
      <button type="button" onClick={p.onFinds}>My Finds</button>
    </div>
    <div className="os-radio-face-presets" role="group" aria-label="Six radio presets">
      {presets.map((station, i) => <button type="button" key={station.id} aria-label={`Preset ${i + 1}: ${station.name}`} aria-pressed={station.id === p.audio.stationId} title={station.name} onClick={() => tune(station.id)}><small>{i + 1}</small><span>{station.name}</span></button>)}
    </div>
    {message && <p role="status" className="os-radio-face-note">{message}</p>}
  </div>
}
