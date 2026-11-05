import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bufferedAhead, canCompositeForeground, temporalJoin, timelineSeconds, unrealToThree, verticalFov, type HybridSegment } from '../components/cruise/world-test/hybrid/contract'

const segment = (id: string, firstSourceFrame: number): HybridSegment => ({ id, url: `${id}.mp4`, durationSeconds: 30, fps: 30, content: 'environmentOnly', provenance: 'test metadata', firstSourceFrame,
  camera: { aspect: 16 / 9, horizontalFovDeg: 76, eyeHeightM: 1.62, speedMps: 12 } })
const a = segment('a', 0), b = segment('b', 900)

test('authored 30 second segments consume frame0..899 then900..1799 without duplicate frame', () => {
  assert.equal(temporalJoin(a, b), true)
  assert.equal(temporalJoin(a, { ...b, firstSourceFrame: 899 }), false)
  assert.equal(temporalJoin(a, { ...b, fps: 24 }), false)
  assert.equal(temporalJoin(b, a), false, 'descent must not silently loop')
})
test('timeline retains absolute source time across clip handoff and clamps decoder overshoot', () => {
  assert.equal(timelineSeconds([a, b], 0, 30.003), 30)
  assert.equal(timelineSeconds([a, b], 1, 0), 30)
  assert.equal(timelineSeconds([a, b], 1, 12.5), 42.5)
  assert.equal(timelineSeconds([a, b], 1, -1), 30)
})
test('plate clock does not claim buffered time across a gap', () => {
  const buffered = { length: 2, start: (i: number) => [0, 8][i], end: (i: number) => [4, 12][i] }
  assert.equal(bufferedAhead({ buffered, currentTime: 2 }), 2)
  assert.equal(bufferedAhead({ buffered, currentTime: 6 }), 0)
})
test('camera lens and Unreal mapping retain world units and handedness', () => {
  assert.deepEqual(unrealToThree([72000, 175, 402]), [1.75, 4.02, -720])
  assert.ok(Math.abs(verticalFov(76, 16 / 9) - 47.44840036542012) < 1e-9)
})
test('baked cockpit, founder reference and unknown calibration cannot receive foreground', () => {
  assert.equal(canCompositeForeground(a, true), true)
  assert.equal(canCompositeForeground(a, false), false)
  assert.equal(canCompositeForeground({ ...a, content: 'diagnosticReference' }, true), false)
  assert.equal(canCompositeForeground({ ...a, content: 'fullFrame' }, true), false)
  assert.equal(canCompositeForeground({ ...a, camera: undefined }, true), false)
})
