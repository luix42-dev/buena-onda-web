'use client'
/**
 * YouTube-style TV casting for the drive. One tap opens the browser's own TV picker (Presentation
 * API: Chrome desktop and Android); the TV runs its own Cruise and this device becomes its remote.
 * Where no web API can reach a TV (iPhone/Safari), the caller shows the one-step OS mirroring tip.
 */
export type TvCommand={type:'toggle'}|{type:'seek';step:1|-1}
export type TvState={type:'state';station:string;playing:boolean}
type Message=TvCommand|TvState
type Connection={state:string;send(data:string):void;terminate():void;addEventListener(type:'message'|'close'|'terminate',fn:(e:{data?:unknown})=>void):void}
type Ctor=new(urls:string[])=>{start():Promise<Connection>}
type Receiver={connectionList:Promise<{connections:Connection[];onconnectionavailable:((e:{connection:Connection})=>void)|null}>}
const api=()=>typeof window==='undefined'?undefined:window as unknown as {PresentationRequest?:Ctor;navigator:{presentation?:{receiver?:Receiver}}}
const parse=(data:unknown):Message|null=>{try{const m=JSON.parse(String(data));return m&&typeof m.type==='string'?m:null}catch{return null}}

export const canPickTv=()=>!!api()?.PresentationRequest
/** True on the TV side: inside a presentation, or opened by a cast link. */
export const isTvSession=()=>!!api()?.navigator.presentation?.receiver||(typeof location!=='undefined'&&new URLSearchParams(location.search).get('cast')==='1')

/** Same page and drive on the TV, in TV presentation mode. */
export function tvSessionUrl(extra:Record<string,string>){
 const url=new URL(location.href)
 for(const [key,value] of Object.entries(extra))url.searchParams.set(key,value)
 url.searchParams.set('tv','1');url.searchParams.set('cast','1')
 return url.toString()
}

/** Opens the TV picker. Resolves null when the person closes the picker without choosing a TV. */
export async function castToTv(url:string,onState:(state:TvState)=>void,onEnd:()=>void){
 const Request=api()?.PresentationRequest
 if(!Request)throw new DOMException('No TV picker in this browser','NotSupportedError')
 let connection:Connection
 try{connection=await new Request([url]).start()}catch(error){if(error instanceof DOMException&&error.name==='NotAllowedError')return null;throw error}
 connection.addEventListener('message',e=>{const m=parse(e.data);if(m?.type==='state')onState(m)})
 connection.addEventListener('close',onEnd);connection.addEventListener('terminate',onEnd)
 return {send:(command:TvCommand)=>{if(connection.state==='connected')connection.send(JSON.stringify(command))},stop:()=>connection.terminate()}
}

/** TV side: accept remote commands and report what is playing. */
export function serveTvRemote(onCommand:(command:TvCommand)=>void){
 const receiver=api()?.navigator.presentation?.receiver,connections=new Set<Connection>()
 if(receiver)void receiver.connectionList.then(list=>{
  const add=(c:Connection)=>{connections.add(c);c.addEventListener('message',e=>{const m=parse(e.data);if(m&&m.type!=='state')onCommand(m)});c.addEventListener('close',()=>connections.delete(c))}
  list.connections.forEach(add);list.onconnectionavailable=e=>add(e.connection)
 })
 return (state:TvState)=>connections.forEach(c=>{if(c.state==='connected')c.send(JSON.stringify(state))})
}
