'use client'
import {useEffect,useRef,useState} from 'react'
import {Cast,Pause,Play,SkipForward,X} from 'lucide-react'
import {canPickTv,castToTv,tvSessionUrl,type TvCommand,type TvState} from '@/lib/cruise/tv-cast'

type Session={send:(command:TvCommand)=>void;stop:()=>void}
type Props={params:()=>Record<string,string>;onCasting:(active:boolean)=>void}

const mirrorTip=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent)||/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1
 ?'Swipe down to Control Center, tap Screen Mirroring, pick your TV.'
 :/Android/i.test(navigator.userAgent)?'Swipe down to Quick Settings, tap Cast or Screen cast, pick your TV.'
 :'No TV found. Put the TV on the same Wi-Fi and try again.'

/** One tap: the browser's TV picker, then this device is the remote. */
export default function CastButton({params,onCasting}:Props){
 const [session,setSession]=useState<Session|null>(null),[tv,setTv]=useState<TvState|null>(null),[tip,setTip]=useState('')
 const timer=useRef<ReturnType<typeof setTimeout>>(),live=useRef<Session|null>(null)
 useEffect(()=>()=>{clearTimeout(timer.current);live.current?.stop()},[])
 const say=(text:string)=>{setTip(text);clearTimeout(timer.current);timer.current=setTimeout(()=>setTip(''),8000)}
 const end=()=>{live.current=null;setSession(null);setTv(null);onCasting(false)}
 const cast=async()=>{
  setTip('')
  if(!canPickTv()){
   // No web route to a TV here: present full screen and let the OS mirror it.
   dispatchEvent(new Event('cruise:tv-on'))
   if(!document.fullscreenElement)void document.documentElement.requestFullscreen?.().catch(()=>{})
   say(mirrorTip());return
  }
  try{
   const next=await castToTv(tvSessionUrl(params()),setTv,end)
   if(!next)return
   live.current=next;setSession(next);onCasting(true)
  }catch{say(mirrorTip())}
 }
 if(session)return <div className="dd-casting" role="group" aria-label="Casting to TV">
  <Cast size={17} aria-hidden="true"/>
  <span><small>On your TV</small><strong>{tv?.station||'Connecting…'}</strong></span>
  <button className="dd-icon" aria-label={tv?.playing?'Pause TV radio':'Play TV radio'} onClick={()=>session.send({type:'toggle'})}>{tv?.playing?<Pause size={17}/>:<Play size={17}/>}</button>
  <button className="dd-icon" aria-label="Next station on TV" onClick={()=>session.send({type:'seek',step:1})}><SkipForward size={16}/></button>
  <button className="dd-icon" aria-label="Stop casting" onClick={()=>{session.stop();end()}}><X size={17}/></button>
 </div>
 return <>
  <button className="dd-icon dd-cast" aria-label="Cast to TV" title="Cast to TV" onClick={()=>void cast()}><Cast size={18}/></button>
  {tip&&<p className="dd-cast-tip" role="status">{tip}<button aria-label="Dismiss" onClick={()=>setTip('')}><X size={14}/></button></p>}
 </>
}
