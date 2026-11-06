import { HUMAN_RADIO_STATIONS } from '../human-radio/stations'
import { NEON_STATIONS } from '../real-miami/neon'
import { canPlayCruiseStation } from '../real-miami/stations'

// Receiver commands identify an existing station, never an arbitrary media URL.
// Keep the TV catalog aligned with the public Cruise station picker.
export const receiverCastStations: readonly string[] = [...HUMAN_RADIO_STATIONS, ...NEON_STATIONS]
  .filter(canPlayCruiseStation)
  .map(station => station.id)

/** Optional rollout restriction; without one, the complete playable catalog is available. */
export function resolveCastStations(config?: string): readonly string[] {
  if (!config?.trim()) return receiverCastStations
  const selected = new Set(config.split(',').map(id => id.trim()).filter(Boolean))
  return receiverCastStations.filter(id => selected.has(id))
}
