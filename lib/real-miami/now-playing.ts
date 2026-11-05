/** Public provider metadata only. No audio interception, identification or recording. */
export type CruiseNowPlaying = {
  stationId: string
  title: string | null
  artist: string | null
  /** Published metadata endpoint, not a listener stream or artwork proxy. */
  source: string | null
  observedAt: string
  available: boolean
  kind: 'track' | 'show' | 'unavailable'
}

const providers = {
  jolt: 'https://public.radio.co/stations/sd8ab6b5aa/status',
  nts: 'https://www.nts.live/api/v2/live',
  dublab: 'https://dublab.airtime.pro/api/live-info',
} as const
type Provider = keyof typeof providers
const mappings: Record<string, { provider: Provider; channel?: string }> = {
  'jolt-radio': { provider: 'jolt' },
  'nts-radio': { provider: 'nts', channel: '1' },
  'nts-radio-2': { provider: 'nts', channel: '2' },
  dublab: { provider: 'dublab' },
}
type JsonObject = Record<string, unknown>
type Observation = { json: JsonObject | null; at: string; expires: number }
const cache = new Map<Provider, Observation>()
const pending = new Map<Provider, Promise<Observation>>()
const object = (v: unknown): JsonObject => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as JsonObject : {}
const text = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }
  const clean = v.replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity: string) => {
    if (entity[0] !== '#') return entities[entity.toLowerCase()] || match
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
  }).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
  return clean || null
}

async function observe(provider: Provider): Promise<Observation> {
  const prior = cache.get(provider)
  if (prior && prior.expires > Date.now()) return prior
  const inflight = pending.get(provider)
  if (inflight) return inflight
  const request = (async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000)
    let json: JsonObject | null = null
    try {
      const response = await fetch(providers[provider], {
        signal: controller.signal, cache: 'no-store', redirect: 'error',
        headers: { Accept: 'application/json, application/vnd.live-list+json' },
      })
      if (response.ok) {
        // All three endpoints are small JSON documents. Refuse unexpected
        // payloads and cap actual bytes even if Content-Length is absent.
        const type = response.headers.get('content-type') || ''
        if (!type.includes('json') || Number(response.headers.get('content-length') || 0) > 262144) throw new Error('Unexpected metadata response')
        const reader = response.body?.getReader()
        if (reader) {
          const chunks: Uint8Array[] = []; let size = 0
          while (true) {
            const { value, done } = await reader.read(); if (done) break
            size += value.byteLength
            if (size > 262144) { await reader.cancel(); throw new Error('Metadata too large') }
            chunks.push(value)
          }
          const bytes = new Uint8Array(size); let offset = 0
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
          json = object(JSON.parse(new TextDecoder().decode(bytes)))
        }
      }
    } catch { /* Failure is unavailable; never replay stale titles as current. */ }
    finally { clearTimeout(timer) }
    const observation = { json, at: new Date().toISOString(), expires: Date.now() + 20000 }
    cache.set(provider, observation)
    return observation
  })()
  pending.set(provider, request)
  try { return await request } finally { pending.delete(provider) }
}

export async function getCruiseNowPlaying(stationId: string): Promise<CruiseNowPlaying> {
  const mapped = Object.prototype.hasOwnProperty.call(mappings, stationId) ? mappings[stationId] : undefined
  const empty: CruiseNowPlaying = { stationId, title: null, artist: null, source: null, observedAt: new Date().toISOString(), available: false, kind: 'unavailable' }
  if (!mapped) return empty
  const observation = await observe(mapped.provider)
  const result = { ...empty, source: providers[mapped.provider], observedAt: observation.at }
  const json = observation.json
  if (!json) return result
  if (mapped.provider === 'jolt') {
    if (json.status !== 'online') return result
    // Radio.co publishes one combined title; do not guess a performer by
    // splitting mixes, promos or show names at arbitrary punctuation.
    result.title = text(object(json.current_track).title)
    result.kind = result.title ? 'show' : 'unavailable'
  } else if (mapped.provider === 'nts') {
    const channels = Array.isArray(json.results) ? json.results : []
    const channel = object(channels.find(c => object(c).channel_name === mapped.channel))
    const now = object(channel.now), start = Date.parse(String(now.start_timestamp || '')), end = Date.parse(String(now.end_timestamp || ''))
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > Date.now() + 60000 || end < Date.now() - 60000) return result
    result.title = text(now.broadcast_title)
    result.kind = result.title ? 'show' : 'unavailable'
  } else {
    const current = object(json.current), metadata = object(current.metadata)
    if (current.type === 'track') {
      // Airtime current-track times use UTC, while its show schedule is local.
      // Reject expired current items with a tolerance for provider caching.
      const timestamp = (value: unknown) => typeof value === 'string' ? Date.parse(value.replace(' ', 'T') + (/Z$|[+-]\d\d:\d\d$/.test(value) ? '' : 'Z')) : NaN
      const start = timestamp(current.starts), end = timestamp(current.ends)
      if ((Number.isFinite(start) && start > Date.now() + 60000) || (Number.isFinite(end) && end < Date.now() - 60000)) return result
      result.title = text(metadata.track_title) || text(current.name)
      result.artist = text(metadata.artist_name)
      result.kind = result.title ? 'track' : 'unavailable'
    } else {
      const shows = Array.isArray(json.currentShow) ? json.currentShow : []
      result.title = text(object(shows[0]).name)
      result.kind = result.title ? 'show' : 'unavailable'
    }
  }
  result.available = Boolean(result.title)
  return result
}
