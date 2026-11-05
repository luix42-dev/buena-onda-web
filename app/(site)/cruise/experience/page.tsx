import type { Metadata } from 'next'
import ExperienceClient from './ExperienceClient'
export const metadata: Metadata = {
  title: 'Buena Onda Cruise — A Little Miami. A Real Radio.',
  description: 'Pick a car. Cruise Ocean Drive. Tune into real radio from around the world. No races. No missions. Just the road and the music.',
  robots: { index: false, follow: false },
  openGraph: { title: 'Buena Onda Cruise', description: 'A little Miami. Real radio. Take the long way to good music.', images: [{ url: '/real-miami/experience/social-preview.png', width: 1280, height: 720, alt: 'Actual Buena Onda Cruise gameplay: a Countach on Ocean Drive at sunset' }] },
  twitter: { card: 'summary_large_image', title: 'Buena Onda Cruise', images: ['/real-miami/experience/social-preview.png'] },
}
export default function ExperiencePage() { return <><link rel="preload" href="/real-miami/vehicle/countach-1988/countach.glb" as="fetch" crossOrigin="anonymous"/><ExperienceClient /></> }
