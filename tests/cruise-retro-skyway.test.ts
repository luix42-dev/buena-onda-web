import assert from 'node:assert/strict'
import test from 'node:test'
import { roadSample, retrowaveIslandMix, retrowaveRoadSample, retrowaveSkywayMix } from '../components/real-miami/nightdrive/road'
import { createNightState } from '../components/real-miami/nightdrive/state'
import { stepNight } from '../components/real-miami/nightdrive/dynamics'

test('Retrowave climbs beyond the city and reconnects smoothly every chapter', () => {
  assert.equal(retrowaveSkywayMix(200), 0)
  assert.equal(retrowaveSkywayMix(1400), 1)
  assert.equal(retrowaveSkywayMix(3100), 0)
  let maxHeight = 0
  for (let s = 0; s <= 6400; s += 2) {
    const p = retrowaveRoadSample(s, 1984), base = roadSample(s, 1984)
    assert.ok(Object.values(p).every(Number.isFinite), `invalid road sample at ${s}`)
    assert.ok(Math.abs(p.dy) < .3, `too steep at ${s}: ${p.dy}`)
    assert.ok(Math.abs(p.curvature) < .025, `too sharp at ${s}: ${p.curvature}`)
    maxHeight = Math.max(maxHeight, p.y - base.y)
  }
  assert.ok(maxHeight > 60)
  for (const edge of [0, 3200, 6400]) {
    const p = retrowaveRoadSample(edge, 1984), base = roadSample(edge, 1984)
    assert.ok(Math.abs(p.x - base.x) < .01 && Math.abs(p.y - base.y) < .01)
    assert.ok(Math.abs(p.dx - base.dx) < .01 && Math.abs(p.dy - base.dy) < .01)
  }
})

test('existing autopilot can follow the new curved skyway', () => {
  const state = createNightState(1984)
  state.paused = false; state.distance = 960; state.traffic = []
  for (let i = 0; i < 60 * 30; i++) stepNight(state, 1 / 60, { sample: d => retrowaveRoadSample(d, state.seed) })
  assert.ok(state.distance > 1150, `road progress ${state.distance}`)
  assert.ok(state.speed > 0 && Number.isFinite(state.speed))
  assert.ok(state.minTrafficGap === Infinity)
})

test('island crossing descends gently and rises back into the skyway', () => {
  assert.equal(retrowaveIslandMix(1000), 0)
  assert.equal(retrowaveIslandMix(1950), 1)
  assert.equal(retrowaveIslandMix(2550), 0)
  const seed = 1984
  const high = retrowaveRoadSample(1100, seed).y
  const crossing = retrowaveRoadSample(1950, seed).y
  assert.ok(high - crossing > 45, `island crossing should descend below the skyway: ${high} to ${crossing}`)
  assert.ok(crossing > 5, `island road should stay clear of the water: ${crossing}`)
  for (let distance = 1200; distance <= 2500; distance += 5) {
    assert.ok(Math.abs(retrowaveRoadSample(distance, seed).dy) < .2, `uncomfortable island grade at ${distance}`)
  }
})
