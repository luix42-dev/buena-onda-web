import assert from 'node:assert/strict'
import test from 'node:test'
import { canPlayCruiseStation, CRUISE_RADIO_MOODS, CRUISE_STATIONS, DEFAULT_CRUISE_STATION, getCruiseStation, getCruiseStationsForMood } from '../lib/cruise/stations'
import type { CruiseStation } from '../lib/cruise/types'

test('Buena Onda and officially published Jolt/NTS listening streams are playable', () => {
  assert.deepEqual(CRUISE_STATIONS.filter(canPlayCruiseStation).map(station => station.id), ['buena-onda-radio', 'jolt-radio', 'nts-radio', 'nts-radio-2'])
  assert.equal(DEFAULT_CRUISE_STATION.source, '/api/radio/tracks')
  assert.equal(getCruiseStation('unknown'), undefined)
  assert.equal(new Set(CRUISE_STATIONS.map(station => station.id)).size, CRUISE_STATIONS.length)
})

test('rights and adapter support are independent required playback gates', () => {
  const approved: CruiseStation = { ...DEFAULT_CRUISE_STATION, rightsStatus: 'approved' }
  assert.equal(canPlayCruiseStation(approved), true)
  assert.equal(canPlayCruiseStation({ ...approved, playback: 'stream' }), true)
  for (const rightsStatus of ['permission-required', 'external-only'] as const) {
    assert.equal(canPlayCruiseStation({ ...approved, rightsStatus }), false)
  }
  for (const playback of ['embed', 'hls', 'external'] as const) {
    assert.equal(canPlayCruiseStation({ ...approved, playback }), false)
  }
  assert.equal(canPlayCruiseStation({ ...approved, enabled: false }), false)
  for (const source of [null, '', '   ']) {
    assert.equal(canPlayCruiseStation({ ...approved, source }), false)
  }
})

test('third-party discovery entries never carry an unauthorized media source', () => {
  for (const station of CRUISE_STATIONS.filter(station => station.rightsStatus === 'permission-required')) {
    assert.equal(station.source, null)
    assert.equal(station.enabled, false)
    assert.equal(station.playback, 'external')
    assert.equal(new URL(station.externalUrl).protocol, 'https:')
    assert.equal(canPlayCruiseStation(station), false)
  }
})

test('NTS sources match the official custom-player documentation without proxying', () => {
  assert.equal(getCruiseStation('nts-radio')?.source, 'https://stream-relay-geo.ntslive.net/stream?client=direct')
  assert.equal(getCruiseStation('nts-radio-2')?.source, 'https://stream-relay-geo.ntslive.net/stream2?client=direct')
  for (const station of CRUISE_STATIONS.filter(station => station.provider === 'nts')) {
    assert.equal(station.playback, 'stream')
    assert.equal(canPlayCruiseStation(station), true)
  }
})

test('Jolt uses the official desktop/mobile ListenAction without proxying', () => {
  const station = getCruiseStation('jolt-radio')!
  assert.equal(station.source, 'https://streamer.radio.co/sd8ab6b5aa/listen')
  assert.equal(station.playback, 'stream')
  assert.equal(canPlayCruiseStation(station), true)
})

test('mood discovery preserves honest empty categories and does not create playlists', () => {
  assert.equal(CRUISE_RADIO_MOODS.length, 8)
  assert.equal(getCruiseStationsForMood('all').length, CRUISE_STATIONS.length)
  assert.deepEqual(getCruiseStationsForMood('miami-local').map(station => station.id), ['buena-onda-radio', 'jolt-radio'])
  assert.deepEqual(getCruiseStationsForMood('night-drive'), [])
  assert.deepEqual(getCruiseStationsForMood('guest'), [])
  for (const { id } of CRUISE_RADIO_MOODS) {
    for (const station of getCruiseStationsForMood(id)) assert.ok(station.moods.includes(id))
  }
})
