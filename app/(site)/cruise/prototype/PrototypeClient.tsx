'use client'
import dynamic from 'next/dynamic'
import PrototypeBusinessBridge from '@/components/experience/PrototypeBusinessBridge'
import PrototypeTV from '@/components/experience/PrototypeTV'
const Cruise=dynamic(()=>import('@/components/real-miami/jeep/JeepNight'),{ssr:false,loading:()=><main style={{background:'#122c25',color:'#eee4ce',height:'100dvh',display:'grid',placeItems:'center'}}>Preparing your evening drive…</main>})
export default function PrototypeClient(){return <PrototypeTV><PrototypeBusinessBridge><Cruise humanRadio experienceFirst cruiseOS prototype/></PrototypeBusinessBridge></PrototypeTV>}
