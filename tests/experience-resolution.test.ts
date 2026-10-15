import test from 'node:test'
import assert from 'node:assert/strict'
import { nextSceneryDpr } from '../lib/experience/resolution'

test('scenery resolution degrades before playback, stays bounded, and recovers with headroom', () => {
  assert.equal(nextSceneryDpr(1, 24, 1), .82)
  assert.equal(nextSceneryDpr(1, 38, 1), .92)
  assert.equal(nextSceneryDpr(.6, 15, 1), .6)
  assert.equal(nextSceneryDpr(.8, 60, 1), .84)
  assert.equal(nextSceneryDpr(1, 60, 1), 1)
  assert.equal(nextSceneryDpr(.8, 48, 1), .8)
  assert.equal(nextSceneryDpr(.8, NaN, 1), .8)
  assert.equal(nextSceneryDpr(NaN, 0, NaN), 1)
})
