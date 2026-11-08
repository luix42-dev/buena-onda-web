import test from 'node:test'
import assert from 'node:assert/strict'
import { mirrorVideoSize, televisionViewport } from '../lib/cruise/mirror-video'

test('TV keeps a full wide scene around the central phone crop in either orientation', () => {
  for (const [w,h] of [[412,915],[915,412],[1920,1080]]) {
    const box=televisionViewport(w,h)
    assert.ok(Math.abs(box.width / box.height - 16 / 9) < .0001)
    assert.ok(box.width >= w && box.height >= h)
    assert.equal(box.left + box.width / 2, w / 2)
    assert.equal(box.top + box.height / 2, h / 2)
  }
})

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
