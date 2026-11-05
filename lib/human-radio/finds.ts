/** Local collections contain listener choices only; nothing here ranks stations. */
export const FINDS_KEY = 'buena-onda:human-radio:finds:v1'
export const FAVORITES_KEY = 'buena-onda:human-radio:favorites:v1'
export const LEGACY_FINDS_KEY = 'buena-onda:saved-radio:v1'
export const MAX_FINDS = 200
const MAX_STORAGE_BYTES = 500_000
export type FindProvenance = { type: 'official-metadata'; url: string; verifiedAt: string }
export type Discovery = {
  id: string; stationId: string; stationName: string; title: string; artist: string | null
  kind: 'track' | 'show'; show: string | null; dj: string | null; savedAt: string
  source: string | null; provenance: FindProvenance | null
}
export type DiscoveryMetadata = {
  stationId: string; title: string | null; artist: string | null; kind: 'track' | 'show' | 'unavailable'
  available: boolean; source: string | null; observedAt: string; expiresAt?: string
  confidence?: 'provider' | 'none'; provenance?: FindProvenance | null; show?: string | null; dj?: string | null
}
const clean = (value: unknown, max = 240): string | null => typeof value === 'string' && value.trim()
  ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) || null : null
const date = (value: unknown): string | null => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null
export function safeSource(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}
export function discoveryId(item: Pick<Discovery, 'stationId' | 'kind' | 'title' | 'artist'>): string {
  return JSON.stringify([item.stationId, item.kind, item.artist?.trim().toLowerCase() || '', item.title.trim().toLowerCase()])
}
function sanitize(value: unknown, stationIds: readonly string[]): Discovery | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const stationId = clean(item.stationId), stationName = clean(item.stationName), title = clean(item.title), savedAt = date(item.savedAt)
  if (!stationId || !stationIds.includes(stationId) || !stationName || !title || !savedAt || (item.kind !== 'track' && item.kind !== 'show')) return null
  const source = safeSource(item.source), raw = item.provenance as Record<string, unknown> | null
  const provenanceUrl = safeSource(raw?.url), verifiedAt = date(raw?.verifiedAt)
  const provenance: FindProvenance | null = raw?.type === 'official-metadata' && provenanceUrl && verifiedAt ? { type: 'official-metadata', url: provenanceUrl, verifiedAt } : null
  const result: Discovery = { id: '', stationId, stationName, title, artist: clean(item.artist), kind: item.kind,
    show: clean(item.show), dj: clean(item.dj), savedAt, source, provenance }
  result.id = discoveryId(result)
  return result
}
export function parseFinds(raw: string | null, stationIds: readonly string[]): Discovery[] {
  if (!raw) return []
  if (raw.length > MAX_STORAGE_BYTES) throw new Error('Saved discoveries exceed the browser data limit.')
  const data: unknown = JSON.parse(raw)
  if (!Array.isArray(data)) throw new Error('Invalid saved discoveries format.')
  const seen = new Set<string>(), items: Discovery[] = []
  for (const value of data.slice(0, MAX_FINDS * 5)) {
    const item = sanitize(value, stationIds)
    if (item && !seen.has(item.id)) { seen.add(item.id); items.push(item) }
    if (items.length === MAX_FINDS) break
  }
  return items
}
export function parseFavorites(raw: string | null, stationIds: readonly string[]): string[] {
  if (!raw) return []
  if (raw.length > MAX_STORAGE_BYTES) throw new Error('Invalid favorite data size.')
  const values: unknown = JSON.parse(raw)
  if (!Array.isArray(values)) throw new Error('Invalid favorite data format.')
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && stationIds.includes(value)))].slice(0, stationIds.length)
}
export function moveFavorite(ids: readonly string[], id: string, direction: 'up' | 'down'): string[] {
  const result = [...ids], from = result.indexOf(id), to = from + (direction === 'up' ? -1 : 1)
  if (from >= 0 && to >= 0 && to < result.length) [result[from], result[to]] = [result[to], result[from]]
  return result
}
export function currentDiscovery(metadata: DiscoveryMetadata | null, stationName: string, playing: boolean, loading: boolean, stationIds: readonly string[], now = Date.now()): Discovery | null {
  if (!metadata || !playing || loading || !metadata.available || metadata.kind === 'unavailable' || metadata.confidence !== 'provider') return null
  const observed = Date.parse(metadata.observedAt), expires = metadata.expiresAt ? Date.parse(metadata.expiresAt) : observed + 75_000
  if (!Number.isFinite(observed) || !Number.isFinite(expires) || observed > now + 10_000 || now - observed >= 75_000 || expires <= now) return null
  // A program bookmark is distinct from a verified song. Tracks need both fields.
  if (metadata.kind === 'track' && (!clean(metadata.artist) || !clean(metadata.title))) return null
  if (!metadata.provenance || !safeSource(metadata.provenance.url)) return null
  const item = sanitize({ ...metadata, title: metadata.kind === 'show' ? metadata.show || metadata.title : metadata.title, stationName, savedAt: new Date(now).toISOString() }, stationIds)
  return item?.provenance ? item : null
}
export function searchLinks(item: Pick<Discovery, 'artist' | 'title'>) {
  const query = encodeURIComponent([clean(item.artist), clean(item.title)].filter(Boolean).join(' '))
  return { bandcamp: `https://bandcamp.com/search?q=${query}`, spotify: `https://open.spotify.com/search/${query}`,
    apple: `https://music.apple.com/us/search?term=${query}`, youtube: `https://www.youtube.com/results?search_query=${query}` }
}
export function exportFinds(items: readonly Discovery[], stationIds: readonly string[]): string {
  const safe = parseFinds(JSON.stringify(items), stationIds)
  return JSON.stringify({ format: 'buena-onda-discoveries', version: 1, exportedAt: new Date().toISOString(), discoveries: safe.map(item => ({ ...item, searchLinks: searchLinks(item) })) }, null, 2)
}
export type CollectionStorage = Pick<Storage, 'getItem' | 'setItem'>
export function readCollections(storage: CollectionStorage, stationIds: readonly string[]) {
  const current = storage.getItem(FINDS_KEY)
  const saved = parseFinds(current ?? storage.getItem(LEGACY_FINDS_KEY), stationIds)
  const favorites = parseFavorites(storage.getItem(FAVORITES_KEY), stationIds)
  return { saved, favorites, migrated: current === null && saved.length > 0 }
}
