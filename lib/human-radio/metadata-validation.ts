import type { HumanRadioMetadata } from './metadata'
export const HUMAN_RADIO_METADATA_TTL_MS = 20_000
export const HUMAN_RADIO_METADATA_SOURCES: Readonly<Record<string, string>> = {
  'jolt-radio': 'https://public.radio.co/stations/sd8ab6b5aa/status',
  'nts-radio': 'https://www.nts.live/api/v2/live',
  'nts-radio-2': 'https://www.nts.live/api/v2/live',
  dublab: 'https://dublab.airtime.pro/api/live-info',
  'veridian-club': 'https://veridian.club/',
}
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown): string | null => typeof value === 'string' && value.length <= 240
  ? value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim() || null : null
/** Client response boundary: expired or unproven data cannot become a current title. */
export function parseHumanRadioMetadata(value: unknown, stationId: string, now = Date.now()): HumanRadioMetadata | null {
  const item = object(value), provenance = object(item.provenance)
  if (!Object.prototype.hasOwnProperty.call(HUMAN_RADIO_METADATA_SOURCES, stationId)) return null
  const source = HUMAN_RADIO_METADATA_SOURCES[stationId]
  if (item.stationId !== stationId || item.available !== true || item.confidence !== 'provider' || (item.kind !== 'track' && item.kind !== 'show') || item.source !== source || provenance.type !== 'official-metadata' || provenance.url !== source) return null
  if (typeof item.observedAt !== 'string' || typeof item.expiresAt !== 'string' || typeof provenance.verifiedAt !== 'string') return null
  const observed = Date.parse(item.observedAt), expires = Date.parse(item.expiresAt), verified = Date.parse(provenance.verifiedAt)
  if (![observed, expires, verified].every(Number.isFinite) || observed > now + 1000 || now - observed >= HUMAN_RADIO_METADATA_TTL_MS || expires <= now || expires > observed + HUMAN_RADIO_METADATA_TTL_MS || verified > now + 1000 || Math.abs(verified - observed) > 1000) return null
  for (const field of ['title', 'artist', 'show', 'dj']) if (item[field] !== null && (typeof item[field] !== 'string' || (item[field] as string).length > 240)) return null
  const title = text(item.title), artist = text(item.artist), show = text(item.show), dj = text(item.dj)
  if (item.kind === 'track' && (!title || !artist) || item.kind === 'show' && !show) return null
  return { stationId, kind: item.kind, title: item.kind === 'track' ? title : null, artist: item.kind === 'track' ? artist : null, show, dj, available: true,
    confidence: 'provider', source, provenance: { type: 'official-metadata', url: source, verifiedAt: new Date(verified).toISOString() },
    observedAt: new Date(observed).toISOString(), expiresAt: new Date(expires).toISOString(), message: 'Track information unavailable' }
}
