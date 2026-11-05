import test from 'node:test'
import assert from 'node:assert/strict'
import { freshPresence } from '../lib/experience/presence'

test('presence expires without requiring a leave notification and rejects missing or future leases', () => {
  const now = 100_000
  const state = { live: [{ visitor: 'a', at: now - 1000 }], expired: [{ at: now - 45000 }], future: [{ at: now + 1001 }], missing: [{ visitor: 'b' }], malformed: [null, { at: NaN }] }
  assert.deepEqual(Object.keys(freshPresence(state, now)), ['live'])
  assert.deepEqual(freshPresence(state, now + 47000), {})
  assert.equal(state.live.length, 1)
})
