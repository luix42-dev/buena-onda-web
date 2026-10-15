import assert from 'node:assert/strict'
import test from 'node:test'
import { createHumanRadioMetadataReader, isFreshHumanRadioTrack, normalizeLegacyMetadata, parseDublabMetadata } from '../lib/human-radio/metadata'

const NOW = Date.parse('2026-10-14T18:30:00Z')
const fixture = () => ({
  current: { type: 'track', starts: '2026-10-14 18:29:00', ends: '2026-10-14 18:31:00', metadata: { artist_name: 'A real artist', track_title: 'A real title' } },
  timezoneOffset: '-25200',
  currentShow: [{ starts: '2026-10-14 11:00:00', ends: '2026-10-14 12:00:00', name: 'A published show with a dash — stays intact' }],
})

test('timed, structured provider track has provenance and a distinct show; DJ never inferred', () => {
  const result = parseDublabMetadata(fixture(), NOW)
  assert.equal(result.kind, 'track')
  assert.equal(result.artist, 'A real artist')
  assert.equal(result.title, 'A real title')
  assert.equal(result.show, 'A published show with a dash — stays intact')
  assert.equal(result.dj, null)
  assert.equal(result.confidence, 'provider')
  assert.equal(result.provenance?.url, 'https://dublab.airtime.pro/api/live-info')
  assert.ok(isFreshHumanRadioTrack(result, NOW))
  assert.equal(isFreshHumanRadioTrack(result, NOW + 20_000), false)
})

test('stale, future, missing-timestamp, incomplete and filename tracks cannot be saved', () => {
  for (const change of [
    { ends: '2026-10-14 18:29:59' },
    { starts: '2026-10-14 18:30:01' },
    { starts: undefined },
    { metadata: { artist_name: '', track_title: 'Song' } },
    { metadata: { artist_name: 'Artist', track_title: 'station_promo.mp3' } },
  ]) {
    const data = fixture()
    Object.assign(data.current, change)
    const result = parseDublabMetadata(data, NOW)
    assert.equal(result.kind, 'show')
    assert.equal(result.title, null)
    assert.equal(result.artist, null)
    assert.equal(result.message, 'Track information unavailable')
    assert.equal(isFreshHumanRadioTrack(result, NOW), false)
  }
})

test('previous tracks and stale shows are never promoted as current', () => {
  const data = fixture()
  const result = parseDublabMetadata({ previous: data.current, currentShow: data.currentShow, timezoneOffset: data.timezoneOffset }, NOW + 3600_000)
  assert.equal(result.kind, 'unavailable')
  assert.equal(result.provenance, null)
  assert.equal(parseDublabMetadata(null, NOW).kind, 'unavailable')
})

test('track expiry is capped by provider end time, including subsecond timestamps', () => {
  const data = fixture()
  data.current.ends = '2026-10-14 18:30:05.000000'
  assert.equal(parseDublabMetadata(data, NOW).expiresAt, '2026-10-14T18:30:05.000Z')
})

test('Jolt and NTS combined titles remain show metadata; stale or wrong-origin observations are rejected', () => {
  const legacy = { stationId: 'nts-radio', title: 'Artist - may be a show', artist: null, kind: 'show' as const, available: true, source: 'https://www.nts.live/api/v2/live', observedAt: new Date(NOW).toISOString() }
  const result = normalizeLegacyMetadata(legacy, NOW)
  assert.equal(result.show, legacy.title)
  assert.equal(result.title, null)
  assert.equal(result.dj, null)
  assert.equal(normalizeLegacyMetadata(legacy, NOW + 20_000).kind, 'unavailable')
  assert.equal(normalizeLegacyMetadata({ ...legacy, source: 'https://untrusted.example' }, NOW).kind, 'unavailable')
  assert.equal(normalizeLegacyMetadata({ ...legacy, observedAt: new Date(NOW + 2000).toISOString() }, NOW).kind, 'unavailable')
})

test('unknown station IDs never trigger fetch or a legacy adapter, including prototype keys', async () => {
  const read = createHumanRadioMetadataReader({ fetcher: async () => { throw new Error('must not fetch') }, legacy: async () => { throw new Error('must not call') }, now: () => NOW })
  for (const id of ['https://127.0.0.1', '__proto__', 'constructor', 'unknown']) assert.equal((await read(id)).kind, 'unavailable')
})

test('fixed dublab requests reject redirects and deduplicate; expired failures do not replay tracks', async () => {
  let now = NOW, calls = 0
  const read = createHumanRadioMetadataReader({ now: () => now, fetcher: async (url, options) => {
    calls++
    assert.equal(url, 'https://dublab.airtime.pro/api/live-info')
    assert.equal(options?.redirect, 'error')
    assert.equal(options?.cache, 'no-store')
    if (calls > 1) throw new Error('outage')
    return Response.json(fixture())
  } })
  const results = await Promise.all([read('dublab'), read('dublab')])
  assert.equal(calls, 1)
  assert.equal(results[0].kind, 'track')
  now += 20_000
  assert.equal((await read('dublab')).kind, 'unavailable')
  assert.equal(calls, 2)
})

test('unexpected types, oversized payloads and malformed JSON fail closed', async () => {
  for (const response of [new Response('<html/>', { headers: { 'content-type': 'text/html' } }), new Response('x'.repeat(262145), { headers: { 'content-type': 'application/json' } }), new Response('{', { headers: { 'content-type': 'application/json' } })]) {
    const read = createHumanRadioMetadataReader({ now: () => NOW, fetcher: async () => response })
    assert.equal((await read('dublab')).kind, 'unavailable')
  }
})
