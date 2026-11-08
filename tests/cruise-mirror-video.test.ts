import test from 'node:test'
import assert from 'node:assert/strict'
import { mirrorVideoSize } from '../lib/cruise/mirror-video'

test('mirror resolution follows phone orientation without stretching or exceeding encoder bounds', () => {
  assert.deepEqual(mirrorVideoSize(1920, 1080, 1), { scale: 2 / 3, width: 1280, height: 720 })
  assert.deepEqual(mirrorVideoSize(1080, 1920, 1), { scale: 2 / 3, width: 720, height: 1280 })
  const pixel = mirrorVideoSize(412, 915, 3)
  assert.equal(pixel.height, 1280)
  assert.equal(pixel.width % 2, 0)
  assert.ok(Math.abs(pixel.width / pixel.height - 412 / 915) < .002)
  const landscape = mirrorVideoSize(915, 412, 3)
  assert.equal(landscape.width, 1280)
  assert.equal(landscape.height, pixel.width)
  assert.deepEqual(mirrorVideoSize(400, 400, 1), { scale: 1, width: 400, height: 400 })
})
