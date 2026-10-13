'use client'

import dynamic from 'next/dynamic'
import {useEffect,useState} from 'react'
import CampaignBridge from '@/components/real-miami/CampaignBridge'
import type { CruiseCampaign } from '@/lib/cruise/types'
const CruiseExperience=dynamic(()=>import('@/components/cruise/LaunchExperience'),{ssr:false})
const RealMiami=dynamic(()=>import('@/components/real-miami/jeep/JeepNight'),{ssr:false})

export default function CruiseClient({ campaign, campaignValid }: { campaign: CruiseCampaign; campaignValid: boolean }) {
  const[legacy,setLegacy]=useState<boolean|null>(null)
  useEffect(()=>setLegacy(new URLSearchParams(location.search).get('experience')==='legacy'),[])
  if(legacy===null)return null
  // Other campaigns retain their existing creatives, video and measured ad
  // placements until real-Miami plot viewability has been integrated.
  if(legacy||campaign.id!=='buena-onda')return <CruiseExperience campaign={campaign} campaignValid={campaignValid}/>
  return <CampaignBridge campaign={campaign} campaignValid={campaignValid}><RealMiami/></CampaignBridge>
}
