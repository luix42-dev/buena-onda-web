'use client'
import dynamic from 'next/dynamic'
const Lab = dynamic(() => import('@/components/cruise/nightdrive/NightLab'), { ssr: false })
export default function NightClient() { return <Lab /> }
