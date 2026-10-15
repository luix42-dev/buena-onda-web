import test from 'node:test'
import assert from 'node:assert/strict'
import { currentDiscovery, exportFinds, FINDS_KEY, LEGACY_FINDS_KEY, moveFavorite, parseFavorites, parseFinds, readCollections, safeSource, searchLinks } from '../lib/human-radio/finds'

const ids = ['nts-1', 'nts-2'], now = Date.now()
const item = { id: 'legacy-id', stationId: 'nts-1', stationName: 'NTS 1', title: 'Example', artist: 'Artist', kind: 'track', savedAt: new Date(now).toISOString(), source: 'https://www.nts.live/' }
const metadata = { ...item, available: true, kind: 'track' as const, observedAt: new Date(now).toISOString(), confidence: 'provider' as const, provenance: { type: 'official-metadata' as const, url: 'https://www.nts.live/api/v2/live', verifiedAt: new Date(now).toISOString() } }
test('sanitizes legacy saves, recomputes identity and deduplicates without trusting IDs', () => {
  const result = parseFinds(JSON.stringify([item, { ...item, id: 'injected' }, { ...item, stationId: 'unknown' }, { ...item, savedAt: 'nope' }]), ids)
  assert.equal(result.length, 1); assert.notEqual(result[0].id, item.id); assert.equal(result[0].provenance, null)
})
test('rejects malformed and oversized storage and drops unsafe source URLs', () => {
  assert.throws(() => parseFinds('{', ids)); assert.throws(() => parseFinds('{}', ids)); assert.throws(() => parseFinds(' '.repeat(500001), ids))
  assert.equal(parseFinds(JSON.stringify([{ ...item, source: 'javascript:alert(1)' }]), ids)[0].source, null)
  assert.equal(safeSource('https://user:password@example.com'), null)
})
test('legacy migration reads without writing or overwriting either collection', () => {
  const entries = new Map([[LEGACY_FINDS_KEY, JSON.stringify([item])]])
  let writes = 0
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: () => { writes++ } }
  assert.equal(readCollections(storage, ids).migrated, true); assert.equal(writes, 0)
  entries.set(FINDS_KEY, '[]'); assert.deepEqual(readCollections(storage, ids).saved, []); assert.equal(readCollections(storage, ids).migrated, false)
  assert.throws(() => readCollections({ ...storage, getItem: () => { throw new Error('blocked') } }, ids))
})
test('saving requires playback, provider provenance and fresh complete track metadata', () => {
  assert.ok(currentDiscovery(metadata, 'NTS 1', true, false, ids, now))
  assert.equal(currentDiscovery(metadata, 'NTS 1', false, false, ids, now), null)
  assert.equal(currentDiscovery(metadata, 'NTS 1', true, true, ids, now), null)
  assert.equal(currentDiscovery({ ...metadata, artist: null }, 'NTS 1', true, false, ids, now), null)
  assert.equal(currentDiscovery({ ...metadata, provenance: null }, 'NTS 1', true, false, ids, now), null)
  assert.equal(currentDiscovery(metadata, 'NTS 1', true, false, ids, now + 75001), null)
  assert.equal(currentDiscovery({ ...metadata, expiresAt: 'invalid' }, 'NTS 1', true, false, ids, now), null)
})
test('show bookmarks remain explicitly distinguished from tracks', () => {
  const saved = currentDiscovery({ ...metadata, kind: 'show', title: null, artist: null, show: 'A human show' }, 'NTS 1', true, false, ids, now)
  assert.equal(saved?.kind, 'show'); assert.equal(saved?.show, 'A human show'); assert.equal(saved?.title, 'A human show')
})
test('export is portable, bounded, and all external links are transparent encoded searches', () => {
  const saved = parseFinds(JSON.stringify([{ ...item, title: 'https://evil.example/?a=1&b=2' }]), ids)
  const result = JSON.parse(exportFinds(saved, ids))
  assert.equal(result.version, 1); assert.equal(result.discoveries.length, 1)
  const links = searchLinks(saved[0]); assert.equal(new URL(links.bandcamp).host, 'bandcamp.com'); assert.equal(new URL(links.spotify).host, 'open.spotify.com')
  assert.equal(new URL(links.youtube).searchParams.get('search_query'), `Artist ${saved[0].title}`)
})
test('favorite presets retain manual order, reject unknown IDs and respect move boundaries', () => {
  assert.deepEqual(parseFavorites('["nts-2","nts-1","nts-2","unknown"]', ids), ['nts-2', 'nts-1'])
  assert.deepEqual(moveFavorite(ids, 'nts-1', 'down'), ['nts-2', 'nts-1'])
  assert.deepEqual(moveFavorite(ids, 'nts-1', 'up'), ids)
  assert.deepEqual(moveFavorite(ids, 'unknown', 'up'), ids)
})
