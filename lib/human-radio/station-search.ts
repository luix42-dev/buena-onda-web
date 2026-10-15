import type { CruiseStation } from '../real-miami/types'
import type { StationDetails } from './stations'
/** Literal, local text search; station order is the editorial catalog order. */
export function searchStations(stations: readonly CruiseStation[], details: Readonly<Record<string, StationDetails>>, query: string, category = 'All stations'): CruiseStation[] {
  const normalized = query.trim().replace(/\s+/g, ' ').slice(0, 120).toLowerCase()
  return stations.filter(station => {
    const detail = details[station.id]
    const categoryMatches = category === 'All stations' || detail?.city === category || detail?.genres.includes(category)
    if (!categoryMatches) return false
    return !normalized || [station.name, detail?.city, detail?.country, detail?.description, ...(detail?.genres || [])].filter(Boolean).join(' ').toLowerCase().includes(normalized)
  })
}
