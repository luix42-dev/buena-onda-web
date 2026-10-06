import test from 'node:test'
import assert from 'node:assert/strict'
import { discoverCruiseStations, localRadioDiscovery } from '../lib/cruise/discovery'
import { canPlayCruiseStation } from '../lib/cruise/stations'

test('local mood discovery preserves the approved NTS playback entries', async () => {
  const stations = await discoverCruiseStations(localRadioDiscovery, { mood: 'global' }, new AbortController().signal)
  assert.deepEqual(stations.map(station => station.id), ['nts-radio', 'nts-radio-2'])
  assert.ok(stations.every(canPlayCruiseStation))
})
test('future discovery metadata cannot introduce a playable source or unsafe link', async () => {
  const stations = await discoverCruiseStations({ id: 'partner', async search() { return [
    { id: 'unsafe', name: 'Unsafe', website: 'javascript:alert(1)' },
    { id: 'external', name: 'External', website: 'https://example.org/radio' },
    { id: 'known', name: 'Incorrect directory label', manifestId: 'jolt-radio' },
  ] } }, {}, new AbortController().signal)
  assert.equal(stations.length, 2)
  assert.equal(stations[0].source, null); assert.equal(canPlayCruiseStation(stations[0]), false)
  assert.equal(stations[1].name, 'Jolt Radio'); assert.equal(canPlayCruiseStation(stations[1]), true)
})
test('cancelled discovery cannot publish stale results', async () => {
  const controller = new AbortController(); controller.abort()
  await assert.rejects(discoverCruiseStations(localRadioDiscovery, {}, controller.signal), { name: 'AbortError' })
})
