'use client'
import dynamic from 'next/dynamic'
const Cruise = dynamic(() => import('@/components/real-miami/jeep/JeepNight'), {
  ssr: false,
  loading: () => <div style={{position:'fixed',inset:0,padding:'10%',background:'#122b27',color:'#f4eddb'}}><p>BUENA ONDA CRUISE</p><h1>Take the long way.</h1><p>Preparing Miami and the radio...</p></div>,
})
export default function CruiseOSClient() { return <Cruise humanRadio experienceFirst cruiseOS/> }
