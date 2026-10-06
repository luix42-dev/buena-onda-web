'use client'

import { Check, ExternalLink, SkipBack, SkipForward, X } from 'lucide-react'
import { canPlayCruiseStation, CRUISE_STATIONS } from '@/lib/cruise/stations'
import type { CruiseStation } from '@/lib/cruise/types'
import type { useCruiseAudio } from './audio/useCruiseAudio'
import { useCockpit } from './vehicle/CockpitContext'

export default function RadioPanel({ audio, onClose }: {
  audio: ReturnType<typeof useCruiseAudio>
  onClose: () => void
}) {
  const cockpit = useCockpit()
  const stations: readonly CruiseStation[] = CRUISE_STATIONS
  return <section id="cruise-radio-panel" className="cruise-settings cruise-radio-panel" aria-label="Radio stations">
    <div className="cruise-panel-heading"><span>RADIO</span><button type="button" className="cruise-icon" aria-label="Close radio stations" title="Close radio stations" onClick={onClose}><X size={17} /></button></div>
    <div className="cruise-station-list">
      {stations.map(station => canPlayCruiseStation(station)
        ? <button key={station.id} type="button" disabled={!!cockpit?.command} onClick={() => { audio.selectStation(station.id); audio.start() }} aria-pressed={station.id === audio.stationId}>
          <span>{station.name}<small>{station.playback === 'stream' ? 'Live radio' : 'In Cruise'}</small></span>{station.id === audio.stationId && <Check size={16} />}
        </button>
        : station.externalUrl
          ? <a key={station.id} href={station.externalUrl} target="_blank" rel="noreferrer"><span>{station.name}<small>External site</small></span><ExternalLink size={15} /></a>
          : <button key={station.id} type="button" disabled>{station.name}</button>)}
      {!stations.length && <p role="status">No stations in this mood.</p>}
    </div>
    <div className="cruise-queue-controls">
      <button type="button" className="cruise-icon" aria-label="Previous radio track" title="Previous radio track" disabled={!audio.canSkip} onClick={audio.previousTrack}><SkipBack size={18} /></button>
      <span>{audio.station.name}</span>
      <button type="button" className="cruise-icon" aria-label="Next radio track" title="Next radio track" disabled={!audio.canSkip} onClick={audio.nextTrack}><SkipForward size={18} /></button>
    </div>
  </section>
}
