'use client'
import {useEffect,useState} from 'react'
import {Cast} from 'lucide-react'
import {attachCast,castSupported,castDeviceName,castStations,disconnectCast,loadCastSdk,requestCast,sendCast,type CastStatus} from '@/lib/cruise/google-cast'
import type {useCruiseAudio} from '@/components/real-miami/audio/useCruiseAudio'
type Props={params:()=>Record<string,string>;onCasting:(active:boolean)=>void;audio:ReturnType<typeof useCruiseAudio>}
export default function CastButton({params,onCasting,audio}:Props){
 const [available,setAvailable]=useState(false),[status,setStatus]=useState<CastStatus|null>(null),[connecting,setConnecting]=useState(false),[error,setError]=useState('')
 useEffect(()=>{if(!castSupported())return;let cleanup:(()=>void)|undefined,alive=true;void loadCastSdk().then(()=>{if(!alive)return;setAvailable(true);cleanup=attachCast(s=>{setStatus(s);setConnecting(false);if(s.error)setError(s.error)},()=>{setStatus(null);setConnecting(false);onCasting(false)})}).catch(()=>{});return()=>{alive=false;cleanup?.()}},[])
 const scene=JSON.stringify(params());useEffect(()=>{sendCast({type:'sync',scene:JSON.parse(scene)})},[scene])
 useEffect(()=>{const report=(event:Event)=>setError((event as CustomEvent<string>).detail);addEventListener('cruise:cast-error',report);return()=>removeEventListener('cruise:cast-error',report)},[])
 useEffect(()=>{if(!connecting)return;const t=setTimeout(()=>{setConnecting(false);setError('TV did not confirm playback. Retry or disconnect.')},15000);return()=>clearTimeout(t)},[connecting])
 if(!available)return null
 const connect=async()=>{if(!castStations.includes(audio.stationId)){setError('This station is not available on TV yet.');return}setError('');setConnecting(true);try{if(!await requestCast({type:'sync',station:audio.stationId,playing:audio.requested,volume:audio.volume,muted:audio.muted,scene:params()}))setConnecting(false)}catch{setConnecting(false);setError('Could not connect. Check the TV and try again.')}}
 return <><button className="dd-icon" aria-label={status?'Disconnect from '+castDeviceName():connecting?'Connecting to TV':'Cast to TV'} disabled={connecting} onClick={()=>status?disconnectCast():void connect()}><Cast size={20}/></button>{status&&<span role="status">{castDeviceName()}</span>}{error&&<button className="dd-cast-error" onClick={()=>{disconnectCast();setStatus(null);setError('')}}>{error} ×</button>}</>
}
