import { listRadioTracks } from '@/lib/radio'
import type { Track } from '@/lib/radio'
import PlayerClient from './PlayerClient'

export const dynamic = 'force-dynamic'

export default async function PlayerPage() {
  let tracks: Track[] = []
  let loadError: string | null = null

  try {
    tracks = await listRadioTracks()
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load tracks.'
  }

  return <PlayerClient initialTracks={tracks} initialError={loadError} />
}
