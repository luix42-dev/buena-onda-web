'use client'

import type { ReactNode } from 'react'
import type { RideVehicleId } from '@/lib/real-miami/ride-vehicles'
import './ride-picker.css'

const rides: { id: RideVehicleId; name: string; year: string; mood: string; description: string }[] = [
  { id: 'wrangler', name: 'Wrangler', year: '2012', mood: '01 / OPEN AIR', description: 'Open sky, warm dials and your favorite station. Take the long way along the coast.' },
  { id: 'eighties', name: 'Fiero GT', year: '1987', mood: '02 / EIGHTIES SPIRIT', description: 'A Pontiac classic with analog character. Find your rhythm on the streets of Miami.' },
  { id: 'cadillac', name: 'Eldorado Biarritz', year: '1959', mood: '03 / CLASSIC CONVERTIBLE', description: 'Cadillac curves, an open roof and room to slow down. Let the city roll past.' },
]

export type RidePickerProps = {
  vehicle: RideVehicleId
  onSelect: (id: RideVehicleId) => void
  night: boolean
  onNightChange: (night: boolean) => void
  onStart: () => void
  ready: boolean
  routeReady: boolean
  castControl?: ReactNode
}

export default function RidePicker({ vehicle, onSelect, night, onNightChange, onStart, ready, routeReady, castControl }: RidePickerProps) {
  const index = rides.findIndex(ride => ride.id === vehicle)
  const selected = rides[index]
  const selectNext = (step: number) => onSelect(rides[(index + step + rides.length) % rides.length].id)
  return <section className="rp" aria-label="Choose your ride">
    <header className="rp-header">
      <a className="rp-brand" href="https://www.buenaondalifestyle.com/">Buena Onda<span>CRUISE / MIAMI · BETA</span></a>
      <div className="rp-header-tools">{castControl}</div>
    </header>
    <div className="rp-heading">
      <p className="rp-eyebrow">CHOOSE YOUR RIDE</p>
      <h1>Your ride. Your rhythm.</h1>
      <a className="rp-support" href="https://www.buenaondalifestyle.com/themes" target="_blank" rel="noopener noreferrer">Support Buena Onda <span aria-hidden="true">↗</span><span className="rp-sr"> (opens a new tab)</span></a>
    </div>
    <div className="rp-showcase" aria-label={`${selected.year} ${selected.name} 3D showcase`}>
      <button className="rp-arrow" type="button" onClick={() => selectNext(-1)} aria-label="Previous ride">←</button>
      {!ready && <span className="rp-loading" role="status">Preparing your {selected.name}…</span>}
      <button className="rp-arrow" type="button" onClick={() => selectNext(1)} aria-label="Next ride">→</button>
    </div>
    <div className="rp-selection">
      <div className="rp-copy" aria-live="polite">
        <p className="rp-eyebrow">{selected.mood}</p>
        <h2>{selected.name}<span>{selected.year}</span></h2>
        <p className="rp-description">{selected.description}</p>
      </div>
      <div className="rp-departure">
        <div className="rp-route"><span>Your drive</span><strong>Miami Beach / Real streets</strong></div>
        <div className="rp-times" role="group" aria-label="Choose lighting">
          <button type="button" aria-pressed={!night} onClick={() => onNightChange(false)}><span aria-hidden="true">☀</span> Sunset drive</button>
          <button type="button" aria-pressed={night} onClick={() => onNightChange(true)}><span aria-hidden="true">☾</span> Night drive</button>
        </div>
        <button type="button" className="rp-start" aria-label="Start the drive" onClick={onStart} disabled={!ready || !routeReady}>LET’S CRUISE <span aria-hidden="true">→</span></button>
        <small className="rp-footnote">Automatic cruising · Radio starts with your drive</small>
      </div>
      <div className="rp-lineup" role="group" aria-label="Available rides">
        {rides.map(ride => <button type="button" key={ride.id} onClick={() => onSelect(ride.id)} aria-pressed={ride.id === vehicle} aria-label={`Choose ${ride.year} ${ride.name}`}>
          <img src={`/real-miami/vehicle/garage/${ride.id}.png`} alt="" width={92} height={48} />
          <span>{ride.name}<small>{ride.year}</small></span>
        </button>)}
      </div>
    </div>
  </section>
}
