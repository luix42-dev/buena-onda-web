import { CRUISE_STATIONS, getCruiseStation } from './stations'
import type { CruiseRadioMood, CruiseStation } from './types'

export type CruiseDiscoveryQuery = { text?: string; mood?: CruiseRadioMood; country?: string; limit?: number }
export type CruiseDiscoveryEntry = { id: string; name: string; website?: string; manifestId?: string; moods?: readonly CruiseRadioMood[] }
/** Metadata adapter only. Playback sources and approval remain in stations.ts. */
export interface CruiseDiscoveryAdapter {
  id: string
  search(query: CruiseDiscoveryQuery, signal: AbortSignal): Promise<readonly CruiseDiscoveryEntry[]>
}

export const localRadioDiscovery: CruiseDiscoveryAdapter = {
  id: 'cruise',
  async search(query, signal) {
    signal.throwIfAborted()
    const text = query.text?.trim().toLowerCase() || ''
    return CRUISE_STATIONS.filter(station => station.name.toLowerCase().includes(text) &&
      (!query.mood || (station.moods as readonly CruiseRadioMood[]).includes(query.mood)))
      .map(station => ({ id: station.id, manifestId: station.id, name: station.name }))
  },
}

export async function discoverCruiseStations(adapter: CruiseDiscoveryAdapter, query: CruiseDiscoveryQuery, signal: AbortSignal): Promise<readonly CruiseStation[]> {
  signal.throwIfAborted()
  const limit = Math.max(1, Math.min(40, Math.floor(query.limit || 20)))
  const entries = await adapter.search({ ...query, limit }, signal)
  signal.throwIfAborted()
  const result = new Map<string, CruiseStation>()
  for (const entry of entries) {
    const approved = entry.manifestId && getCruiseStation(entry.manifestId)
    if (approved) result.set(approved.id, approved)
    else {
      if (!/^[a-z0-9][a-z0-9:_-]{0,79}$/i.test(entry.id) || !entry.name.trim() || !entry.website) continue
      let website: URL
      try { website = new URL(entry.website) } catch { continue }
      if (website.protocol !== 'https:' || website.username || website.password) continue
      const id = `${adapter.id}:${entry.id}`
      result.set(id, { id, name: entry.name.trim().slice(0, 120), provider: 'custom', enabled: false,
        source: null, playback: 'external', rightsStatus: 'permission-required', moods: entry.moods || [],
        externalUrl: website.href, unavailableReason: 'Listen on the station website' })
    }
    if (result.size >= limit) break
  }
  return [...result.values()]
}
