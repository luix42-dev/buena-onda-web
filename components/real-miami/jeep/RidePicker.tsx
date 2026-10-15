'use client'

import type { ReactNode } from 'react'
import type { RideVehicleId } from '@/lib/real-miami/ride-vehicles'
import './ride-picker.css'

const rides: { id: RideVehicleId; name: string; year: string; mood: string; description: string }[] = [
  { id: 'countach', name: 'Countach', year: '5000QV', mood: '01 / ITALIAN ICON', description: 'Lamborghini lines, an analog cabin and your favorite station. Take the long way along the coast.' },
  { id: 'eighties', name: 'Fiero GT', year: '1987', mood: '02 / EIGHTIES SPIRIT', description: 'A Pontiac classic with analog character. Find your rhythm on the streets of Miami.' },
  { id: 'delorean', name: 'DeLorean', year: 'DMC-12', mood: '04 / STAINLESS FUTURE', description: 'Brushed steel, gull-wing doors and a synth station. The future the eighties promised.' },
  { id: 'cadillac', name: 'Eldorado Biarritz', year: '1959', mood: '03 / CLASSIC CONVERTIBLE', description: 'Cadillac curves, an open roof and room to slow down. Let the city roll past.' },
]

export type RidePickerProps = {
  humanRadio?: boolean
  driveLabel?: string
  /** Worlds can restrict the garage, e.g. Neon Run is DeLorean only. */
  only?: readonly RideVehicleId[]
  vehicle: RideVehicleId
  onSelect: (id: RideVehicleId) => void
  night: boolean
  onNightChange: (night: boolean) => void
  onStart: () => void
  ready: boolean
  routeReady: boolean
  castControl?: ReactNode
}

export default function RidePicker({ humanRadio = false, driveLabel = 'Miami Beach / Real streets', only, vehicle, onSelect, night, onNightChange, onStart, ready, routeReady, castControl }: RidePickerProps) {
  const lineup = humanRadio ? [...rides, { id: 'wrangler' as const, name: 'Wrangler', year: '2012', mood: '05 / AFTER HOURS', description: 'The original open-air cabin, its physical radio, and a little more room for the night.' }] : rides
  const index = Math.max(0, lineup.findIndex(ride => ride.id === vehicle))
  const selected = lineup[index]
  const selectNext = (step: number) => onSelect(lineup[(index + step + lineup.length) % lineup.length].id)
  return <section className="rp" aria-label="Choose your ride">
    <header className="rp-header">
      <a className="rp-brand" href="https://www.buenaondalifestyle.com/">Buena Onda<span>CRUISE / MIAMI · BETA</span></a>
      <div className="rp-header-tools">{castControl}</div>
    </header>
    <div className="rp-heading">
      <p className="rp-eyebrow">{humanRadio ? 'TAKE THE LONG WAY TO GOOD MUSIC.' : 'CHOOSE YOUR RIDE'}</p>
      <h1>{humanRadio ? 'No Algorithms. Just Frequencies.' : 'Your ride. Your rhythm.'}</h1>
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
        <div className="rp-route"><span>Your drive</span><strong>{driveLabel}</strong></div>
        <div className="rp-times" role="group" aria-label="Choose lighting">
          <button type="button" aria-pressed={!night} onClick={() => onNightChange(false)}><span aria-hidden="true">☀</span> Sunset drive</button>
          <button type="button" aria-pressed={night} onClick={() => onNightChange(true)}><span aria-hidden="true">☾</span> Night drive</button>
        </div>
        <button type="button" className="rp-start" aria-label="Start the drive" onClick={onStart} disabled={!ready || !routeReady}>LET’S CRUISE <span aria-hidden="true">→</span></button>
        <small className="rp-footnote">Automatic cruising · Radio starts with your drive</small>
      </div>
      <div className="rp-lineup" role="group" aria-label="Available rides">
        {lineup.filter(ride => !only || only.includes(ride.id)).map(ride => <button type="button" key={ride.id} onClick={() => onSelect(ride.id)} aria-pressed={ride.id === vehicle} aria-label={`Choose ${ride.year} ${ride.name}`}>
          {ride.id !== 'wrangler' && <img src={`/real-miami/vehicle/garage/${ride.id}.png`} alt="" width={92} height={48} />}
          <span>{ride.name}<small>{ride.year}</small></span>
        </button>)}
      </div>
    </div>
  </section>
}
