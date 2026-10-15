'use client'
import dynamic from 'next/dynamic'

const HumanCruise = dynamic(() => import('@/components/real-miami/jeep/JeepNight'), {
  ssr: false,
  loading: () => <main style={{ minHeight: '100dvh', background: '#142d27', color: '#f5ecdc', padding: '8vw' }}><p>BUENA ONDA CRUISE</p><h1>No Algorithms. Just Frequencies.</h1><p>Preparing your radio…</p></main>,
})
export default function HumanRadioClient() { return <HumanCruise humanRadio /> }
