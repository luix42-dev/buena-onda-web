'use client'
import dynamic from 'next/dynamic'
const Experience = dynamic(() => import('@/components/real-miami/jeep/JeepNight'), {
  ssr: false,
  loading: () => <main className="experience-loading" style={{ position: 'fixed', inset: 0, display: 'grid', alignContent: 'center', padding: '8%', background: 'linear-gradient(#263550,#bd7c75 60%,#e8b18d)', color: '#fff5dd' }}><p>BUENA ONDA CRUISE</p><h1>Take the long way.</h1><p>Preparing the live Miami scene…</p></main>,
})
export default function ExperienceClient() { return <Experience humanRadio experienceFirst /> }
