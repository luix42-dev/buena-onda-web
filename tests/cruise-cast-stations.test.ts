import test from 'node:test'
import assert from 'node:assert/strict'
import { receiverCastStations, resolveCastStations } from '../lib/cruise/cast-stations'
import { createReceiverFrameSeed } from '../lib/cruise/cast-receiver-seed'

const publicStationOrder = [
  'buena-onda-radio', 'jolt-radio', 'nts-radio', 'nts-radio-2', 'wvum',
  'the-lot-radio', 'dublab', 'hkcr', 'veridian-club',
  'nightride', 'darksynth', 'chillsynth', 'datawave', 'spacesynth',
]

test('default Cast catalog includes every selectable station in picker order, including playlists and HLS', () => {
  assert.deepEqual(receiverCastStations, publicStationOrder)
  for (const config of [undefined, '', '  ']) assert.deepEqual(resolveCastStations(config), publicStationOrder)
})

test('an optional sender rollout restriction cannot narrow the receiver catalog or add media URLs', () => {
  assert.deepEqual(resolveCastStations('nightride, jolt-radio,nightride,unknown,https://other.test/radio'), ['jolt-radio', 'nightride'])
  assert.deepEqual(receiverCastStations, publicStationOrder)
  assert.deepEqual(resolveCastStations('poolsuite,kiosk-radio,https://other.test/radio'), [])
})

test('every catalog station can seed the receiver, including those outside an optional sender restriction', () => {
  for (const station of publicStationOrder) {
    const seed = createReceiverFrameSeed(receiverCastStations)
    const result = seed({ version: 1, sequence: 1, type: 'sync', playing: false, station })
    assert.ok(result, `${station} must be accepted by the receiver`)
    assert.equal(new URL(result, 'https://example.test').searchParams.get('station'), station)
  }
  for (const station of ['poolsuite', 'unknown', 'https://other.test/radio']) {
    assert.equal(createReceiverFrameSeed(receiverCastStations)({ version: 1, sequence: 1, type: 'sync', playing: true, station }), null)
  }
})
