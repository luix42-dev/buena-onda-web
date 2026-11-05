'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import qrcode from 'qrcode-generator'
import {createControllerLink,type ControllerLink,type LinkStatus} from '@/lib/cruise/controller-link'
import {ACTIONS,createInputGate,newControllerRoom,parseRadioRemoteCommand,RADIO_PROTOCOL_VERSION,type ControllerAction,type ControllerInput,type ControllerState,type RadioRemoteCommand} from '@/lib/cruise/controller-protocol'
import './phone-controller.css'
type Props={active?:boolean;getState:()=>Omit<ControllerState,'kind'|'armed'>;onInput:(input:ControllerInput)=>void;onAction:(action:ControllerAction)=>void;onRadioCommand?:(command:RadioRemoteCommand)=>{ok:boolean;reason?:string};onStop:()=>void}
export default function PhoneControllerHost(props:Props){
 const [room,setRoom]=useState(''),[open,setOpen]=useState(false),[status,setStatus]=useState<LinkStatus>('pairing'),[message,setMessage]=useState(''),[copied,setCopied]=useState(false)
 const statusRef=useRef(status);statusRef.current=status
 const dialog=useRef<HTMLDialogElement>(null),link=useRef<ControllerLink|null>(null),latest=useRef({...props,open});latest.current={...props,open}
 const gate=useRef(createInputGate()),lastAction=useRef(-1)
 const lastRadio=useRef(-1),roomCreated=useRef(0)
 const stop=()=>{if(gate.current.stop())latest.current.onStop()}
 useEffect(()=>{if(props.active===false){stop();setOpen(false)}},[props.active])
 const pairingUrl=room&&typeof location!=='undefined'?`${location.origin}/cruise/controller#${room}`:''
 const svg=useMemo(()=>{if(!pairingUrl)return '';const code=qrcode(0,'M');code.addData(pairingUrl);code.make();return code.createSvgTag({cellSize:4,margin:4,scalable:true})},[pairingUrl])
 useEffect(()=>{
  if(open&&!dialog.current?.open)dialog.current?.showModal()
  if(!open&&dialog.current?.open)dialog.current?.close()
 },[open])
 useEffect(()=>{
  const local=()=>{gate.current.stop()}
  const hidden=()=>{if(document.hidden)stop()}
  const pair=()=>{stop();latest.current.onAction('stop');setOpen(true);roomCreated.current=Date.now();setRoom(newControllerRoom())}
  addEventListener('cruise:phone-local',local);addEventListener('cruise:pair-phone',pair);document.addEventListener('visibilitychange',hidden)
  return()=>{removeEventListener('cruise:phone-local',local);removeEventListener('cruise:pair-phone',pair);document.removeEventListener('visibilitychange',hidden)}
 },[])
 useEffect(()=>{
  if(!room)return
  setMessage('');setStatus('pairing');lastAction.current=-1;lastRadio.current=-1
  let transport:ControllerLink
  try{transport=createControllerLink({role:'host',room,
   onStatus(next,text){setStatus(next);setMessage(text||'');if(next==='connected'){gate.current.stop();lastAction.current=-1;lastRadio.current=-1;setOpen(false)}},
   onDrop:stop,
   onMessage(raw){
    if(!raw||typeof raw!=='object')return
    const p=raw as Record<string,unknown>,state=latest.current.getState()
    if(p.kind==='input'){
     if(!state.available||latest.current.open){stop();return}
     const input=gate.current.accept(p,performance.now());if(input)latest.current.onInput(input)
    }else if(p.kind==='radio-command'){
     const command=parseRadioRemoteCommand(p)
     if(!command||command.id<=lastRadio.current)return
     lastRadio.current=command.id
     const result=latest.current.onRadioCommand?.(command)||{ok:false,reason:'Radio controls are unavailable.'}
     transport.send({kind:'radio-ack',version:RADIO_PROTOCOL_VERSION,id:command.id,...result},true)
    }else if(p.kind==='action'&&Number.isSafeInteger(p.id)&&(p.id as number)>lastAction.current&&ACTIONS.includes(p.action as ControllerAction)){
     lastAction.current=p.id as number
     const action=p.action as ControllerAction
     if(action==='drive'){if(!state.available||latest.current.open)return;gate.current.arm(performance.now());latest.current.onAction(action)}
     else{if(action==='stop'||action==='radio')stop();latest.current.onAction(action)}
    }
   },
  });link.current=transport}catch(error){setStatus('error');setMessage((error as Error).message);return}
  let radioTick=0
  const timer=setInterval(()=>{
   const state=latest.current.getState()
   if(gate.current.expired(performance.now()))latest.current.onStop()
   if(!state.available||state.paused||latest.current.open)stop()
   transport.send({kind:'state',...state,radioV2:radioTick++%5===0?state.radioV2:undefined,available:state.available&&!latest.current.open,armed:gate.current.armed})
   if(roomCreated.current&&Date.now()-roomCreated.current>20*60_000&&statusRef.current!=='connected'){roomCreated.current=Date.now();setRoom(newControllerRoom());setMessage('Pairing code expired. Scan the new code.')}
  },100)
  return()=>{stop();clearInterval(timer);transport.close();link.current=null}
 },[room])
 const begin=()=>{stop();props.onAction('stop');setOpen(true);roomCreated.current=Date.now();setRoom(newControllerRoom())}
 const disconnect=()=>{stop();props.onStop();setRoom('');setOpen(false);setStatus('pairing')}
 return <>
  {props.active!==false&&<button className="pc-pair-trigger" onClick={begin} data-controller-status={room?status:'idle'}>{status==='connected'?'Phone connected':'Pair phone'}</button>}
  <dialog className="pc-pair-dialog" ref={dialog} onCancel={e=>{e.preventDefault();setOpen(false)}} onClose={()=>setOpen(false)} aria-labelledby="pc-pair-title">
   <header><span>BUENA ONDA / CRUISE</span><button onClick={()=>setOpen(false)} aria-label="Close phone pairing">×</button></header>
   <h2 id="pc-pair-title">Your phone. Your wheel.</h2>
   <p>Keep Cruise running on this computer. Put your phone on the same Wi-Fi and scan to connect.</p>
   {svg&&<div className="pc-qr" role="img" aria-label="Scan to pair your phone" dangerouslySetInnerHTML={{__html:svg}}/>}
   <p className="pc-pair-status" role="status">{message||(status==='connected'?'Phone connected. Close this panel, then tap Drive on your phone.':status==='connecting'?'Connecting your phone…':'Scan the code, then tap Connect on your phone.')}</p>
   <div className="pc-pair-links"><input aria-label="Phone controller link" value={pairingUrl} readOnly onFocus={e=>e.currentTarget.select()}/><button onClick={()=>void navigator.clipboard.writeText(pairingUrl).then(()=>setCopied(true)).catch(()=>setMessage('Select and copy the link above.'))}>{copied?'Copied':'Copy link'}</button></div>
   <p className="pc-pair-note">Cast this computer’s Chrome tab to your TV, or connect it with HDMI. Your phone shows the controls; the TV shows the drive. Keep the phone’s controller page open.</p>
   {status==='error'&&<button onClick={()=>{roomCreated.current=Date.now();setRoom(newControllerRoom())}}>New pairing code</button>}
   <button className="pc-disconnect" onClick={disconnect}>Disconnect phone &amp; stop</button>
  </dialog>
 </>
}
