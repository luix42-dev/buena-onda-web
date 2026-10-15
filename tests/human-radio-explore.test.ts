import test from 'node:test'
import assert from 'node:assert/strict'
import { discoveryCard, randomStation, stationShareUrl } from '../lib/human-radio/explore'
import type { Discovery } from '../lib/human-radio/finds'

test('Surprise Me chooses only another eligible station and uses no listener profile', () => {
  const ids = ['jolt-radio', 'nts-radio', 'dublab']
  assert.equal(randomStation(ids, 'jolt-radio', () => 0), 'nts-radio')
  assert.equal(randomStation(ids, 'jolt-radio', () => .999999), 'dublab')
  assert.equal(randomStation(['jolt-radio'], 'jolt-radio'), 'jolt-radio')
  assert.equal(randomStation([], 'jolt-radio'), null)
})

test('station links preserve the experimental destination and encode station IDs', () => {
  const url = new URL(stationShareUrl('https://example.com', 'nts-radio-2'))
  assert.equal(url.pathname, '/cruise/human-radio')
  assert.equal(url.searchParams.get('station'), 'nts-radio-2')
})

test('discovery card escapes untrusted titles and contains no recordings or external media', () => {
  const item: Discovery = { id: '1', stationId: 'dublab', stationName: 'dublab', title: '<script>alert(1)</script>', artist: 'A & B', kind: 'track', show: null, dj: null, source: null, provenance: null, savedAt: '2026-10-14T00:00:00Z' }
  const svg = discoveryCard(item)
  assert.ok(svg.includes('&lt;script&gt;'))
  assert.ok(svg.includes('A &amp; B'))
  assert.ok(!svg.includes('<script>'))
  assert.ok(!svg.includes('<image'))
  assert.ok(!svg.includes('<audio'))
})
