'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { OpeningMinuteProps } from '@/components/experience/OpeningMinute'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'
import type { HumanRadioMetadata } from '@/lib/human-radio/metadata'
import DiscoveryConsole from '@/components/human-radio/DiscoveryConsole'
import { cruiseShortcut } from '@/lib/cruise-os/input'
import Glovebox, { type GloveboxPage } from './Glovebox'
import PostcardStudio from './PostcardStudio'
import { useCruiseGamepad } from './useCruiseGamepad'
import './cruise-os.css'

type Panel = GloveboxPage | 'stations' | 'presets' | 'finds' | null
type Props = OpeningMinuteProps & {
  audio: ReturnType<typeof useCruiseAudio>; metadata: HumanRadioMetadata | null
  listeningOnly: boolean; onScenery: () => void; presence: boolean; onPresence: () => void
  onFocusRadio: () => void; focused: boolean; onBackToDrive: () => void
  credits: ReactNode; settings: ReactNode; places: ReactNode; carLabel: string; locationName: string
  capture: () => Promise<Blob>; shareUrl: string; onShared: () => void
  onAction: (event: 'station_change' | 'station_save' | 'verified_song_save' | 'share') => void
  onOverlayChange: (open: boolean) => void
}
const rides = [ ['countach','Countach / 5000QV'], ['wrangler','Wrangler / 2012'], ['eighties','Fiero GT / 1987'], ['cadillac','Eldorado / 1959'], ['delorean','DeLorean / DMC-12'] ] as const
const views = [['driver','Cockpit'],['chase','Coastal view'],['director','Cinematic']] as const
const radioPanels = ['stations','presets','finds']

/** Presentation/navigation only. Audio and scene lifetimes remain owned by JeepNight. */
export default function CruiseOS(props: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [controller, setController] = useState(false)
  const controllerStatus = useCruiseGamepad({enabled:controller,onGlovebox:()=>setPanel('home'),onRadio:()=>setPanel('stations'),onCamera:()=>{if(props.started)props.onView(props.view==='driver'?'chase':'driver')}})
  const gloveboxTrigger = useRef<HTMLButtonElement>(null)
  const latest = useRef({ props, panel }); latest.current = { props, panel }
  const {onOverlayChange} = props
  useEffect(() => { onOverlayChange(panel !== null); return () => onOverlayChange(false) }, [panel, onOverlayChange])
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const { props: p, panel: active } = latest.current
      const target = event.target instanceof Element ? event.target : null
      const action = cruiseShortcut(event.key, { editable: !!target?.closest('input,select,textarea,button,a,summary,[contenteditable="true"]'), modal: !!active, started: p.started, modified: event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey, repeat: event.repeat })
      if (!action) return
      if (action === 'back') { if(p.focused)p.onBackToDrive();return }
      event.preventDefault()
      if (action === 'glovebox') setPanel('home')
      if (action === 'radio') setPanel('stations')
      if (action === 'camera') p.onView(p.view === 'driver' ? 'chase' : 'driver')
      if (action === 'cinematic') p.onView(p.view === 'director' ? 'driver' : 'director')
      if (action === 'park') p.onPark?.()
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [])
  const playback = <div className="os-modal-playback" role="group" aria-label="Listening controls">
    <button onClick={props.audio.toggle}>{props.audio.requested ? 'Pause listening' : 'Start listening'}</button>
    <label>Volume<input aria-label="Glovebox radio volume" type="range" min={0} max={1} step={.01} value={props.audio.volume} onChange={event => props.audio.setVolume(Number(event.target.value))}/></label>
    <button aria-pressed={props.audio.muted} onClick={() => props.audio.setMuted(!props.audio.muted)}>{props.audio.muted ? 'Unmute' : 'Mute'}</button>
  </div>
  return <>
    <div className="os-world-ui" aria-label="Cruise world controls">
      <header className="os-header">
        <a className="os-brand" href="https://www.buenaondalifestyle.com/">BUENA ONDA<span>CRUISE / MIAMI</span></a>
        <div className="os-world-tools">
          {props.started && <><button type="button" aria-label={props.paused ? 'Resume autodrive' : 'Park autodrive'} aria-pressed={props.paused} onClick={props.onPark}>{props.paused ? 'Resume' : 'Autodrive on'}</button>
            <label className="os-camera"><span className="os-sr-only">Camera</span><select aria-label="Camera view" value={props.view} onChange={event => props.onView(event.target.value as Props['view'])}>{views.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label></>}
          <button ref={gloveboxTrigger} type="button" aria-haspopup="dialog" aria-expanded={panel !== null && !radioPanels.includes(panel)} onClick={() => setPanel('home')}>Glovebox</button>
        </div>
      </header>
      {!props.started && !props.listeningOnly && <section className="os-invitation" aria-label="Begin your cruise"><p className="os-eyebrow">REAL RADIO. AN OPEN ROAD.</p><h1>Take the<br/>long way.</h1><p>No Algorithms. Just Frequencies.</p><button className="os-start" aria-label="Start Cruising" onClick={props.onStart}>Start cruising <span aria-hidden="true">↗</span></button><button className="os-secondary" onClick={() => { props.onStart(); props.onListen() }}>Just listen</button><p className="os-readiness" role="status">{props.ready ? 'Your ride is ready. Radio starts with you.' : 'The radio is ready while Miami loads.'}</p></section>}
      {props.started && !props.ready && !props.listeningOnly && <p className="os-guidance" role="status">Preparing your ride. The radio is ready below.</p>}
      {props.started && props.ready && props.elapsed < 12 && <p className="os-guidance">Autodrive follows the road. You choose the frequency.</p>}
      {props.focused && <button className="os-return-drive" onClick={props.onBackToDrive}>Back to drive</button>}
    </div>
    <Glovebox page={panel && !radioPanels.includes(panel) ? panel as GloveboxPage : null} onPage={setPanel} onCollection={setPanel} listeningControls={playback}>
      {panel === 'garage' && <><p>Choose your ride. Your station keeps playing.</p><div className="os-rides">{rides.map(([id,name]) => <button key={id} aria-pressed={props.vehicle === id} onClick={() => props.onVehicle(id)}>{name}</button>)}</div>{!props.ready && <p role="status">Preparing {props.carLabel}...</p>}</>}
      {panel === 'places' && <div onClick={event=>{if((event.target as Element).closest('[data-return-world]'))setPanel(null)}}>{props.places}</div>}
      {panel === 'settings' && <><div className="os-settings"><label>Time of day<button aria-pressed={props.night} onClick={props.onNight}>{props.night ? 'Night / switch to sunset' : 'Sunset / switch to night'}</button></label><label>Scenery quality<select value={props.quality} onChange={event => props.onQuality(event.target.value as Props['quality'])}><option value="auto">Auto</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><button onClick={() => { props.listeningOnly ? props.onScenery() : props.onListen() }}>{props.listeningOnly ? 'Return to scenery' : 'Listen without 3D'}</button><label><input type="checkbox" checked={controller} onChange={event=>setController(event.target.checked)}/>Enable controller menu navigation</label><p role="status">{controllerStatus}</p>{props.settings}</div><details className="os-help"><summary>Controls and accessibility</summary><p>Autodrive follows the road. Tab moves between controls; Enter or Space activates a button. Escape closes a panel. Outside a control: R opens Radio, G opens Glovebox, V changes camera, D toggles Cinematic, Space parks.</p><p>System reduced motion is respected. Choose Cockpit or Coastal view for a stable camera, Park to stop the road, or Listen without 3D. All essential actions have labeled buttons; no dragging is required.</p><p>Optional standard controller: D-pad up/down moves focus, A activates, B goes back. Outside menus, Start opens Glovebox, X opens Radio and Y changes camera. Selects and volume retain their keyboard/touch controls. Analog steering and complete controller-only operation are not provided.</p></details><details className="os-help"><summary>Credits and sources</summary>{props.credits}<p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors / ODbL</a>. Textures: <a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">Poly Haven / CC0</a>. Adapted vehicles and cabins; radio plays directly from its stations.</p></details></>}
      {panel === 'postcards' && <PostcardStudio capture={props.capture} carLabel={props.carLabel} locationName={props.locationName} station={props.audio.station.name} metadata={props.metadata} url={props.shareUrl} available={props.started && props.ready && !props.listeningOnly} onShared={props.onShared}/>}
    </Glovebox>
    <DiscoveryConsole osCanFocusRadio={props.started} onOsBack={()=>setPanel('home')} osPanel={panel && radioPanels.includes(panel) ? panel as 'stations'|'presets'|'finds' : null} onOsPanel={setPanel} experienceMode sharePath="/cruise/os" audio={props.audio} metadata={props.metadata} credits={props.credits} listeningOnly={props.listeningOnly} onListeningOnly={() => props.listeningOnly ? props.onScenery() : props.onListen()} presence={props.presence} onPresence={props.onPresence} onFocusRadio={props.onFocusRadio} onAction={props.onAction}/>
  </>
}
