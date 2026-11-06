'use client'
export const CAST_NAMESPACE='urn:x-cast:com.buenaonda.cruise.v1'
export type CastCommand={version:1;sequence:number;type:'sync'|'play'|'pause'|'station'|'volume'|'status';station?:string;playing?:boolean;volume?:number;muted?:boolean;scene?:Record<string,string>}
export type CastStatus={version:1;type:'state';station:string;playing:boolean;volume:number;muted:boolean;ready:boolean;error?:string}
export const castStations=(process.env.NEXT_PUBLIC_CRUISE_CAST_STATIONS||'').split(',').filter(Boolean)
const appId=process.env.NEXT_PUBLIC_CRUISE_CAST_APP_ID||''
let sdk:Promise<void>|null=null,session:any=null,sequence=0,remote=false,wantsPlayback=true,handoff:null|{volume:number;muted:boolean}=null
const api=()=>window as unknown as Window&{cast:any;chrome:any;__onGCastApiAvailable?:(available:boolean)=>void}
export function castSupported(){return typeof window!=='undefined'&&window.isSecureContext&&/Chrome|Chromium/.test(navigator.userAgent)&&!/CriOS/.test(navigator.userAgent)&&!!appId&&castStations.length>0}
export function loadCastSdk(){if(sdk)return sdk;sdk=new Promise((resolve,reject)=>{const ready=(available:boolean)=>{if(!available){reject(new Error('Cast unavailable'));return}api().cast.framework.CastContext.getInstance().setOptions({receiverApplicationId:appId,autoJoinPolicy:api().chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED});resolve()};if(api().cast?.framework){ready(true);return}api().__onGCastApiAvailable=ready;const script=document.createElement('script');script.src='https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';script.onerror=()=>{sdk=null;reject(new Error('Cast SDK unavailable'))};document.head.appendChild(script)});return sdk}
export function sendCast(command:Omit<CastCommand,'version'|'sequence'>){if(!remote||!session)return false;if(command.station&&!castStations.includes(command.station))return false;void session.sendMessage(CAST_NAMESPACE,{...command,version:1,sequence:++sequence}).catch(()=>window.dispatchEvent(new CustomEvent('cruise:cast-error',{detail:'TV connection lost. Disconnect and retry.'})));return true}
export function castIsRemote(){return remote}
export function attachCast(onState:(state:CastStatus)=>void,onEnd:()=>void){
 const context=api().cast.framework.CastContext.getInstance()
 let attached:any=null, listener:((_namespace:string,data:string)=>void)|null=null
 const detach=()=>{if(attached&&listener)attached.removeMessageListener(CAST_NAMESPACE,listener);attached=null;listener=null}
 const attach=()=>{
  const current=context.getCurrentSession()
  if(!current){detach();if(session){session=null;const owned=remote;remote=false;handoff=null;if(owned)window.dispatchEvent(new Event('cruise:cast-ended'));onEnd()}return}
  if(current===attached)return
  detach();attached=current;session=current
  listener=(_namespace,data)=>{
   if(current!==session)return
   let state:CastStatus;try{state=JSON.parse(data)}catch{return}
   if(state.version!==1||state.type!=='state')return
   onState(state)
   if(state.ready&&!state.error&&(state.playing||remote||!wantsPlayback)){
    const first=!remote;remote=true
    window.dispatchEvent(new CustomEvent('cruise:cast-state',{detail:state}))
    if(first&&handoff){sendCast({type:'volume',...handoff});handoff=null}
   }
  }
  current.addMessageListener(CAST_NAMESPACE,listener)
  void current.sendMessage(CAST_NAMESPACE,{version:1,type:'status',sequence:++sequence}).catch(()=>{})
 }
 const event=api().cast.framework.CastContextEventType.SESSION_STATE_CHANGED
 context.addEventListener(event,attach);attach()
 return()=>{context.removeEventListener(event,attach);detach()}
}
export async function requestCast(initial:Omit<CastCommand,'version'|'sequence'>){const context=api().cast.framework.CastContext.getInstance();wantsPlayback=initial.playing!==false;try{await context.requestSession()}catch(error){if(String(error).includes('cancel')||(error as {code?:string})?.code==='cancel')return false;throw error}session=context.getCurrentSession();handoff={volume:initial.volume??.82,muted:initial.muted??false};await session.sendMessage(CAST_NAMESPACE,{...initial,muted:true,type:'sync',version:1,sequence:++sequence});return true}
export function castDeviceName(){return session?.getCastDevice()?.friendlyName||'TV'}
export function disconnectCast(){const owned=remote;remote=false;handoff=null;api().cast?.framework.CastContext.getInstance().endCurrentSession(true);session=null;if(owned)window.dispatchEvent(new Event('cruise:cast-ended'))}
