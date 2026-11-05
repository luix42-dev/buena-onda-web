'use client'
import {useCallback,useEffect,useRef,useState,type MutableRefObject} from 'react'
import type {RideVehicleId} from '@/lib/real-miami/ride-vehicles'
import './ocean-drive-game.css'

export type OceanDriveState={ready:boolean;vehicle:string;speed:number;acceleration:number;rpm:number;brake:number;elapsed:number;fps:number;calls:number;dpr:number;wheels:number;triangles:number;autopilot:boolean;riding:boolean;position:{x:number;z:number;yaw:number}|null}
export default function OceanDriveGame({vehicle,view,night,paused,covered,radio,muted,quality,active,onState,onRadio,onPark,exportIsland,captureRef}:{
 vehicle:RideVehicleId;view:string;night:boolean;paused:boolean;covered:boolean;radio:boolean;muted:boolean;active:boolean;quality:'low'|'medium'|'high'
 onState:(s:OceanDriveState)=>void;onRadio:()=>void;onPark:()=>void;exportIsland:()=>Promise<ArrayBuffer>
 captureRef:MutableRefObject<(()=>Promise<Blob>)|null>
}){
 const frame=useRef<HTMLIFrameElement>(null),latest=useRef({onState,onRadio,onPark,exportIsland}),settings=useRef({view,night,paused,hidden:covered,radio,muted})
 latest.current={onState,onRadio,onPark,exportIsland};settings.current={view,night,paused,hidden:covered,radio,muted}
 const [boot,setBoot]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(''),[autopilot,setAutopilot]=useState(true)
 const tier=quality
 const send=useCallback((type:string,extra:Record<string,unknown>={},transfer:Transferable[]=[])=>frame.current?.contentWindow?.postMessage({channel:'buena-onda-ocean-drive',type,...extra},location.origin,transfer),[])
 // Play/menu/radio live outside the iframe. Forward driving keys without
 // requiring a click on the scenery (clicking the car opens its radio).
 useEffect(()=>{
  if(!active||covered||!ready)return
  const held=new Set<string>(),codes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'])
  const release=()=>{held.clear();send('release-drive-keys')}
  const down=(event:KeyboardEvent)=>{
   const target=event.target instanceof Element?event.target:null
   if(!codes.has(event.code)||document.querySelector('dialog[open]')||event.ctrlKey||event.metaKey||event.altKey||target?.closest('input,textarea,select,[contenteditable="true"]')||(event.code==='Space'&&target?.closest('button,a,summary')))return
   event.preventDefault();event.stopImmediatePropagation()
   if(settings.current.paused&&!event.repeat){latest.current.onPark();send('take-wheel')}
   held.add(event.code);send('drive-key',{code:event.code,down:true})
  }
  const up=(event:KeyboardEvent)=>{if(held.delete(event.code)){event.preventDefault();send('drive-key',{code:event.code,down:false})}}
  const visibility=()=>{if(document.hidden)release()}
  addEventListener('keydown',down,true);addEventListener('keyup',up,true);addEventListener('blur',release);document.addEventListener('visibilitychange',visibility)
  return()=>{release();removeEventListener('keydown',down,true);removeEventListener('keyup',up,true);removeEventListener('blur',release);document.removeEventListener('visibilitychange',visibility)}
 },[active,covered,ready,send])
 const takeWheel=()=>{if(paused)onPark();send('take-wheel');frame.current?.focus()}
 useEffect(()=>{
  const input=(event:Event)=>{if(active&&!settings.current.hidden&&!settings.current.paused)send('phone-input',{input:(event as CustomEvent).detail})}
  const arm=()=>{if(active)send('phone-arm')},stop=()=>send('phone-stop')
  addEventListener('cruise:phone-input',input);addEventListener('cruise:phone-arm',arm);addEventListener('cruise:phone-stop',stop)
  return()=>{removeEventListener('cruise:phone-input',input);removeEventListener('cruise:phone-arm',arm);removeEventListener('cruise:phone-stop',stop)}
 },[active,send])
 useEffect(()=>{
  const travel=(e:Event)=>{const key=(e as CustomEvent).detail;if(active&&typeof key==='string'&&/^\d$/.test(key))send('travel',{key})}
  addEventListener('cruise:ocean-travel',travel);return()=>removeEventListener('cruise:ocean-travel',travel)
 },[active,send])
 const captures=useRef(new Map<string,{resolve:(blob:Blob)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>())
 useEffect(()=>{
  captureRef.current=()=>new Promise<Blob>((resolve,reject)=>{
   const id=crypto.randomUUID(),timer=setTimeout(()=>{captures.current.delete(id);reject(new Error('The City photo timed out.'))},10000)
   captures.current.set(id,{resolve,reject,timer});send('capture',{id})
  })
  return()=>{captureRef.current=null;for(const pending of captures.current.values()){clearTimeout(pending.timer);pending.reject(new Error('The City was closed.'))}captures.current.clear()}
 },[captureRef,send])
 useEffect(()=>{
  const receive=(e:MessageEvent)=>{
   if(e.origin!==location.origin||e.source!==frame.current?.contentWindow||e.data?.channel!=='buena-onda-ocean-drive')return
   const m=e.data
   if(m.type==='boot')setBoot(n=>n+1)
   else if(m.type==='ready'){setReady(true);setError('')}
   else if(m.type==='error')setError(m.message)
   else if(m.type==='radio')latest.current.onRadio()
   else if(m.type==='park')latest.current.onPark()
   else if(m.type==='phone-override')dispatchEvent(new Event('cruise:phone-local'))
   else if(m.type==='capture'){
    const pending=captures.current.get(m.id);if(pending){clearTimeout(pending.timer);captures.current.delete(m.id);pending.resolve(new Blob([m.bytes],{type:'image/png'}))}
   }
   else if(m.type==='autopilot')setAutopilot(!!m.enabled)
   else if(m.type==='state'){
    if(m.ready)setReady(true)
    latest.current.onState(m);setAutopilot(!!m.autopilot)
    document.documentElement.dataset.oceanDriveGame=JSON.stringify({...m,source:'StarKnightt/ocean-drive',nativePhysics:true})
   }
  }
  addEventListener('message',receive)
  return()=>{removeEventListener('message',receive);delete document.documentElement.dataset.oceanDriveGame}
 },[])
 useEffect(()=>{
  if(!boot)return
  let cancelled=false;setReady(false);setError('')
  const configure=async()=>{
   try{
    const bytes=vehicle==='island-trail'?await latest.current.exportIsland():undefined
    if(cancelled)return
    send('configure',{settings:settings.current,vehicle,...(bytes?{bytes}:{})},bytes?[bytes]:[])
   }catch(e){if(!cancelled)setError((e as Error).message)}
  }
  void configure();return()=>{cancelled=true}
 },[boot,vehicle,send])
 useEffect(()=>{if(boot)send('configure',{settings:settings.current})},[boot,view,night,paused,covered,radio,muted,send])
 return <section className={`ocean-drive-game${covered?' ocean-drive-covered':''}${!active?' ocean-drive-inactive':''}`} aria-label="Ocean Drive city" aria-hidden={!active}>
  <iframe ref={frame} title="Buena Onda Ocean Drive" src={`/real-miami/ocean-drive/game/index.html?autostart=1&nofs=1&quality=${tier}`} allow="autoplay; fullscreen" tabIndex={0}/>
  {error&&<div className="ocean-drive-error" role="alert"><p>{error}</p><button onClick={()=>{setError('');setReady(false);if(frame.current)frame.current.src=frame.current.src}}>Reload City</button><a href="?drive=city&city=legacy">Open previous City</a></div>}
  {ready&&!covered&&<div className="ocean-drive-actions" aria-label="City driving controls">
   <button onClick={()=>{if(autopilot||paused)takeWheel();else{send('toggle-cruise');frame.current?.focus()}}}>{autopilot||paused?'Drive yourself':'Cruise automatically'}</button>
   {!autopilot&&<button onClick={()=>{send('recover');frame.current?.focus()}}>Back to road</button>}
   <button onClick={onRadio}>Radio</button>
   {!autopilot&&<><span className="ocean-key-hint">WASD / arrows to drive · Space to brake</span><span className="ocean-touch-hint">Drag on the left to steer and accelerate. Release to coast.</span></>}
  </div>}
 </section>
}
