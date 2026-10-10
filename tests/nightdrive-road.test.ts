import test from 'node:test'
import assert from 'node:assert/strict'
import { CHUNK_LENGTH, districtAt, roadRandom, roadSample } from '../components/cruise/nightdrive/road'

test('nightdrive road is seed deterministic and independent of traversal order', () => {
  for (const s of [-1000, 0, 95.99, 96, 1700, 100_000]) {
    const expected = roadSample(s, 1984)
    roadSample(s + 10000, 8)
    assert.deepEqual(roadSample(s, 1984), expected)
    assert.notEqual(expected.x, roadSample(s, 1985).x)
  }
  assert.equal(roadRandom(91, 2), roadRandom(91, 2))
})

test('road derivatives preserve speed and gentle continuous curvature at chunk seams', () => {
  const h = .001
  for (let i = -10; i <= 150; i++) {
    const s = i * CHUNK_LENGTH
    const sample = roadSample(s, 1984)
    const before = roadSample(s - h, 1984)
    const after = roadSample(s + h, 1984)
    assert.ok(Math.abs((after.x - before.x) / (2 * h) - sample.dx) < 1e-7)
    assert.ok(Math.abs((after.y - before.y) / (2 * h) - sample.dy) < 1e-7)
    assert.ok(Math.abs(sample.dx) < .14)
    assert.ok(Math.abs(sample.dy) < .006)
    assert.ok(Math.abs(sample.curvature) < .0006)
    assert.ok(sample.metric >= 1 && sample.metric < 1.01)
    assert.ok(Math.abs(after.y - before.y) < .00002)
    assert.deepEqual(roadSample((i - 1) * CHUNK_LENGTH + CHUNK_LENGTH, 1984), sample)
  }
})

test('district transitions are bounded, continuous and reach both authored palettes', () => {
  let coast = false, neon = false
  for (let s = -2000; s < 10_000; s += 2) {
    const a = districtAt(s, 1984)
    const b = districtAt(s + 2, 1984)
    assert.ok(a.mix >= 0 && a.mix <= 1)
    assert.ok(Math.abs(a.mix - b.mix) < .016)
    coast ||= a.mix === 0
    neon ||= a.mix === 1
  }
  assert.ok(coast && neon)
  for (let pair = -4; pair < 8; pair++) {
    assert.ok(Math.abs(districtAt(pair * 1700 - .001, 1984).mix - districtAt(pair * 1700 + .001, 1984).mix) < 1e-8)
  }
})
