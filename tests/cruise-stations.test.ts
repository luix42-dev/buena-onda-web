import assert from 'node:assert/strict'
import test from 'node:test'
import { CRUISE_STATIONS, MIAMI_CRUISE_STATIONS, canPlayCruiseStation, getCruiseStation } from '../lib/cruise/stations'

test('experimental stations do not change the original Cruise catalog', () => {
  assert.deepEqual(CRUISE_STATIONS.map(station => station.id), ['buena-onda-radio', 'jolt-radio', 'nts-radio', 'nts-radio-2', 'poolsuite'])
  assert.equal(CRUISE_STATIONS.filter(canPlayCruiseStation).length, 4)
  assert.equal(MIAMI_CRUISE_STATIONS.filter(canPlayCruiseStation).length, 8)
  for (const id of ['rinse-france', 'the-lot-radio', 'kiosk-radio', 'dublab']) {
    assert.equal(getCruiseStation(id), undefined)
    const station = MIAMI_CRUISE_STATIONS.find(item => item.id === id)!
    assert.equal(canPlayCruiseStation(station), true)
    assert.equal(station.rightsStatus, 'public-stream')
    assert.equal(new URL(station.source!).protocol, 'https:')
    assert.equal(new URL(station.externalUrl!).protocol, 'https:')
  }
})

test('permission-required or external-only stations remain unavailable', () => {
  const station = MIAMI_CRUISE_STATIONS.find(item => item.id === 'the-lot-radio')!
  assert.equal(canPlayCruiseStation({ ...station, rightsStatus: 'permission-required' }), false)
  assert.equal(canPlayCruiseStation({ ...station, playback: 'external' }), false)
  assert.equal(canPlayCruiseStation({ ...station, enabled: false }), false)
  assert.equal(canPlayCruiseStation({ ...station, source: '' }), false)
})
