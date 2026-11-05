'use client'
import {createClient,type RealtimeChannel} from '@supabase/supabase-js'
import {validRoom} from './controller-protocol'
const MAX_PACKET_BYTES=12_000 // Bounded catalog snapshot; driving packets remain tiny.
export type LinkStatus='pairing'|'connecting'|'connected'|'disconnected'|'error'|'busy'
type Options={role:'host'|'phone';room:string;onStatus:(status:LinkStatus,message?:string)=>void;onMessage:(message:unknown)=>void;onDrop:()=>void}
/** Prefer direct WebRTC; fall back to existing Realtime broadcasts when peer
 * connectivity is blocked. Neither path sends video. */
export function createControllerLink(options:Options){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!url||!key)throw Error('Phone pairing is unavailable in this build.')
 if(!validRoom(options.room))throw Error('This pairing link is incomplete. Scan a new code on the computer.')
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 const id=crypto.randomUUID(),host=options.role==='host'
 let channel:RealtimeChannel,pc:RTCPeerConnection|null=null,drive:RTCDataChannel|null=null,actions:RTCDataChannel|null=null
 let peer:string|null=null,closed=false,connected=false,busy=false,subscribed=false,generation=0,lastHello=0,connectTimer:ReturnType<typeof setTimeout>|undefined
 let relay=false,relaySession='',lastRelay=0,relayPending=false,lastFallback=0,waitReported=false
 const fallbackAt=performance.now()+8000
 const status=(s:LinkStatus,message?:string)=>{if(!closed)options.onStatus(s,message)}
 const signal=(data:Record<string,unknown>)=>{if(subscribed&&!closed)void channel.send({type:'broadcast',event:'pair',payload:{...data,from:id}})}
 function reset(notify=true){
  generation++;clearTimeout(connectTimer);const wasConnected=connected;connected=false
  const old=pc;pc=null;drive=null;actions=null;peer=null;busy=false;relay=false;relaySession='';relayPending=false;old?.close()
  if(notify&&wasConnected)options.onDrop()
 }
 function activateRelay(remote:string,session:string){
  // Switching transports always disarms driving; old queued packets cannot
  // enter the replacement session.
  reset();peer=remote;relay=true;relaySession=session;lastRelay=performance.now()
 }
 function bind(dc:RTCDataChannel){
  if(!pc||relay){dc.close();return}
  const owner=pc
  if(dc.label==='drive')drive=dc;else if(dc.label==='actions')actions=dc;else{dc.close();return}
  dc.onopen=()=>{if(pc===owner&&!relay&&!connected&&drive?.readyState==='open'&&actions?.readyState==='open'){clearTimeout(connectTimer);connected=true;status('connected')}}
  dc.onmessage=e=>{if(pc!==owner||relay||!connected||typeof e.data!=='string'||e.data.length>MAX_PACKET_BYTES)return;try{options.onMessage(JSON.parse(e.data))}catch{/* invalid packet */}}
  dc.onclose=()=>{if(!closed&&pc===owner&&connected){reset();status('disconnected','Connection lost. Reconnect on the phone.')}}
 }
 function makePeer(){
  const instance=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});pc=instance
  instance.ondatachannel=e=>bind(e.channel)
  instance.onconnectionstatechange=()=>{
   if(pc!==instance||closed)return
   if(instance.connectionState==='failed'||instance.connectionState==='disconnected'){reset();status('disconnected','Keep both devices on the same Wi-Fi, then reconnect.')}
  }
  connectTimer=setTimeout(()=>{if(pc===instance&&!connected){reset();status('error','Could not reach the other device. Use the same Wi-Fi, avoid guest networks, then reconnect.')}},20000)
  status('connecting');return instance
 }
 async function gathered(instance:RTCPeerConnection){
  if(instance.iceGatheringState!=='complete')await new Promise<void>(resolve=>{
   const timer=setTimeout(done,5000)
   function done(){clearTimeout(timer);instance.removeEventListener('icegatheringstatechange',check);resolve()}
   function check(){if(instance.iceGatheringState==='complete')done()}
   instance.addEventListener('icegatheringstatechange',check)
  })
  return instance.localDescription
 }
 async function receive(payload:Record<string,unknown>){
  if(closed||payload.from===id||typeof payload.from!=='string'||(payload.to&&payload.to!==id))return
  if(payload.type==='relay-request'&&host){
   if(peer&&peer!==payload.from){signal({type:'busy',to:payload.from});return}
   if(!relay)activateRelay(payload.from,crypto.randomUUID())
   signal({type:'relay-ready',to:peer,session:relaySession});return
  }else if(payload.type==='relay-ready'&&!host&&typeof payload.session==='string'){
   if(peer&&peer!==payload.from)return
   if(!relay||relaySession!==payload.session)activateRelay(payload.from,payload.session)
   signal({type:'relay-ack',to:peer,session:relaySession})
   if(!connected){connected=true;status('connected')}
   return
  }else if(payload.type==='relay-ack'&&host&&relay&&payload.from===peer&&payload.session===relaySession){
   lastRelay=performance.now();if(!connected){connected=true;status('connected')}return
  }else if(payload.type==='hello'&&host){
   if(peer&&peer!==payload.from){signal({type:'busy',to:payload.from});return}
   if(relay){signal({type:'relay-ready',to:peer,session:relaySession});return}
   if(busy||connected)return
   reset(false);peer=payload.from;busy=true;const instance=makePeer(),version=generation
   bind(instance.createDataChannel('drive',{ordered:false,maxRetransmits:0}));bind(instance.createDataChannel('actions',{ordered:true}))
   await instance.setLocalDescription(await instance.createOffer());const description=await gathered(instance)
   if(closed||pc!==instance||generation!==version)return
   signal({type:'offer',to:peer,description});busy=false
  }else if(payload.type==='offer'&&!host&&!connected){
   if(busy)return
   reset(false);peer=payload.from;busy=true;const instance=makePeer(),version=generation
   await instance.setRemoteDescription(payload.description as RTCSessionDescriptionInit)
   await instance.setLocalDescription(await instance.createAnswer());const description=await gathered(instance)
   if(closed||pc!==instance||generation!==version)return
   signal({type:'answer',to:peer,description});busy=false
  }else if(payload.type==='answer'&&host&&payload.from===peer&&pc?.signalingState==='have-local-offer'){
   await pc.setRemoteDescription(payload.description as RTCSessionDescriptionInit)
  }else if(payload.type==='busy'&&!host&&!connected){status('busy','Another phone is connected. Disconnect it on the computer first.')}
  else if(payload.type==='leave'&&payload.from===peer){reset();status('disconnected','The other device disconnected.')}
 }
 channel=client.channel('cruise-controller-'+options.room,{config:{broadcast:{ack:true}}})
 channel.on('broadcast',{event:'control'},({payload})=>{
  if(closed||!connected||!relay||!payload||payload.from!==peer||payload.to!==id||payload.session!==relaySession)return
  if(!payload.message||JSON.stringify(payload.message).length>MAX_PACKET_BYTES)return
  lastRelay=performance.now();options.onMessage(payload.message)
 })
 channel.on('broadcast',{event:'pair'},({payload})=>{if(payload&&typeof payload==='object')void receive(payload).catch(()=>{reset();status('error','Pairing failed. Reconnect and try again.')})})
 channel.subscribe(state=>{
  if(state==='SUBSCRIBED'){subscribed=true;if(!connected)status('pairing');if(!host&&!connected){lastHello=performance.now();signal({type:'hello'})}}
  else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'||state==='CLOSED'){subscribed=false;if(relay)reset();if(!connected)status('error','Pairing service could not connect. Check your internet connection, then reconnect.')}
 })
 const hello=setInterval(()=>{
  if(closed)return
  const now=performance.now()
  if(relay&&connected&&now-lastRelay>3500){reset();status('disconnected','Connection interrupted. Keep Cruise open on the laptop and reconnect.')}
  if(!host&&subscribed&&!connected){
   if(now>fallbackAt+17000&&!waitReported){waitReported=true;status('error','Cannot find your laptop. Keep its Cruise tab open, choose Pair phone, and scan the current code again.')}
   if(now>=fallbackAt&&now-lastFallback>1000){lastFallback=now;signal({type:'relay-request'})}
   else if(!pc&&!relay&&now-lastHello>3000){lastHello=now;signal({type:'hello'})}
  }
 },1000)
 return {
  send(message:unknown,reliable=false){
   if(!connected)return false
   if(relay){
    if(!subscribed||!client.realtime.isConnected()||(!reliable&&relayPending))return false
    const session=relaySession
    if(!reliable)relayPending=true
    void channel.send({type:'broadcast',event:'control',payload:{from:id,to:peer,session,message}}).finally(()=>{if(session===relaySession&&!reliable)relayPending=false})
    return true
   }
   const dc=reliable?actions:drive;if(dc?.readyState!=='open'||dc.bufferedAmount>16384)return false;dc.send(JSON.stringify(message));return true
  },
  close(){if(closed)return;signal({type:'leave',to:peer});closed=true;clearInterval(hello);reset(false);void client.removeAllChannels()},
 }
}
export type ControllerLink=ReturnType<typeof createControllerLink>
