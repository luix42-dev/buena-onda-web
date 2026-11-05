import type { Metadata } from 'next'
import HumanRadioClient from './HumanRadioClient'

export const metadata: Metadata = {
  title: 'Buena Onda Cruise — No Algorithms. Just Frequencies.',
  description: 'Take the long way to good music. Real radio, human selectors, your own discoveries, and a cinematic Miami drive.',
  robots: { index: false, follow: false },
}

export default function HumanRadioPage() { return <HumanRadioClient /> }
