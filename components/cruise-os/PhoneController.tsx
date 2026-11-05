'use client'
import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react'
import {createControllerLink,type ControllerLink,type LinkStatus} from '@/lib/cruise/controller-link'
import {validRoom,RADIO_PROTOCOL_VERSION,type ControllerAction,type ControllerState,type RadioRemoteAction,type RadioRemoteAck} from '@/lib/cruise/controller-protocol'
import RadioRemote from './RadioRemote'
import './phone-controller.css'
const neutral=()=>({steer:0,throttle:0,brake:0})
export default function PhoneController(){
 const [room,setRoom]=useState(''),[status,setStatus]=useState<LinkStatus>('pairing'),[message,setMessage]=useState(''),[started,setStarted]=useState(false)
 const [host,setHost]=useState<ControllerState|null>(null),[axes,setAxes]=useState(neutral),[wakeNote,setWakeNote]=useState('')
 const [landscape,setLandscape]=useState(false)
 const [mode,setMode]=useState<'drive'|'radio'>('drive'),[radioNotice,setRadioNotice]=useState('')
 const input=useRef(neutral()),link=useRef<ControllerLink|null>(null),sequence=useRef(0),actionId=useRef(0),lastHost=useRef(0),currentHost=useRef<ControllerState|null>(null),wake=useRef<WakeLockSentinel|null>(null)
 const held=useRef(new Map<number,'gas'|'brake'|'reverse'>()),steering=useRef<number|null>(null),pad=useRef<HTMLDivElement>(null)
 const action=(name:ControllerAction)=>{link.current?.send({kind:'action',id:++actionId.current,action:name},true)}
 const radioCommand=(name:RadioRemoteAction,stationId?:string,value?:number)=>{setRadioNotice('');const sent=link.current?.send({kind:'radio-command',version:RADIO_PROTOCOL_VERSION,id:++actionId.current,action:name,...(stationId?{stationId}:{}),...(value!==undefined?{value}:{})},true);if(!sent)setRadioNotice('Not connected. Reconnect and try again.')}
 const update=()=>{setAxes({...input.current})}
 const release=()=>{held.current.clear();steering.current=null;input.current=neutral();update()}
 const stop=()=>{release();action('stop');currentHost.current=null;setHost(previous=>previous?{...previous,armed:false}:null)}
 useEffect(()=>{const media=matchMedia('(orientation: landscape)');const change=()=>{setLandscape(media.matches);if(!media.matches)stop()};change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[])
 useEffect(()=>{setRoom(location.hash.slice(1));const hide=()=>{if(document.hidden)stop()};const blur=()=>stop();document.addEventListener('visibilitychange',hide);addEventListener('pagehide',blur);addEventListener('blur',blur);return()=>{document.removeEventListener('visibilitychange',hide);removeEventListener('pagehide',blur);removeEventListener('blur',blur);link.current?.close();void wake.current?.release()}},[])
 const connect=async()=>{
  link.current?.close();release();setHost(null);currentHost.current=null;setMessage('');setStatus('pairing');setStarted(true);sequence.current=0;actionId.current=0
  try{
   if(navigator.wakeLock)void navigator.wakeLock.request('screen').then(lock=>{wake.current=lock}).catch(()=>setWakeNote('Keep this screen awake while driving.'))
   link.current=createControllerLink({role:'phone',room,
    onStatus(next,text){setStatus(next);setMessage(text||'');if(next!=='connected'){release();currentHost.current=null;setHost(null)}},
    onDrop(){release();currentHost.current=null;setHost(null)},
    onMessage(raw){if(!raw||typeof raw!=='object')return;const packet=raw as ControllerState|RadioRemoteAck;if(packet.kind==='radio-ack'){if(packet.version!==RADIO_PROTOCOL_VERSION)return;setRadioNotice(packet.ok?'Radio updated.':packet.reason||'Radio action could not be completed.');return}const p=packet as ControllerState;if(p.kind!=='state'||typeof p.armed!=='boolean'||typeof p.available!=='boolean')return;if(!p.radioV2&&currentHost.current?.radioV2)p.radioV2=currentHost.current.radioV2;lastHost.current=performance.now();currentHost.current=p;setHost(p);setMessage(previous=>previous.startsWith('Connection interrupted.')?'':previous);if(!p.armed)release()},
   })
  }catch(error){setStatus('error');setMessage((error as Error).message)}
 }
 useEffect(()=>{
  if(!started)return
  const timer=setInterval(()=>{
   if(document.hidden)return
   if(currentHost.current&&performance.now()-lastHost.current>800){stop();setMessage('Connection interrupted. The car is stopping. Tap Drive once it reconnects.');return}
   link.current?.send({kind:'input',seq:sequence.current++,...input.current})
  },33)
  return()=>clearInterval(timer)
 },[started])
 const enabled=mode==='drive'&&landscape&&status==='connected'&&!!host?.armed&&!!host.available
 const pedal=(event:ReactPointerEvent<HTMLButtonElement>,kind:'gas'|'brake'|'reverse')=>{
  if(!enabled)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);held.current.set(event.pointerId,kind);pedals()
 }
 const pedals=()=>{const values=[...held.current.values()];input.current.brake=values.includes('brake')?1:0;input.current.throttle=input.current.brake?0:values.includes('reverse')?-1:values.includes('gas')?1:0;update()}
 const pedalUp=(event:ReactPointerEvent<HTMLButtonElement>)=>{held.current.delete(event.pointerId);pedals()}
 const steer=(event:ReactPointerEvent<HTMLDivElement>)=>{if(steering.current!==event.pointerId||!pad.current)return;const rect=pad.current.getBoundingClientRect();input.current.steer=Math.max(-1,Math.min(1,(event.clientX-(rect.left+rect.width/2))/(rect.width*.4)));update()}
 const steerUp=(event:ReactPointerEvent<HTMLDivElement>)=>{if(steering.current!==event.pointerId)return;steering.current=null;input.current.steer=0;update()}
 const drive=()=>{release();setMessage('');action('drive')}
 return <main className="pc-controller" data-link-status={status} data-driving={enabled}>
  <header className="pc-controller-header"><div><b>BUENA ONDA</b><span>CRUISE / CONTROLLER</span></div><span className={`pc-connection ${status==='connected'?'connected':''}`}>{status==='connected'?'Connected':!started?'Phone controller':status==='pairing'?'Finding laptop…':status==='connecting'?'Connecting…':'Not connected'}</span></header>
  {started&&status==='connected'&&<nav className="pc-mode-tabs" aria-label="Phone controller mode"><button aria-current={mode==='drive'?'page':undefined} onClick={()=>setMode('drive')}>Drive</button><button aria-current={mode==='radio'?'page':undefined} onClick={()=>{stop();setMode('radio')}}>Radio</button></nav>}
  {!started||status!=='connected'?<section className="pc-connect-panel">
   <p className="pc-eyebrow">TAKE THE LONG WAY</p><h1>The big screen.<br/>In your hands.</h1>
   <p>{validRoom(room)?'Leave Cruise open on your computer. Use the same Wi-Fi, then connect your phone.':'Open Cruise on your computer, press Play, then choose Pair phone and scan its QR code.'}</p>
   {(message||started)&&<p role="status">{message||'Connecting to your laptop. Keep its Cruise tab open; this can take a few seconds.'}</p>}
   <button className="pc-connect" onClick={()=>void connect()} disabled={!validRoom(room)||(started&&(status==='pairing'||status==='connecting'))}>{started&&(status==='pairing'||status==='connecting')?'Connecting…':started?'Reconnect':'Connect to Cruise'}</button>
   <p className="pc-small">The game runs on your computer. Cast the computer’s tab to your TV, or use HDMI.</p>
  </section>:mode==='radio'?<RadioRemote radio={host?.radioV2||null} send={radioCommand} notice={radioNotice}/>:!landscape?<section className="pc-rotate" role="status"><svg viewBox="0 0 100 100" width="110" height="110" aria-hidden="true"><rect x="18" y="30" width="64" height="40" rx="7" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M27 18a35 35 0 0 1 55 4M82 10v14H68M73 82a35 35 0 0 1-55-4M18 90V76h14" fill="none" stroke="currentColor" strokeWidth="2"/></svg><h1>Turn your phone sideways.</h1><p>Steering on the left. Pedals on the right.</p><small>If the screen stays upright, turn off your phone’s rotation lock.</small></section>:<>
   <section className="pc-readout"><div><span>{host?.mode||'Cruise'}</span><strong>{Math.round(host?.speed||0)}<small> KM/H</small></strong></div><button className={enabled?'pc-stop':'pc-drive'} onClick={enabled?stop:drive} disabled={!enabled&&!host?.available}>{enabled?'Stop driving':'Drive'}</button></section>
   <p className="pc-instruction" role="status">{message||(!host?.available?(host?.mode==='Garage'?'Choose your ride on the laptop. Your phone stays connected.':host?.radio?'Close the radio to drive.':'Steering is available in City. Camera and music controls are ready.'):(enabled?'Hold the accelerator. Slide your left thumb to steer.':'Tap Drive when you’re ready.'))}</p>
   <section className={`pc-driving-controls ${enabled?'':'disabled'}`} aria-label="Driving controls">
    <div className="pc-steering" ref={pad} role="group" aria-label="Steering pad" onPointerDown={event=>{if(!enabled||steering.current!==null)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);steering.current=event.pointerId;steer(event)}} onPointerMove={steer} onPointerUp={steerUp} onPointerCancel={steerUp} onLostPointerCapture={steerUp}>
     <span>STEER</span><div className="pc-steering-track"><i style={{transform:`translateX(${axes.steer*75}px)`}}>↔</i></div><div className="pc-steering-ends"><span>LEFT</span><span>RIGHT</span></div>
    </div>
    <div className="pc-pedals">{(['reverse','brake','gas'] as const).map(kind=><button key={kind} className={`pc-pedal pc-${kind}`} disabled={!enabled} onPointerDown={e=>pedal(e,kind)} onPointerUp={pedalUp} onPointerCancel={pedalUp} onLostPointerCapture={pedalUp} aria-label={kind==='gas'?'Accelerate':kind==='brake'?'Brake':'Reverse'} aria-pressed={kind==='gas'?axes.throttle>0:kind==='reverse'?axes.throttle<0:axes.brake>0}><span>{kind==='gas'?'↑':kind==='reverse'?'↓':'Ⅱ'}</span>{kind==='gas'?'GAS':kind==='reverse'?'REVERSE':'BRAKE'}</button>)}</div>
   </section>
   <section className="pc-radio-controls" aria-label="Camera and radio"><div className="pc-station"><span>ON AIR</span><b>{host?.station||'Buena Onda Radio'}</b></div><div className="pc-radio-buttons"><button onClick={()=>action('previous')} aria-label="Previous station">‹</button><button onClick={()=>action('music')}>Play / pause</button><button onClick={()=>action('next')} aria-label="Next station">›</button><button onClick={()=>action('camera')}>Camera</button><button onClick={()=>action('radio')}>{host?.radio?'Back to drive':'Radio'}</button></div></section>
   <footer>{wakeNote||'Keep this page open. Losing connection automatically brakes the car.'}</footer>
  </>}
 </main>
}
