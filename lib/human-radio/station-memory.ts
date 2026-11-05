export const STATION_MEMORY_KEY = 'buena-onda:experience:station:v1'
export type StationPreference = { version: 1; enabled: true; stationId: string }
export function parseStationPreference(raw: string | null, eligibleIds: readonly string[]): StationPreference | null {
  if (!raw || raw.length > 1024) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const item = value as Record<string, unknown>
    return item.version === 1 && item.enabled === true && typeof item.stationId === 'string' && eligibleIds.includes(item.stationId)
      ? { version: 1, enabled: true, stationId: item.stationId } : null
  } catch { return null }
}
/** Caller handles storage denial. This helper never starts or controls audio. */
export function readRememberedStation(storage: Pick<Storage, 'getItem'>, eligibleIds: readonly string[]): string | null {
  return parseStationPreference(storage.getItem(STATION_MEMORY_KEY), eligibleIds)?.stationId || null
}
/** Explicit valid links win. Memory is a listener preference, never a ranking. */
export function chooseInitialStation(explicitStation: string | null | undefined, remembered: string | null, playableIds: readonly string[], fallback = 'jolt-radio'): string {
  if (explicitStation && playableIds.includes(explicitStation)) return explicitStation
  if (remembered && playableIds.includes(remembered)) return remembered
  return playableIds.includes(fallback) ? fallback : playableIds[0] || fallback
}
