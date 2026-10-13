'use client'
import {createContext,useContext,useEffect,useMemo,useRef,useState,useSyncExternalStore,type ReactNode} from 'react'
import type {CruiseCampaign} from '@/lib/cruise/types'
import type {MiamiAdPlacement,MiamiAdSample} from '@/lib/real-miami/advertising'
import {useCruiseAnalytics} from '@/components/cruise/analytics'
import DiscreetAdCue from './miami/DiscreetAdCue'

type AdStore={candidate:{sample:MiamiAdSample;recentlySeen:boolean}|null;lastSeenAt:number;listeners:Set<()=>void>;samples:Map<string,MiamiAdSample>}
type AdsContext={store:AdStore;reportSamples:(samples:MiamiAdSample[])=>void;activate:(placement:MiamiAdPlacement,open?:boolean)=>void}
const CampaignContext=createContext<CruiseCampaign|null>(null)
const AdContext=createContext<AdsContext|null>(null)
export const useRealMiamiCampaign=()=>useContext(CampaignContext)
export const useRealMiamiAds=()=>useContext(AdContext)
const emptySubscribe=()=>()=>{}
const emptySnapshot=()=>null
export function MiamiAdCue(){
 const ads=useRealMiamiAds()
 const sample=useSyncExternalStore(ads?listener=>{ads.store.listeners.add(listener);return()=>{ads.store.listeners.delete(listener)}}:emptySubscribe,ads?()=>ads.store.candidate:emptySnapshot,emptySnapshot)
 return <DiscreetAdCue sample={sample?.sample||null} recentlySeen={sample?.recentlySeen||false} onActivate={placement=>ads?.activate(placement,false)}/>
}
export default function CampaignBridge({campaign,campaignValid,children}:{campaign:CruiseCampaign;campaignValid:boolean;children:ReactNode}){
 const[snapshot,setSnapshot]=useState<ReturnType<NonNullable<Window['__jeepNight']>>|null>(null)
 const store=useRef<AdStore>({candidate:null,lastSeenAt:0,listeners:new Set(),samples:new Map()})
 const exposure=useRef(new Map<string,{duration:number;at:number;qualified:boolean;readableSince:number|null;presenceSince:number|null}>())
 useEffect(()=>{const poll=()=>setSnapshot(window.__jeepNight?.()??null);poll();const timer=setInterval(poll,1000);return()=>clearInterval(timer)},[])
 const analytics=useCruiseAnalytics({active:!!snapshot?.ready&&!snapshot.garage,camera:snapshot?.camera??'driver',cinematic:false,radioPlaying:snapshot?.playing??false,stationId:snapshot?.station??'',timeMode:snapshot?.timeMode??'night',timeOfDay:snapshot?.timeMode??'night',weather:'clear',campaign})
 const latest=useRef(analytics);latest.current=analytics
 const context=useMemo<AdsContext>(()=>({store:store.current,reportSamples(samples){
  const current=window.__jeepNight?.(),enabled=!!current?.ready&&!current.garage&&!current.radioFocused&&!document.hidden
  store.current.samples.clear()
  for(const sample of samples){
   store.current.samples.set(sample.placement.id,sample)
   const previous=exposure.current.get(sample.placement.id)
   const continuous=previous&&sample.sampledAt-previous.at<800&&sample.visibleDurationMs>=previous.duration
   const presenceNow=enabled&&sample.visible&&sample.facing>=.35&&sample.projectedArea>=.003&&sample.pixelWidth>=64&&sample.pixelHeight>=24&&sample.occlusion<=.5
   const presenceSince=presenceNow?(previous&&sample.sampledAt-previous.at<800&&previous.presenceSince!==null?previous.presenceSince:sample.sampledAt):null
   const readableNow=enabled&&sample.visible&&sample.viewable&&sample.readable
   const readableSince=readableNow?(continuous&&previous.readableSince!==null?previous.readableSince:sample.sampledAt):null
   const readableDuration=readableSince===null?0:sample.sampledAt-readableSince
   const qualified=readableDuration>=2000
   const duration=qualified?(continuous&&previous.qualified?sample.sampledAt-previous.at:readableDuration):0
   if(duration>0)latest.current.recordAdViewability({placementId:sample.placement.id,format:sample.placement.format,campaignId:sample.placement.campaign.id,visible:true,durationMs:Math.min(duration,3000),distance:sample.distance,projectedArea:sample.projectedArea})
   exposure.current.set(sample.placement.id,{duration:sample.visibleDurationMs,at:sample.sampledAt,qualified,readableSince,presenceSince})
  }
  for(const id of exposure.current.keys())if(!store.current.samples.has(id))exposure.current.delete(id)
  const companions=enabled?samples.filter(s=>{const since=exposure.current.get(s.placement.id)?.presenceSince;return since!==undefined&&since!==null&&s.sampledAt-since>=750}):[]
  const previous=store.current.candidate
  const selected=companions.find(s=>s.placement.id===previous?.sample.placement.id)||companions.sort((a,b)=>a.distance-b.distance)[0];const now=performance.now();if(selected){store.current.lastSeenAt=now;store.current.candidate={sample:selected,recentlySeen:false}}else{store.current.candidate=enabled&&previous&&now-store.current.lastSeenAt<=6000?{sample:previous.sample,recentlySeen:true}:null}
  store.current.listeners.forEach(listener=>listener())
 },activate(placement,open=true){
  const sample=store.current.samples.get(placement.id),current=window.__jeepNight?.()
  if(document.hidden||!current?.ready||current.garage||current.radioFocused||!placement.campaign.destination)return
  if(open&&(!sample?.viewable||sample.occlusion>.2))return
  if(!open&&(store.current.candidate?.sample.placement.id!==placement.id||performance.now()-store.current.lastSeenAt>6000))return
  latest.current.trackAdCta({placementId:placement.id,format:open?placement.format:'hud',campaignId:placement.campaign.id,destination:placement.campaign.destination})
  if(open)window.open(placement.campaign.destination,'_blank','noopener,noreferrer')
 }}),[])
 useEffect(()=>()=>{store.current.candidate=null;store.current.samples.clear();store.current.listeners.forEach(listener=>listener())},[])
 return <CampaignContext.Provider value={campaign}><AdContext.Provider value={context}><div data-cruise-campaign={campaign.id} data-campaign-valid={campaignValid}>{children}</div></AdContext.Provider></CampaignContext.Provider>
}
