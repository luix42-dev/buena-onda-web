'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { RideVehicleId } from '@/lib/real-miami/ride-vehicles'
import type { QualityChoice } from '@/lib/real-miami/quality'
import './experience.css'

type CameraView = 'driver' | 'chase' | 'director'
export type OpeningMinuteProps = {
  ready: boolean; started: boolean; elapsed: number; onStart: () => void
  vehicle: RideVehicleId; onVehicle: (id: RideVehicleId) => void
  view: CameraView; onView: (view: CameraView) => void
  night: boolean; onNight: () => void; onListen: () => void
  quality: QualityChoice; onQuality: (quality: QualityChoice) => void
  extraControls?: ReactNode
  paused?: boolean; onPark?: () => void; showMap?: boolean; onMap?: () => void
}
const rides: { id: RideVehicleId; label: string }[] = [
  { id: 'wrangler', label: 'Wrangler / 2012' }, { id: 'countach', label: 'Countach / 5000QV' },
  { id: 'eighties', label: 'Fiero GT / 1987' }, { id: 'cadillac', label: 'Eldorado / 1959' }, { id: 'delorean', label: 'DeLorean / DMC-12' },
]
const views: { id: CameraView; label: string }[] = [{ id: 'driver', label: 'Cockpit' }, { id: 'chase', label: 'Coastal view' }, { id: 'director', label: 'Cinematic' }]

export default function OpeningMinute({ ready, started, elapsed, onStart, vehicle, onVehicle, view, onView, night, onNight, onListen, quality, onQuality, extraControls, paused, onPark, showMap, onMap }: OpeningMinuteProps) {
  const [options, setOptions] = useState(false), [camera, setCamera] = useState(false), [dismissed, setDismissed] = useState(false)
  const optionsButton = useRef<HTMLButtonElement>(null), cameraButton = useRef<HTMLButtonElement>(null)
  const optionsPanel = useRef<HTMLDivElement>(null), cameraPanel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!options && !camera) return
    const panel = options ? optionsPanel.current : cameraPanel.current
    panel?.querySelector<HTMLElement>('button,select')?.focus({ preventScroll: true })
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault(); event.stopPropagation()
      const trigger = options ? optionsButton.current : cameraButton.current
      setOptions(false); setCamera(false); trigger?.focus({ preventScroll: true })
    }
    window.addEventListener('keydown', escape, true)
    return () => window.removeEventListener('keydown', escape, true)
  }, [options, camera])
  const begin = () => { setOptions(false); setCamera(false); onStart() }

  return <section className={`opening-minute${started ? ' opening-started' : ''}`} aria-label="Buena Onda Cruise">
    <header className="opening-header"><a className="opening-brand" href="https://www.buenaondalifestyle.com/">BUENA ONDA<span>CRUISE / MIAMI</span></a>
      <div className="opening-tools">
        {started && <button ref={cameraButton} type="button" aria-expanded={camera} aria-controls="opening-camera" onClick={() => { setCamera(value => !value); setOptions(false) }}>Camera</button>}
        <button ref={optionsButton} type="button" aria-expanded={options} aria-controls="opening-options" onClick={() => { setOptions(value => !value); setCamera(false) }}>{started ? 'Cruise options' : 'Choose your ride'}</button>
      </div>
    </header>
    {!started && <div className="opening-invitation">
      <p className="opening-kicker">REAL RADIO. MIAMI AFTER HOURS.</p>
      <h1>Take the<br/>long way.</h1>
      <p className="opening-copy">Good music. An open road.<br/>No Algorithms. Just Frequencies.</p>
      <button className="opening-start" aria-label="Start Cruising" type="button" onClick={begin}>Start cruising <span aria-hidden="true">↗</span></button>
      <p className="opening-status" role="status">{ready ? 'Your ride is ready. Radio starts with you.' : 'Start the radio while your ride gets ready.'}</p>
    </div>}
    {camera && <div ref={cameraPanel} id="opening-camera" className="opening-panel opening-camera" role="group" aria-label="Camera views">
      <p className="opening-panel-title">Choose your view</p>
      {views.map(item => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => onView(item.id)}>{item.label}</button>)}
      <button type="button" className="opening-done" onClick={() => { setCamera(false); cameraButton.current?.focus() }}>Done</button>
    </div>}
    {options && <div ref={optionsPanel} id="opening-options" className="opening-panel" role="group" aria-label="Cruise options">
      <p className="opening-panel-title">Make yourself comfortable.</p>
      <label>Your ride<select value={vehicle} onChange={event => onVehicle(event.target.value as RideVehicleId)}>{rides.map(ride => <option key={ride.id} value={ride.id}>{ride.label}</option>)}</select></label>
      <div className="opening-setting"><span>Time of day</span><button type="button" aria-pressed={night} onClick={onNight}>{night ? 'Night · switch to sunset' : 'Sunset · switch to night'}</button></div>
      <label>Scenery quality<select value={quality} onChange={event => onQuality(event.target.value as QualityChoice)}><option value="auto">Auto</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      {started && onPark && <button type="button" aria-pressed={paused === true} onClick={onPark}>{paused ? 'Continue cruising' : 'Park for a moment'}</button>}
      {onMap && <button type="button" aria-pressed={showMap === true} onClick={onMap}>{showMap ? 'Hide Miami map' : 'Show Miami map'}</button>}
      <button type="button" className="opening-listen" onClick={onListen}>Listen without 3D</button>
      {extraControls}
      <button type="button" className="opening-done" onClick={() => { setOptions(false); optionsButton.current?.focus() }}>Done</button>
    </div>}
    {started && !ready && <p className="opening-guidance" role="status">Preparing your ride. The radio controls stay below.</p>}
    {started && ready && elapsed < 12 && <p className="opening-guidance">The road takes care of itself. You choose the frequency.</p>}
    {started && elapsed >= 45 && elapsed < 65 && !dismissed && <div className="opening-return" role="status"><p>Found your frequency?<span>Keep a station in your presets for the next ride.</span></p><button type="button" aria-label="Dismiss preset tip" onClick={() => setDismissed(true)}>Got it</button></div>}
  </section>
}
