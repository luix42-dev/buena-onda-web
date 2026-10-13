'use client'
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import type {CruiseCampaign} from '@/lib/real-miami/types'
import {useCruiseAnalytics} from '@/components/cruise/analytics'
const CampaignContext=createContext<CruiseCampaign|null>(null)
export const useRealMiamiCampaign=()=>useContext(CampaignContext)
export default function CampaignBridge({campaign,campaignValid,children}:{campaign:CruiseCampaign;campaignValid:boolean;children:ReactNode}){
 const[snapshot,setSnapshot]=useState<ReturnType<NonNullable<Window['__jeepNight']>>|null>(null)
 useEffect(()=>{const poll=()=>setSnapshot(window.__jeepNight?.()??null);poll();const timer=setInterval(poll,1000);return()=>clearInterval(timer)},[])
 useCruiseAnalytics({active:!!snapshot?.ready&&!snapshot.garage,camera:snapshot?.camera??'driver',cinematic:false,radioPlaying:snapshot?.playing??false,stationId:snapshot?.station??'',timeMode:snapshot?.timeMode??'night',timeOfDay:snapshot?.timeMode??'night',weather:'clear',campaign})
 return <CampaignContext.Provider value={campaign}><div data-cruise-campaign={campaign.id} data-campaign-valid={campaignValid}>{children}</div></CampaignContext.Provider>
}
