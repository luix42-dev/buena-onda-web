'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import HybridWorldPlayer from './hybrid/HybridWorldPlayer'
import CalibratedHybridWorld,{type HybridCalibration} from './hybrid/CalibratedHybridWorld'
import InteractiveWorld,{type InteractiveCameraMode} from './InteractiveWorld'
import type {HybridContent,HybridPlaybackSnapshot,HybridSegment} from './hybrid/contract'
import type {CruiseCampaign,CruiseDirectorShot,CruiseVehicleId} from '@/lib/cruise/types'
import {useCockpit} from '../vehicle/CockpitContext'
import WorldAmbience from './WorldAmbience'

type Source={id:string;name:string;status:string;segments:HybridSegment[];content:HybridContent;posterUrl?:string;qualityAccepted:boolean;calibration?:HybridCalibration}
type Manifest={schemaVersion:number;status:string;sources:Source[]}
type WorldSnapshot={source:string;status:string;qualityAccepted:boolean;playback:HybridPlaybackSnapshot|null;radio:{station:string;playing:boolean;muted:boolean;volume:number};vehicle:CruiseVehicleId;paused:boolean;cameraMode:string;shot:CruiseDirectorShot;radioFocused:boolean}
const interactiveSource:Source={id:'interactive',name:'Original world / live cameras & billboards',status:'Original real-time scene with house billboards. Radio continues through camera changes.',segments:[],content:'environmentOnly',qualityAccepted:false}
declare global{interface Window{__worldFirst?:()=>WorldSnapshot;__worldPlayback?:HybridPlaybackSnapshot}}

export default function WorldVisual({vehicle,paint,onReady,radioPlaying,radioMuted,radioFocused,onRadio,onCloseRadio}:{vehicle:CruiseVehicleId;paint?:string;onReady:()=>void;radioPlaying:boolean;radioMuted:boolean;radioFocused:boolean;onRadio:()=>void;onCloseRadio:()=>void}){
 const [manifest,setManifest]=useState<Manifest|null>(null)
 const [selected,setSelected]=useState(()=>{const requested=typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('source');return requested&&['hybrid','unreal','reference','interactive','director'].includes(requested)?requested:'hybrid'})
 const [cameraMode,setCameraMode]=useState<InteractiveCameraMode>('driver'),[shot,setShot]=useState<CruiseDirectorShot>('driver')
 const [paused,setPaused]=useState(false),[playback,setPlayback]=useState<HybridPlaybackSnapshot|null>(null),[restart,setRestart]=useState(0),[error,setError]=useState('')
 const [toolsOpen,setToolsOpen]=useState(false),[ad,setAd]=useState<{id:string;campaign:CruiseCampaign}|null>(null)
 const fingerprint=useRef(''),cockpit=useCockpit(),snapshot=useRef<WorldSnapshot|null>(null),mounted=useRef(true)
 const sources=[...(manifest?.sources||[]),interactiveSource]
 const source=sources.find(s=>s.id===selected),interactive=selected==='interactive',hasMedia=!!source?.segments.length,hasMotion=interactive||hasMedia
 snapshot.current={source:selected,status:source?.status||'Loading local manifest',qualityAccepted:!!source?.qualityAccepted,playback,radio:{station:cockpit?.audio.stationId||'',playing:radioPlaying,muted:radioMuted,volume:cockpit?.audio.volume||0},vehicle,paused,cameraMode:interactive?cameraMode:selected==='director'?'authored-director':'fixed-cockpit',shot,radioFocused}
 useEffect(()=>{
  mounted.current=true;const controller=new AbortController()
  const load=async()=>{try{const res=await fetch('/cruise/experiments/world-first/manifest.json',{cache:'no-store',signal:controller.signal});if(!res.ok)throw new Error('World manifest unavailable');const data:Manifest=await res.json();if(!Array.isArray(data.sources))throw new Error('Invalid world manifest');const text=JSON.stringify(data);if(mounted.current&&text!==fingerprint.current){fingerprint.current=text;setManifest(data)}if(mounted.current)setError('')}catch(e){if(mounted.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'World manifest unavailable')}}
  void load();const timer=setInterval(()=>void load(),4000);window.__worldFirst=()=>snapshot.current!
  return()=>{mounted.current=false;controller.abort();clearInterval(timer);delete window.__worldFirst;delete window.__worldPlayback}
 },[])
 useEffect(()=>{if(manifest||error)onReady()},[manifest,error,onReady])
 const report=useCallback((s:HybridPlaybackSnapshot)=>{window.__worldPlayback=s;setPlayback(s)},[])
 const ready=useCallback((value:boolean)=>{if(value)onReady()},[onReady])
 const failed=useCallback(()=>setError('The real-time scene is unavailable. Your radio remains independent.'),[])
 const activateAd=useCallback((id:string,campaign:CruiseCampaign)=>setAd({id,campaign}),[])
 function changeSource(id:string){setSelected(id);setPlayback(null);delete window.__worldPlayback;setPaused(false);setAd(null);setError('')}
 function liveCamera(mode:InteractiveCameraMode){onCloseRadio();setCameraMode(mode);changeSource('interactive')}
 const props={segments:source?.segments||[],paused,posterUrl:source?.posterUrl,onReady:ready,onPlayback:report,restartKey:restart,loop:false}
 return <div className="world-visual" data-world-source={selected} data-world-quality={source?.qualityAccepted?'accepted':'unaccepted'}>
  {interactive?<InteractiveWorld vehicleId={vehicle} paint={paint} cameraMode={cameraMode} paused={paused} radioFocused={radioFocused} onReady={onReady} onFailure={failed} onShotChange={setShot} onAdActivate={activateAd}/>:selected==='hybrid'&&source?.calibration?<CalibratedHybridWorld {...props} calibration={source.calibration} candidateMode/>:<HybridWorldPlayer {...props}/>}
  {!hasMedia&&!interactive&&source?.posterUrl&&<img className="world-still" src={source.posterUrl} alt="Actual Unreal checkpoint"/>}
  <nav hidden={radioFocused} className="world-view-bar" aria-label="Cruise views">
   <button aria-label="Cockpit view" aria-pressed={selected==='hybrid'} onClick={()=>{onCloseRadio();changeSource('hybrid')}}>Cockpit</button>
   <button aria-label="Open radio" aria-pressed={radioFocused} onClick={onRadio}>Radio</button>
   <button aria-label="City director cut" aria-pressed={selected==='director'} disabled={!sources.find(s=>s.id==='director')?.segments.length} onClick={()=>{onCloseRadio();changeSource('director')}}>Director cut</button>
   <button aria-label="Live director camera" aria-pressed={interactive&&cameraMode==='director'} onClick={()=>liveCamera('director')}>Live director</button>
   <button aria-label="Billboard view" aria-pressed={interactive&&cameraMode==='chase'} onClick={()=>liveCamera('chase')}>Billboards</button>
  </nav>
  <section hidden={radioFocused} className={`world-proof-tools ${toolsOpen?'':'world-tools-compact'}`} aria-label="World prototype comparison">
   <div><b>{interactive?`LIVE / ${cameraMode.toUpperCase()}`:'WORLD FIRST / LOCAL PROOF'}</b><button aria-label={toolsOpen?'Hide world comparison':'Show world comparison'} aria-expanded={toolsOpen} onClick={()=>setToolsOpen(v=>!v)}>{toolsOpen?'−':'+'}</button></div>
   <label>Visual approach<select aria-label="Visual approach" value={selected} onChange={e=>changeSource(e.target.value)}>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <p role="status">{error||source?.status||'Reading scene manifest…'}</p>
   <small>{source?.qualityAccepted?'Visual quality accepted.':'Experimental visual quality.'} {selected==='reference'?'Reference diagnostic.':interactive?'House creatives only. The Avenue stays hidden.':selected==='director'?'Authored environmental camera cuts; no vehicle baked into this preview.':'Fixed-camera world plate with the existing browser cockpit.'}</small>
   <div className="world-playback-controls"><button disabled={!hasMotion} aria-label={paused?'Resume cinematic world':'Pause cinematic world'} onClick={()=>setPaused(v=>!v)}>{paused?'Resume world':'Pause world'}</button><button disabled={!hasMedia} onClick={()=>{setRestart(v=>v+1);setPaused(false)}}>Replay proof</button><span>{interactive?`Camera: ${radioFocused?'radio':shot}`:playback?`${playback.timelineSeconds.toFixed(1)}s / ${playback.status}`:'Motion not available'}</span></div>
   {!interactive&&<WorldAmbience playback={playback} authored={source?.content==='environmentOnly'} radioPlaying={radioPlaying} radioMuted={radioMuted}/>}
   <p className="world-smallprint">{interactive?'Live cameras use the original scene and your selected garage car.':'The cockpit checkpoint uses Island Trail. Director cuts are rendered views of the latest city; camera switching does not restart your radio.'}</p>
  </section>
  {ad&&<section className="world-house-ad" role="dialog" aria-label="House billboard creative"><button aria-label="Close billboard details" onClick={()=>setAd(null)}>Close</button><small>HOUSE CREATIVE / LOCAL PREVIEW</small><h2>{ad.campaign.name}</h2><p>Placement: {ad.id}. No live advertising or ownership transaction.</p></section>}
 </div>
}
