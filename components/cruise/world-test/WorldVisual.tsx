'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import HybridWorldPlayer from './hybrid/HybridWorldPlayer'
import CalibratedHybridWorld,{type HybridCalibration} from './hybrid/CalibratedHybridWorld'
import type {HybridContent,HybridPlaybackSnapshot,HybridSegment} from './hybrid/contract'
import type {CruiseVehicleId} from '@/lib/cruise/types'
import {useCockpit} from '../vehicle/CockpitContext'
import WorldAmbience from './WorldAmbience'
type Source={id:string;name:string;status:string;segments:HybridSegment[];content:HybridContent;posterUrl?:string;qualityAccepted:boolean;calibration?:HybridCalibration}
type Manifest={schemaVersion:number;status:string;sources:Source[]}
type WorldSnapshot={source:string;status:string;qualityAccepted:boolean;playback:HybridPlaybackSnapshot|null;radio:{station:string;playing:boolean;muted:boolean;volume:number};vehicle:CruiseVehicleId;paused:boolean}
declare global{interface Window{__worldFirst?:()=>WorldSnapshot;__worldPlayback?:HybridPlaybackSnapshot}}
export default function WorldVisual({vehicle,onReady,radioPlaying,radioMuted}:{vehicle:CruiseVehicleId;onReady:()=>void;radioPlaying:boolean;radioMuted:boolean}){
 const [manifest,setManifest]=useState<Manifest|null>(null),[selected,setSelected]=useState('unreal'),[paused,setPaused]=useState(false),[playback,setPlayback]=useState<HybridPlaybackSnapshot|null>(null),[restart,setRestart]=useState(0),[error,setError]=useState('')
 const fingerprint=useRef(''),cockpit=useCockpit(),snapshot=useRef<WorldSnapshot|null>(null),mounted=useRef(true)
 const source=manifest?.sources.find(s=>s.id===selected),hasMedia=!!source?.segments.length
 snapshot.current={source:selected,status:source?.status||'Loading local manifest',qualityAccepted:!!source?.qualityAccepted,playback,radio:{station:cockpit?.audio.stationId||'',playing:radioPlaying,muted:radioMuted,volume:cockpit?.audio.volume||0},vehicle,paused}
 useEffect(()=>{mounted.current=true;const controller=new AbortController();const load=async()=>{try{const res=await fetch('/cruise/experiments/world-first/manifest.json',{cache:'no-store',signal:controller.signal});if(!res.ok)throw new Error('World manifest unavailable');const data:Manifest=await res.json();if(!Array.isArray(data.sources))throw new Error('Invalid world manifest');const text=JSON.stringify(data);if(mounted.current&&text!==fingerprint.current){fingerprint.current=text;setManifest(data)}if(mounted.current)setError('')}catch(e){if(mounted.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'World manifest unavailable')}};void load();const timer=setInterval(()=>void load(),4000);window.__worldFirst=()=>snapshot.current!;return()=>{mounted.current=false;controller.abort();clearInterval(timer);delete window.__worldFirst;delete window.__worldPlayback}},[])
 // Interface readiness is deliberately separate from rendered-quality acceptance.
 useEffect(()=>{if(manifest||error)onReady()},[manifest,error,onReady])
 const report=useCallback((s:HybridPlaybackSnapshot)=>{window.__worldPlayback=s;setPlayback(s)},[])
 const ready=useCallback((value:boolean)=>{if(value)onReady()},[onReady])
 const props={segments:source?.segments||[],paused,posterUrl:source?.posterUrl,onReady:ready,onPlayback:report,restartKey:restart,loop:false}
 return <div className="world-visual" data-world-source={selected} data-world-quality={source?.qualityAccepted?'accepted':'unaccepted'}>
  {selected==='hybrid'&&source?.calibration?<CalibratedHybridWorld {...props} calibration={source.calibration} candidateMode/>:<HybridWorldPlayer {...props}/>}
  {!hasMedia&&source?.posterUrl&&<img className="world-still" src={source.posterUrl} alt="Actual native Unreal world checkpoint; motion not yet rendered"/>}
  <section className="world-proof-tools" aria-label="World prototype comparison"><div><b>WORLD FIRST / LOCAL PROOF</b><button aria-label="Hide world comparison" onClick={e=>e.currentTarget.closest('section')?.classList.toggle('world-tools-compact')}>−</button></div><label>Visual approach<select aria-label="Visual approach" value={selected} onChange={e=>{setSelected(e.target.value);setPlayback(null);setPaused(false)}}>{manifest?.sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><p role="status">{error||source?.status||'Reading scene manifest…'}</p><small>{source?.qualityAccepted?'Visual quality accepted.':'Visual quality has not passed review.'} {selected==='reference'?'Reference diagnostic only; not the fictional city.':source?.content==='environmentOnly'?'Environment-only checkpoint; baked cockpit is not present.':''}</small>
   <div className="world-playback-controls"><button disabled={!hasMedia} aria-label={paused?'Resume cinematic world':'Pause cinematic world'} onClick={()=>setPaused(v=>!v)}>{paused?'Resume world':'Pause world'}</button><button disabled={!hasMedia} onClick={()=>{setRestart(v=>v+1);setPaused(false)}}>Replay proof</button><span>{playback?`${playback.timelineSeconds.toFixed(1)}s / ${playback.status}`:'Motion not available'}</span></div>
   <WorldAmbience playback={playback} authored={source?.content==='environmentOnly'} radioPlaying={radioPlaying} radioMuted={radioMuted}/>
   <p className="world-smallprint">Original garage selection is preserved. A rendered film uses its authored cabin; changing the garage car does not replace baked pixels.</p>
  </section>
 </div>
}
