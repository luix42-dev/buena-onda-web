'use client'
import dynamic from 'next/dynamic'
import {DEFAULT_CRUISE_CAMPAIGN} from '@/lib/cruise/campaigns'
const WorldExperience=dynamic(()=>import('@/components/cruise/world-test/WorldExperience'),{ssr:false})
export default function WorldClient(){return <WorldExperience campaign={DEFAULT_CRUISE_CAMPAIGN} campaignValid/>}
