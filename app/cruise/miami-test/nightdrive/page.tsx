import type { Metadata } from 'next'
import NightClient from './NightClient'

export const metadata: Metadata = { title: 'Buena Onda — Nightdrive Lab', robots: { index: false, follow: false } }
export default function Page() { return <NightClient /> }
