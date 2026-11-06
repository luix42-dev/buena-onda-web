'use client'
import {useEffect,useRef,useState} from 'react'
import {Camera,Check,ChevronDown,Maximize,Moon,Pause,Play,Radio,SkipBack,SkipForward,Sun,Volume2,VolumeX,X} from 'lucide-react'
import type {CameraView} from '@/components/experience/OpeningMinute'
import type {useCruiseAudio} from '@/components/real-miami/audio/useCruiseAudio'
import type {Chattiness} from '@/lib/cruise/nova/persona'
import {canPlayCruiseStation} from '@/lib/real-miami/stations'
import CastButton from './CastButton'
import './drive-deck.css'
import MobilePlayer from './MobilePlayer'
import {useMobileCruise} from '@/lib/cruise/preferences'
export type DriveMode='city'|'highway'|'retrowave'
export type DriveDeckProps={audio:ReturnType<typeof useCruiseAudio>;track:string|null;onSeek:(direction:number)=>void;onStations:()=>void;onSavedStations:()=>void;onSavedMusic:()=>void;favorites:readonly string[];stationSaved:boolean;onSaveStation:()=>void;songSaved:boolean;canSaveSong:boolean;songKind:'track'|'show';onSaveSong:()=>boolean;view:CameraView;onView:(view:CameraView)=>void;drive:DriveMode;onDrive:(drive:DriveMode)=>void;night:boolean;onNight:()=>void;sunlightLabel?:string;castParams:()=>Record<string,string>;onCasting:(active:boolean)=>void;onMenu:()=>void;companion?:{mode:Chattiness;onMode:(mode:Chattiness)=>void};engine?:{on:boolean;toggle:()=>void;label:string};onListen?:()=>void}
const cameras:[CameraView,string][]=[['low','Chase'],['driver','Cockpit'],['director','Cinematic']]
const names={city:'City',highway:'Highway',retrowave:'Retrowave'}
/** Live LaunchExperience interactions, connected to the existing game/audio owners. */
export default function DriveDeck(p:DriveDeckProps){
 const mobile=useMobileCruise()
 const [panel,setPanel]=useState<'drive'|'radio'|null>(null),root=useRef<HTMLDivElement>(null),opener=useRef<HTMLButtonElement|null>(null)
 const [saveNote,setSaveNote]=useState('')
 const a=p.audio,index=Math.max(0,cameras.findIndex(([id])=>id===p.view)),next=cameras[(index+1)%cameras.length]
 const playable=a.stations.filter(canPlayCruiseStation),presets=[...p.favorites.map(id=>playable.find(station=>station.id===id)).filter((station):station is typeof playable[number]=>!!station),...playable.filter(station=>!p.favorites.includes(station.id))].slice(0,6)
 useEffect(()=>setSaveNote(''),[a.stationId])
 useEffect(()=>{if(!panel)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setPanel(null);opener.current?.focus()}};const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setPanel(null)};addEventListener('keydown',key);document.addEventListener('pointerdown',outside,true);return()=>{removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside,true)}},[panel])
 const toggle=(which:'drive'|'radio',button:HTMLButtonElement)=>{opener.current=button;setPanel(value=>value===which?null:which)}
 if(mobile)return <MobilePlayer {...p}/>
 return <div className="dd dd-launch" ref={root} data-sheet={!!panel}>
  {panel==='drive'&&<section className="dd-sheet dd-drive-picker" role="dialog" aria-label="Choose your drive">
   <header><div><small>BUENA ONDA / CRUISE</small><strong>Take the long way.</strong></div><button className="dd-close" aria-label="Close drive selector" onClick={()=>setPanel(null)}><X size={18}/></button></header>
   <label>Choose your drive<select aria-label="Choose your drive" value={p.drive} onChange={e=>{p.onDrive(e.target.value as DriveMode);setPanel(null)}}><option value="city">City / Ocean Drive</option><option value="highway">Highway / I-95</option><option value="retrowave">Retrowave / Neon city &amp; skyway</option></select></label>
   <p>{p.drive==='city'?'Ocean Drive, side streets, and your own pace.':p.drive==='highway'?'An open highway. Settle into your station.':'Neon streets climb into a looping skyway. The DeLorean lives here.'}</p>
   {p.companion&&<label>NOVA<select aria-label="NOVA conversation" value={p.companion.mode} onChange={e=>p.companion!.onMode(e.target.value as Chattiness)}><option value="off">Off</option><option value="quiet">Quiet</option><option value="occasional">Occasional</option><option value="chatty">Chatty</option></select></label>}
   {p.engine&&<button className="dd-engine" aria-pressed={p.engine.on} onClick={p.engine.toggle}>Engine sound: {p.engine.on?'On':'Off'}{p.engine.label&&<small> / {p.engine.label}</small>}</button>}
   <footer>{p.onListen&&<button onClick={()=>{setPanel(null);p.onListen!()}}>Just the radio</button>}<button onClick={()=>{setPanel(null);p.onMenu()}}>Places &amp; settings</button></footer>
  </section>}
  {panel==='radio'&&<section className="dd-sheet dd-radio-picker" role="dialog" aria-label="Radio stations">
   <header><strong>Buena Onda Radio</strong><button className="dd-close" aria-label="Close radio stations" onClick={()=>setPanel(null)}><X size={18}/></button></header>
   <div className="dd-radio-saves"><div><small>ON AIR / {a.station.name}</small><p>{p.canSaveSong&&p.track?p.track:'Track information unavailable.'}</p></div><div className="dd-save-actions"><button aria-label={p.stationSaved?'Remove saved station':'Save station'} aria-pressed={p.stationSaved} onClick={p.onSaveStation}>{p.stationSaved?'Station saved':'Save station'}</button>{p.canSaveSong&&<button aria-label={p.songKind==='show'?'Bookmark current broadcast':'Save current song'} aria-pressed={p.songSaved} onClick={()=>{if(p.onSaveSong())setSaveNote(p.songKind==='show'?'Broadcast saved':'Song saved')}}>{p.songSaved?p.songKind==='show'?'Broadcast saved':'Song saved':p.songKind==='show'?'Save broadcast':'Save song'}</button>}</div>{saveNote&&<p role="status" className="dd-save-note">{saveNote}</p>}</div>
   <div className="dd-station-list" aria-label="Six quick presets">{presets.map((station,slot)=><button key={station.id} aria-pressed={a.stationId===station.id} onClick={()=>{a.selectStation(station.id);a.start()}}><span><small>0{slot+1} / {p.favorites.includes(station.id)?'Saved preset':'Quick preset'}</small>{station.name}</span>{a.stationId===station.id&&<Check size={16}/>}</button>)}</div>
   <footer><button onClick={()=>{setPanel(null);p.onStations()}}>Browse all stations</button><button onClick={()=>{setPanel(null);p.onSavedStations()}}>Saved stations</button><button onClick={()=>{setPanel(null);p.onSavedMusic()}}>Saved songs</button></footer>
  </section>}
  <div className="dd-bar" role="toolbar" aria-label="Radio and view controls">
   <div className="dd-radio">
    <button className="dd-icon" onClick={a.toggle} aria-label={a.requested?'Pause radio':'Play radio'}>{a.requested?<Pause size={19}/>:<Play size={19}/>}</button>
    <button className="dd-icon dd-presets" aria-label="Quick radio presets" aria-expanded={panel==='radio'} aria-haspopup="dialog" onClick={e=>toggle('radio',e.currentTarget)}><Radio size={18}/></button>
    <button className="dd-station" aria-label={`Explore radio stations. Current station: ${a.station.name}`} aria-haspopup="dialog" onClick={()=>{setPanel(null);p.onStations()}}><span className="dd-eyebrow">Explore stations <Radio size={12}/></span><strong>{a.loading||a.tuning?'Tuning in…':a.station.name}</strong></button>
    <button className="dd-icon" onClick={()=>a.setMuted(!a.muted)} aria-label={a.muted?'Unmute radio':'Mute radio'}>{a.muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
    <label className="dd-volume"><span className="dd-sr">Radio volume</span><input aria-label="Radio volume" type="range" min={0} max={1} step={.01} value={a.volume} onChange={e=>{a.setVolume(Number(e.target.value));a.setMuted(false)}}/></label>
    <button className="dd-icon dd-step" aria-label="Previous station" onClick={()=>p.onSeek(-1)}><SkipBack size={16}/></button><button className="dd-icon dd-step" aria-label="Next station" onClick={()=>p.onSeek(1)}><SkipForward size={16}/></button>
   </div>
   <div className="dd-view">
    <button className="dd-chip" aria-label={`Camera: ${cameras[index][1]}. Switch to ${next[1]}`} title={`Switch to ${next[1]}`} onClick={()=>{setPanel(null);p.onView(next[0])}}><Camera size={18}/><span>{cameras[index][1]}</span><small className="dd-cycle" aria-hidden="true">↻</small></button>
    <button className="dd-chip" aria-label={`Light: ${p.night?'Night':'Day'}. Switch to ${p.night?'Day':'Night'}`} title={`Switch to ${p.night?'Day':'Night'}`} onClick={()=>{setPanel(null);p.onNight()}}>{p.night?<Moon size={18}/>:<Sun size={18}/>}<span>{p.night?'Night':'Day'}</span></button>
    <button className="dd-chip" aria-label={`Drive: ${names[p.drive]}`} aria-expanded={panel==='drive'} aria-haspopup="dialog" onClick={e=>toggle('drive',e.currentTarget)}><span>{names[p.drive]}</span><ChevronDown size={15}/></button>
    <CastButton audio={p.audio} params={p.castParams} onCasting={p.onCasting}/>
    <button className="dd-icon" aria-label="Fullscreen" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen?.().catch(()=>{})}}><Maximize size={18}/></button>
   </div>
  </div>
  {a.error&&<p className="dd-error" role="status">{a.error} <button onClick={a.start}>Retry radio</button></p>}
 </div>
}
