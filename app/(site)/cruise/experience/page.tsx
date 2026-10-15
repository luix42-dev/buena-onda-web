import type { Metadata } from 'next'
import ExperienceClient from './ExperienceClient'
export const metadata: Metadata = {
  title: 'Buena Onda Cruise — A Little Miami. A Real Radio.',
  description: 'Pick a car. Cruise Ocean Drive. Tune into real radio from around the world. No races. No missions. Just the road and the music.',
  robots: { index: false, follow: false },
}
export default function ExperiencePage() { return <><link rel="preload" href="/real-miami/vehicle/countach-1988/countach.glb" as="fetch" crossOrigin="anonymous"/><ExperienceClient /></> }
