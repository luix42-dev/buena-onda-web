import type { CruiseStation } from '../real-miami/types'
import { STATION_DETAILS } from './stations'

/** Resolve only catalogued station destinations; house links point to the main Buena Onda site. */
export function stationWebsite(station: Pick<CruiseStation, 'id' | 'externalUrl'> | null | undefined): string | null {
  if (!station) return null
  const destination = STATION_DETAILS[station.id]?.website || station.externalUrl
  if (!destination) return null
  if (destination.startsWith('/') && !destination.startsWith('//')) return `https://www.buenaondalifestyle.com${destination}`
  return destination.startsWith('https://') ? destination : null
}
