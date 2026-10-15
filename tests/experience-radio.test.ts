import test from 'node:test'
import assert from 'node:assert/strict'
import { HUMAN_RADIO_STATIONS, STATION_DETAILS } from '../lib/human-radio/stations'
import { searchStations } from '../lib/human-radio/station-search'
import { chooseInitialStation, parseStationPreference, readRememberedStation, STATION_MEMORY_KEY } from '../lib/human-radio/station-memory'
import { parseHumanRadioMetadata } from '../lib/human-radio/metadata-validation'
import { stationShareUrl } from '../lib/human-radio/explore'

test('station search is literal, combines editorial category and keeps catalog order', () => {
  assert.deepEqual(searchStations(HUMAN_RADIO_STATIONS, STATION_DETAILS, '  nTs   ').map(item => item.id), ['nts-radio', 'nts-radio-2'])
  assert.ok(searchStations(HUMAN_RADIO_STATIONS, STATION_DETAILS, 'Miami').some(item => item.id === 'jolt-radio'))
  assert.ok(searchStations(HUMAN_RADIO_STATIONS, STATION_DETAILS, 'jazz').length > 0)
  assert.deepEqual(searchStations(HUMAN_RADIO_STATIONS, STATION_DETAILS, 'NTS', 'Miami'), [])
  assert.deepEqual(searchStations(HUMAN_RADIO_STATIONS, STATION_DETAILS, '.*[invalid regex'), [])
  assert.deepEqual(searchStations(HUMAN_RADIO_STATIONS, STATION_DETAILS, '  ').map(item => item.id), HUMAN_RADIO_STATIONS.map(item => item.id))
})
test('memory preference is explicit, bounded and restricted to eligible IDs', () => {
  const ids = ['jolt-radio', 'nts-radio']
  assert.equal(parseStationPreference(null, ids), null)
  for (const raw of ['{', '{}', '[]', ' '.repeat(1025), JSON.stringify({ version: 1, enabled: false, stationId: 'nts-radio' }), JSON.stringify({ version: 1, enabled: true, stationId: 'disabled' })]) assert.equal(parseStationPreference(raw, ids), null)
  const preference = JSON.stringify({ version: 1, enabled: true, stationId: 'nts-radio', injectedHistory: ['not retained'] })
  assert.deepEqual(parseStationPreference(preference, ids), { version: 1, enabled: true, stationId: 'nts-radio' })
  assert.equal(readRememberedStation({ getItem: key => key === STATION_MEMORY_KEY ? preference : null }, ids), 'nts-radio')
  assert.throws(() => readRememberedStation({ getItem: () => { throw new Error('storage denied') } }, ids))
})
test('initial station precedence honors explicit links before remembered preference and default', () => {
  const ids = ['jolt-radio', 'nts-radio']
  assert.equal(chooseInitialStation('jolt-radio', 'nts-radio', ids), 'jolt-radio')
  assert.equal(chooseInitialStation(null, 'nts-radio', ids), 'nts-radio')
  assert.equal(chooseInitialStation('unknown', 'disabled', ids), 'jolt-radio')
  assert.equal(chooseInitialStation(null, null, ['nts-radio']), 'nts-radio')
})
test('experience sharing is allowlisted and original Human Radio default is preserved', () => {
  assert.equal(new URL(stationShareUrl('https://example.com', 'nts-radio-2')).pathname, '/cruise/human-radio')
  const url = new URL(stationShareUrl('https://example.com', 'a&station=other', '/cruise/experience'))
  assert.equal(url.pathname, '/cruise/experience'); assert.equal(url.searchParams.get('station'), 'a&station=other')
  assert.equal(new URL(stationShareUrl('https://example.com', 'nts-radio', '//evil.example' as '/cruise/experience')).pathname, '/cruise/human-radio')
})
const now = Date.parse('2026-10-15T10:00:00Z')
const fixture = () => ({ stationId: 'dublab', kind: 'track', available: true, confidence: 'provider', title: 'Labeled test title', artist: 'Test artist', show: null, dj: null,
  source: 'https://dublab.airtime.pro/api/live-info', provenance: { type: 'official-metadata', url: 'https://dublab.airtime.pro/api/live-info', verifiedAt: new Date(now).toISOString() },
  observedAt: new Date(now).toISOString(), expiresAt: new Date(now + 20000).toISOString() })
test('client metadata boundary accepts complete fresh provider track and distinct broadcasts', () => {
  assert.equal(parseHumanRadioMetadata(fixture(), 'dublab', now)?.title, 'Labeled test title')
  const broadcast = parseHumanRadioMetadata({ ...fixture(), kind: 'show', title: 'must not appear as track', artist: null, show: 'A published broadcast' }, 'dublab', now)
  assert.equal(broadcast?.kind, 'show'); assert.equal(broadcast?.title, null); assert.equal(broadcast?.show, 'A published broadcast')
})
test('client metadata boundary rejects malformed, stale, wrong-station and wrong-provenance values', () => {
  const valid = fixture()
  for (const change of [{ stationId: 'nts-radio' }, { source: 'javascript:alert(1)' }, { confidence: 'none' }, { available: 'true' }, { artist: null }, { title: 'x'.repeat(241) }, { observedAt: new Date(now + 2000).toISOString() }, { expiresAt: new Date(now).toISOString() }, { expiresAt: new Date(now + 20001).toISOString() }, { provenance: { ...valid.provenance, type: 'unknown' } }, { provenance: { ...valid.provenance, verifiedAt: 'invalid' } }, { provenance: { ...valid.provenance, url: 'https://attacker.example' } }]) {
    assert.equal(parseHumanRadioMetadata({ ...valid, ...change }, 'dublab', now), null, JSON.stringify(change))
  }
  assert.equal(parseHumanRadioMetadata(valid, 'dublab', now + 20000), null)
  assert.equal(parseHumanRadioMetadata(valid, '__proto__', now), null)
  for (const value of [null, [], {}, 'title']) assert.equal(parseHumanRadioMetadata(value, 'dublab', now), null)
})
