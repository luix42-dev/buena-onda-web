import type { CruiseNowPlaying } from '../real-miami/now-playing'

/** Provider-published information, not independent identification of the audio. */
export type HumanRadioMetadata = {
  stationId: string
  kind: 'track' | 'show' | 'unavailable'
  title: string | null
  artist: string | null
  show: string | null
  dj: string | null
  available: boolean
  confidence: 'provider' | 'none'
  source: string | null
  provenance: { type: 'official-metadata'; url: string; verifiedAt: string } | null
  observedAt: string
  expiresAt: string
  message: string
}

const SOURCES: Record<string, string> = {
  'jolt-radio': 'https://public.radio.co/stations/sd8ab6b5aa/status',
  'nts-radio': 'https://www.nts.live/api/v2/live',
  'nts-radio-2': 'https://www.nts.live/api/v2/live',
  dublab: 'https://dublab.airtime.pro/api/live-info',
}
const TTL = 20_000
const MAX_BYTES = 262_144
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const clean = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const text = value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
  // A filename, station bumper or unknown placeholder is not a confirmed song.
  return !text || /\.(mp3|wav|flac|aac|ogg)$/i.test(text) || /^(unknown|unknown artist|unknown title|n\/a|untitled)$/i.test(text) ? null : text
}

export function unavailableMetadata(stationId: string, now = Date.now()): HumanRadioMetadata {
  return { stationId, kind: 'unavailable', title: null, artist: null, show: null, dj: null, available: false, confidence: 'none', source: Object.prototype.hasOwnProperty.call(SOURCES, stationId) ? SOURCES[stationId] : null, provenance: null, observedAt: new Date(now).toISOString(), expiresAt: new Date(now + TTL).toISOString(), message: 'Track information unavailable' }
}

export function isFreshHumanRadioTrack(value: HumanRadioMetadata | null | undefined, now = Date.now()): value is HumanRadioMetadata & { title: string; artist: string } {
  if (!value) return false
  const observed = Date.parse(value.observedAt), expires = Date.parse(value.expiresAt)
  return Boolean(value.kind === 'track' && value.available && value.confidence === 'provider' && clean(value.title) && clean(value.artist) && Object.prototype.hasOwnProperty.call(SOURCES, value.stationId) && value.source === SOURCES[value.stationId] && value.provenance?.type === 'official-metadata' && value.provenance.url === SOURCES[value.stationId] && Number.isFinite(observed) && observed <= now + 1000 && now - observed < TTL && expires > now && expires <= observed + TTL)
}

function withProvenance(value: HumanRadioMetadata, now: number): HumanRadioMetadata {
  return { ...value, available: true, confidence: 'provider', provenance: { type: 'official-metadata', url: value.source!, verifiedAt: new Date(now).toISOString() } }
}

/** Conservative compatibility adapter: a combined provider title stays a show. */
export function normalizeLegacyMetadata(value: CruiseNowPlaying, now = Date.now()): HumanRadioMetadata {
  const empty = unavailableMetadata(value.stationId, now)
  const observed = Date.parse(value.observedAt)
  if (!value.available || !SOURCES[value.stationId] || value.source !== SOURCES[value.stationId] || !Number.isFinite(observed) || observed > now + 1000 || now - observed >= TTL) return empty
  // Only the fixed, schedule-aware NTS/Jolt adapters are reused here. Dublab
  // needs its raw current-item timestamps before any track can be saved.
  if (!['jolt-radio', 'nts-radio', 'nts-radio-2'].includes(value.stationId) || value.kind !== 'show') return empty
  const show = clean(value.title)
  return show ? withProvenance({ ...empty, kind: 'show', show, observedAt: value.observedAt, expiresAt: new Date(observed + TTL).toISOString() }, observed) : empty
}

function timestamp(value: unknown, offsetSeconds = 0): number {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)?$/.test(value)) return NaN
  const zoned = /Z$|[+-]\d\d:\d\d$/.test(value)
  return Date.parse(value.replace(' ', 'T') + (zoned ? '' : 'Z')) - (zoned ? 0 : offsetSeconds * 1000)
}

function activeWindow(item: Record<string, unknown>, now: number, offsetSeconds = 0): number | null {
  const start = timestamp(item.starts ?? item.start_timestamp, offsetSeconds)
  const end = timestamp(item.ends ?? item.end_timestamp, offsetSeconds)
  // No stale tolerance: at end of the provider window the UI stops claiming
  // that song is current. Missing times are also not evidence of freshness.
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && end > now && end > start ? end : null
}

export function parseDublabMetadata(json: unknown, now = Date.now()): HumanRadioMetadata {
  const empty = unavailableMetadata('dublab', now), payload = object(json)
  const current = object(payload.current), metadata = object(current.metadata)
  const end = activeWindow(current, now)
  const offset = Number(payload.timezoneOffset)
  const shows = Array.isArray(payload.currentShow) ? payload.currentShow : []
  const show = Number.isFinite(offset) && Math.abs(offset) <= 14 * 3600 ? shows.map(object).find(item => activeWindow(item, now, offset)) : undefined
  const showTitle = clean(show?.name)
  if (current.type === 'track' && end) {
    // Never split current.name at a dash or promote a previous/next item.
    const title = clean(metadata.track_title), artist = clean(metadata.artist_name)
    if (title && artist) return withProvenance({ ...empty, kind: 'track', title, artist, show: showTitle, expiresAt: new Date(Math.min(now + TTL, end)).toISOString() }, now)
  }
  if (showTitle) return withProvenance({ ...empty, kind: 'show', show: showTitle, expiresAt: new Date(Math.min(now + TTL, activeWindow(show!, now, offset)!)).toISOString() }, now)
  return empty
}

/** Fixed origin/path, no redirects, bounded body and timeout; never an audio proxy. */
async function fetchDublab(fetcher: typeof fetch): Promise<unknown> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetcher(SOURCES.dublab, { signal: controller.signal, redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' } })
    if (!response.ok || !(response.headers.get('content-type') || '').includes('json') || Number(response.headers.get('content-length') || 0) > MAX_BYTES) return null
    const reader = response.body?.getReader()
    if (!reader) return null
    const chunks: Uint8Array[] = []; let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) { await reader.cancel(); return null }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size); let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    return JSON.parse(new TextDecoder().decode(bytes))
  } finally { clearTimeout(timer) }
}

/** Injectable dependencies keep tests deterministic and make no network calls. */
export function createHumanRadioMetadataReader(dependencies: { fetcher?: typeof fetch; legacy?: (stationId: string) => Promise<CruiseNowPlaying>; now?: () => number } = {}) {
  const clock = dependencies.now || Date.now, fetcher = dependencies.fetcher || fetch
  const legacy = dependencies.legacy || (async (stationId: string) => (await import('../real-miami/now-playing')).getCruiseNowPlaying(stationId))
  let cached: HumanRadioMetadata | null = null
  let pending: Promise<HumanRadioMetadata> | null = null
  return async function read(stationId: string): Promise<HumanRadioMetadata> {
    if (!Object.prototype.hasOwnProperty.call(SOURCES, stationId)) return unavailableMetadata(stationId, clock())
    if (stationId !== 'dublab') {
      try { return normalizeLegacyMetadata(await legacy(stationId), clock()) } catch { return unavailableMetadata(stationId, clock()) }
    }
    if (cached && Date.parse(cached.expiresAt) > clock()) return cached
    if (pending) return pending
    pending = (async () => {
      try { cached = parseDublabMetadata(await fetchDublab(fetcher), clock()) } catch { cached = unavailableMetadata(stationId, clock()) }
      return cached
    })()
    try { return await pending } finally { pending = null }
  }
}

export const getHumanRadioMetadata = createHumanRadioMetadataReader()
