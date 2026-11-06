import test from 'node:test'
import assert from 'node:assert/strict'
import { createReceiverFrameSeed } from '../lib/cruise/cast-receiver-seed'
import type { CastCommand } from '../lib/cruise/google-cast'

const sync: CastCommand = {
  version: 1, sequence: 2, type: 'sync', station: 'nightride', playing: false, muted: true,
  scene: { drive: 'retrowave', car: 'delorean', time: 'night', mood: 'night-drive' },
}

test('initial receiver seed loads the requested scene directly without autoplay', () => {
  const seed = createReceiverFrameSeed(['nightride'])
  const url = new URL(seed(sync)!, 'https://buenaondalifestyle.com')
  assert.equal(url.pathname, '/cruise')
  for (const [key, value] of Object.entries({ tv: '1', receiver: '1', quality: 'low', station: 'nightride', ...sync.scene })) {
    assert.equal(url.searchParams.get(key === 'mood' ? 'pace' : key), value)
  }
  for (const key of ['playing', 'autoplay', 'muted', 'diagnostics']) assert.equal(url.searchParams.has(key), false)
})

test('probes, partial updates and invalid seeds do not start a default scene', () => {
  const seed = createReceiverFrameSeed(['nightride'])
  assert.equal(seed({ version: 1, sequence: 1, type: 'status' }), null)
  assert.equal(seed({ version: 1, sequence: 2, type: 'volume', volume: .5 }), null)
  assert.equal(seed({ ...sync, playing: undefined }), null)
  assert.equal(seed({ ...sync, station: 'https://untrusted.test/stream' }), null)
  assert.equal(seed({ ...sync, scene: { drive: '../../somewhere' } }), null)
  assert.equal(seed({ ...sync, sequence: NaN }), null)
  assert.ok(seed(sync), 'invalid probes must not consume the initial seed')
})

test('later or stale syncs cannot reload the seeded frame; unknown query keys are ignored', () => {
  const seed = createReceiverFrameSeed(['nightride'], true)
  const first = seed({ ...sync, scene: { ...sync.scene, url: 'https://untrusted.test', autoplay: 'true', quality: 'ultra' } })!
  const params = new URL(first, 'https://buenaondalifestyle.com').searchParams
  assert.equal(params.get('diagnostics'), '1')
  assert.equal(params.get('quality'), 'low')
  assert.equal(params.has('url'), false)
  assert.equal(params.has('autoplay'), false)
  assert.equal(seed({ ...sync, sequence: 1, scene: { drive: 'city' } }), null)
  assert.equal(seed({ ...sync, sequence: 3, scene: { drive: 'highway' } }), null)
})
