export const EXPERIENCE_PRESENCE_LEASE_MS = 45_000
type PresenceMeta = { visitor?: unknown; at?: unknown } | null | undefined
export type LeaseState = Record<string, ReadonlyArray<PresenceMeta> | null | undefined>

/** Only explicit fresh leases count. Missing, expired and future timestamps fail closed. */
export function freshPresence(state: LeaseState, now = Date.now(), leaseMs = EXPERIENCE_PRESENCE_LEASE_MS): LeaseState {
  const fresh: LeaseState = {}
  for (const [key, values] of Object.entries(state)) {
    const metas = Array.isArray(values) ? values.filter(meta => meta && typeof meta.at === 'number' && Number.isFinite(meta.at) && meta.at <= now + 1000 && now - meta.at < leaseMs) : []
    if (metas.length) fresh[key] = metas
  }
  return fresh
}
