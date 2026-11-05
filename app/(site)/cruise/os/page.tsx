import type { Metadata } from 'next'
import CruiseOSClient from './CruiseOSClient'
export const metadata: Metadata = {
  title: 'Buena Onda Cruise / Cruise OS experiment',
  description: 'Take the long way to good music. A Miami drive, real radio, and your own discoveries.',
  robots: { index: false, follow: false },
}
export default function CruiseOSPage() { return <CruiseOSClient/> }
