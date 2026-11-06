'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { OpeningMinuteProps } from '@/components/experience/OpeningMinute'
import type { useCruiseAudio } from '@/components/real-miami/audio/useCruiseAudio'
import type { HumanRadioMetadata } from '@/lib/human-radio/metadata'
import DiscoveryConsole from '@/components/human-radio/DiscoveryConsole'
import type { useDiscoveries } from '@/components/human-radio/useDiscoveries'
import type { useRadioMemories } from '@/components/human-radio/useRadioMemories'
import { cruiseShortcut } from '@/lib/cruise-os/input'
import { cruiseLookEnabled } from '@/lib/cruise-os/look'
import RidePicker from '@/components/real-miami/jeep/RidePicker'
import Glovebox, { type GloveboxPage } from './Glovebox'
import PostcardStudio from './PostcardStudio'
import { useCruiseGamepad } from './useCruiseGamepad'
import { useCastSenderConnection } from './useCastSenderConnection'
import './cruise-os.css'
import PrototypeOpening from '@/components/experience/PrototypeOpening'
import DriveDeck, { type DriveMode } from './DriveDeck'
import NovaCaption from './NovaCaption'
import Promotion from './Promotion'
import {useCruisePreference,useMobileCruise} from '@/lib/cruise/preferences'
import RadioReturn from './RadioReturn'
import RadioFaceControls from './RadioFaceControls'
import type { GiantAd } from '@/lib/cruise/nova/giant-ads'
import { trackCruiseEvent } from '@/lib/cruise/analytics'
import type { Chattiness, Line } from '@/lib/cruise/nova/persona'

type Panel = GloveboxPage | 'stations' | 'presets' | 'finds' | null
type Props = OpeningMinuteProps & {
  quickStart?: boolean
  onGarage?: () => void
  sunlightLabel?: string
  mood?: string
  audio: ReturnType<typeof useCruiseAudio>; metadata: HumanRadioMetadata | null
  radioLibrary: ReturnType<typeof useDiscoveries>
  radioMemories: ReturnType<typeof useRadioMemories>
  listeningOnly: boolean; onScenery: () => void; presence: boolean; onPresence: () => void
  onFocusRadio: () => void; focused: boolean; radioFocused?: boolean; onBackToDrive: () => void
  credits: ReactNode; settings: ReactNode; places: ReactNode; carLabel: string; locationName: string
  capture: () => Promise<Blob>; shareUrl: string; onShared: () => void
  onAction: (event: 'station_change' | 'station_save' | 'verified_song_save' | 'share') => void
  onOverlayChange: (open: boolean) => void
  /** Look v2: drive mode and the deck's station stepping. Omitted outside the prototype look. */
  drive?: DriveMode; onDrive?: (drive: DriveMode) => void; onSeek?: (direction: number) => void; track?: string | null
  companion?: { mode: Chattiness; onMode: (mode: Chattiness) => void; line: Line | null; speaking?: boolean }
  engine?: { on: boolean; toggle: () => void; label: string }
  /** Giant NOVA's house ad on air: disclosed and subtitled here, never in the companion card. */
  ad?: GiantAd | null
}
const rides = [ ['coastal-coupe','Coastal Coupe'], ['classic-coupe','Classic Coupe'], ['island-trail','Island Trail'], ['countach','Lamborghini Countach / 5000QV'], ['delorean','DeLorean / DMC-12'] ] as const
// Wheel shots live inside Cinematic (Director inserts), not as separate cameras.
const views = [['driver','Cockpit'],['low','Chase'],['chase','Coastal view'],['director','Cinematic']] as const
const lookOnly: readonly string[] = ['low']
const radioPanels = ['stations','presets','finds']

/** Presentation/navigation only. Audio and scene lifetimes remain owned by JeepNight. */
export default function CruiseOS(props: Props) {
  useCastSenderConnection()
  const mobile=useMobileCruise(),[novaEnabled]=useCruisePreference('nova',false)
  const [panel, setPanel] = useState<Panel>(null)
  const radioLibrary = props.radioLibrary
  const saveStation = () => { if (!radioLibrary.favorites.includes(props.audio.stationId)) props.onAction('station_save'); radioLibrary.toggleFavorite(props.audio.stationId) }
  const saveSong = () => {
    if (!radioLibrary.canSave) return false
    if (!radioLibrary.isSaved && props.metadata?.kind === 'track') props.onAction('verified_song_save')
    radioLibrary.toggleSave()
    return true
  }
  const [look] = useState(cruiseLookEnabled)
  const [radioLearned, setRadioLearned] = useState(false)
  useEffect(() => { if(props.focused) setRadioLearned(true) }, [props.focused])
  useEffect(() => {
    if(!props.quickStart || !props.started) return
    const timer=setTimeout(()=>setRadioLearned(true),45000)
    return()=>clearTimeout(timer)
  }, [props.quickStart,props.started])
  useEffect(() => { if(props.quickStart && panel==='stations') setRadioLearned(true) }, [props.quickStart,panel])
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
  const deck = look && !!props.drive && !!props.onDrive && props.started && !props.listeningOnly
  const playback = <div className="os-modal-playback" role="group" aria-label="Listening controls">
    <button onClick={props.audio.toggle}>{props.audio.requested ? 'Pause listening' : 'Start listening'}</button>
    <label>Volume<input aria-label="Glovebox radio volume" type="range" min={0} max={1} step={.01} value={props.audio.volume} onChange={event => props.audio.setVolume(Number(event.target.value))}/></label>
    <button aria-pressed={props.audio.muted} onClick={() => props.audio.setMuted(!props.audio.muted)}>{props.audio.muted ? 'Unmute' : 'Mute'}</button>
  </div>
  return <>
    <div className="os-world-ui" aria-label="Cruise world controls">
      <header className="os-header">
        <a className="os-brand" href="https://www.buenaondalifestyle.com/">Buena Onda<span>CRUISE / MIAMI</span></a>
        <div className="os-world-tools">
          {props.started && !deck && <><label className="os-camera"><span className="os-sr-only">Camera</span><select aria-label="Camera view" value={props.view} onChange={event => props.onView(event.target.value as Props['view'])}>{views.filter(([id]) => !lookOnly.includes(id) || look).map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label></>}
          {props.quickStart&&props.started&&props.onGarage?<button type="button" onClick={()=>{setPanel(null);props.onGarage!()}}>← Garage</button>:<button ref={gloveboxTrigger} type="button" aria-haspopup="dialog" aria-expanded={panel !== null && !radioPanels.includes(panel)} onClick={() => setPanel('home')}>Menu</button>}
        </div>
      </header>
      {!props.started && !props.listeningOnly && (props.quickStart?<PrototypeOpening onPlay={props.onStart} onListen={props.onListen} vehicle={props.vehicle} onVehicle={props.onVehicle} night={props.night} onNight={props.onNight} ready={props.ready} drive={props.drive} onDrive={props.onDrive}/>:<RidePicker cruiseOS humanRadio vehicle={props.vehicle} onSelect={props.onVehicle} night={props.night} onNightChange={night=>{if(night!==props.night)props.onNight()}} onStart={props.onStart} ready={props.ready} routeReady={props.ready}/>)}
      {props.started && !props.ready && !props.listeningOnly && <p className="os-guidance" role="status">Loading the scenery. Your radio is below.</p>}
      {props.started && props.ready && !props.listeningOnly && !props.focused && !radioLearned && props.view==='driver' && <div className="os-guidance os-radio-hint"><button onClick={props.onFocusRadio}>Tap the radio to tune in</button><span>Autodrive is on. Change your view {deck?'below':'above'}.</span><button className="os-hint-dismiss" aria-label="Dismiss radio guide" onClick={()=>setRadioLearned(true)}>Got it</button></div>}
      {props.focused && <RadioReturn onBack={props.onBackToDrive}/>}
      {props.radioFocused && <RadioFaceControls audio={props.audio} favorites={radioLibrary.favorites} stationSaved={radioLibrary.favorites.includes(props.audio.stationId)} canSaveFind={radioLibrary.canSave} findSaved={radioLibrary.isSaved} findKind={props.metadata?.kind === 'show' ? 'show' : 'track'} onSaveStation={saveStation} onSaveFind={saveSong} onStationChange={() => props.onAction('station_change')} onStations={() => setPanel('stations')} onFinds={() => setPanel('finds')}/>}
    </div>
    <Glovebox page={panel && !radioPanels.includes(panel) ? panel as GloveboxPage : null} onPage={setPanel} onCollection={setPanel} listeningControls={playback}>
      {panel === 'garage' && <><p>Choose your ride. Your station keeps playing.</p><div className="os-rides">{rides.filter(([id])=>!props.drive||props.drive==='retrowave'||id!=='delorean').map(([id,name]) => <button key={id} aria-pressed={props.vehicle === id} onClick={() => props.onVehicle(id)}>{name}</button>)}</div>{props.drive&&props.drive!=='retrowave'&&<p>The DeLorean is available in Retrowave.</p>}{!props.ready && <p role="status">Preparing {props.carLabel}...</p>}</>}
      {panel === 'places' && <div onClick={event=>{if((event.target as Element).closest('[data-return-world]'))setPanel(null)}}>{props.places}</div>}
      {panel === 'settings' && <><div className="os-settings"><button onClick={props.onPark} disabled={!props.started}>{props.paused?'Resume driving':'Park the car'}</button><label>Time of day<button aria-pressed={props.night} onClick={props.onNight}>{props.night ? 'Night / switch to sunset' : 'Sunset / switch to night'}</button></label><label>Scenery quality<select value={props.quality} onChange={event => props.onQuality(event.target.value as Props['quality'])}><option value="auto">Auto</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><button onClick={() => { props.listeningOnly ? props.onScenery() : (()=>{if(!props.started)props.onStart();props.onListen()})() }}>{props.listeningOnly ? 'Return to scenery' : 'Listen without 3D'}</button><label><input type="checkbox" checked={controller} onChange={event=>setController(event.target.checked)}/>Enable controller menu navigation</label><p role="status">{controllerStatus}</p>{props.settings}</div><details className="os-help"><summary>Controls and accessibility</summary><p>Autodrive follows the road. Tab moves between controls; Enter or Space activates a button. Escape closes a panel. Outside a control: R opens Radio, G opens Menu, V changes camera, D toggles Cinematic, Space parks.</p><p>System reduced motion is respected. Choose Cockpit or Coastal view for a stable camera, Park to stop the road, or Listen without 3D. All essential actions have labeled buttons; no dragging is required.</p><p>Optional standard controller: D-pad up/down moves focus, A activates, B goes back. Outside menus, Start opens Menu, X opens Radio and Y changes camera. Selects and volume retain their keyboard/touch controls. Analog steering and complete controller-only operation are not provided.</p></details><details className="os-help"><summary>Credits and sources</summary>{props.credits}<p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors / ODbL</a>. Textures: <a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">Poly Haven / CC0</a>. Adapted vehicles and cabins; radio plays directly from its stations.</p></details></>}
      {panel === 'postcards' && <PostcardStudio capture={props.capture} carLabel={props.carLabel} locationName={props.locationName} station={props.audio.station.name} metadata={props.metadata} url={props.shareUrl} available={props.started && props.ready && !props.listeningOnly} onShared={props.onShared}/>}
    </Glovebox>
    {deck && props.drive && props.onDrive && <DriveDeck sunlightLabel={props.sunlightLabel} audio={props.audio} track={props.track ?? null} onSeek={props.onSeek ?? (() => {})} onStations={() => setPanel('stations')} onSavedStations={() => setPanel('presets')} onSavedMusic={() => setPanel('finds')} favorites={radioLibrary.favorites} stationSaved={radioLibrary.favorites.includes(props.audio.stationId)} onSaveStation={saveStation} songSaved={radioLibrary.isSaved} canSaveSong={radioLibrary.canSave} songKind={props.metadata?.kind === 'show' ? 'show' : 'track'} onSaveSong={saveSong} view={props.view} onView={props.onView} drive={props.drive} onDrive={props.onDrive} night={props.night} onNight={props.onNight} castParams={() => ({ mood: props.mood || 'night-drive', station: props.audio.stationId, drive: props.drive!, time: props.night ? 'night' : 'sunset', ...(props.vehicle ? { car: props.vehicle } : {}) })} onMenu={() => setPanel('home')} companion={props.companion} engine={props.engine} onListen={props.onListen}/>}
    {deck && props.companion && (!mobile||novaEnabled) && <NovaCaption line={props.companion.line} speaking={!!props.companion.speaking}/>}
    {deck && props.ad && <Promotion id="buena-onda">{props.ad.text} <a href={props.ad.destination} target="_blank" rel="noopener noreferrer" onClick={()=>trackCruiseEvent('cruise_ad_cta',{placement_id:'RETRO-NOVA',format:'hud',campaign_id:'buena-onda',destination:props.ad!.destination})}>Explore ↗</a></Promotion>}
    <DiscoveryConsole sharedLibrary={radioLibrary} sharedMemories={props.radioMemories} osShowDeck={(props.started||props.listeningOnly) && !deck} osCanFocusRadio={props.started} onOsBack={()=>setPanel('home')} osPanel={panel && radioPanels.includes(panel) ? panel as 'stations'|'presets'|'finds' : null} onOsPanel={setPanel} experienceMode sharePath={props.quickStart?'/cruise':'/cruise/os'} audio={props.audio} metadata={props.metadata} credits={props.credits} listeningOnly={props.listeningOnly} onListeningOnly={() => props.listeningOnly ? props.onScenery() : (()=>{if(!props.started)props.onStart();props.onListen()})()} presence={props.presence} onPresence={props.onPresence} onFocusRadio={props.onFocusRadio} onAction={props.onAction}/>
  </>
}
