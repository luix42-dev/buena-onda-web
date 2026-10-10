import test from 'node:test'
import assert from 'node:assert/strict'
import { createNightState, type DrivingMood } from '../components/cruise/nightdrive/state'
import { stepNight } from '../components/cruise/nightdrive/dynamics'

for (const mood of ['cruise', 'night-drive', 'midnight-run'] as DrivingMood[]) {
 for (const [seed, dt] of [[1984, 1 / 30], [7, 1 / 60], [991, .08]]) {
  test(`nightdrive ${mood}, seed ${seed}, dt ${dt}: 30 minutes remains finite, separated, bounded and continuous`, () => {
    const state = createNightState(seed); state.paused = false; state.mood = mood
    let last = 0, maxSpeed = 0
    for (let i = 0; i < 1800 / dt; i++) {
      stepNight(state, dt)
      assert.ok(Number.isFinite(state.distance + state.speed + state.lateral))
      assert.ok(state.distance >= last && state.distance - last <= 25 * dt + .001)
      assert.ok(Math.abs(state.lateral) <= 2.001)
      assert.ok(state.acceleration >= -2.601 && state.acceleration <= 1.251)
      for (const car of state.traffic) if (Math.abs(car.lateral - state.lateral) < 1.9) assert.ok(Math.abs(car.distance - state.distance) > 8, `gap at ${state.elapsed}`)
      maxSpeed = Math.max(maxSpeed, state.speed); last = state.distance
    }
    assert.ok(state.distance > 10000)
    assert.ok(maxSpeed > (mood === 'cruise' ? 10 : mood === 'night-drive' ? 17 : 22))
    assert.ok(state.overtakes > 0)
  })
 }
}
test('no departure swerve and occupied adjacent lane blocks a pass', () => {
  const state = createNightState(); state.paused = false
  stepNight(state, .1); assert.equal(state.maneuver, 'follow'); assert.equal(state.lateral, 2)
  state.speed = 14; state.traffic[0].distance = 35; state.traffic[1].distance = 20
  for (let i = 0; i < 60; i++) stepNight(state, 1 / 60)
  assert.equal(state.maneuver, 'follow'); assert.equal(state.lateral, 2)
})
test('speed-matched follower recovers a pass when the adjacent lane clears', () => {
  const state = createNightState(); state.paused = false
  state.elapsed = 60; state.speed = 9; state.traffic[0].distance = 30
  state.traffic[1].distance = 10; state.traffic[1].speed = 9
  for (let i = 0; i < 120; i++) stepNight(state, 1 / 60)
  assert.equal(state.maneuver, 'follow'); assert.equal(state.lateral, 2)
  // Removing the blockage must restore a pass even though following has
  // already removed closing speed. A moving far-ahead car supplies the gap.
  state.traffic[1].distance = state.distance + 180; state.traffic[1].speed = 14
  assert.ok(state.speed < state.traffic[0].speed + .5)
  for (let i = 0; i < 60; i++) stepNight(state, 1 / 60)
  assert.equal(state.maneuver, 'passing')
  assert.ok(state.lateral < 2)
  for (let i = 0; i < 180 * 60; i++) stepNight(state, 1 / 60)
  assert.ok(state.overtakes >= 1)
  assert.ok(state.minTrafficGap > 8)
})
test('pause and reduced motion do not start an overtake; one minute has smooth acceleration', () => {
  const state = createNightState(); stepNight(state, 5); assert.equal(state.distance, 0)
  state.paused = false; state.reduced = true
  let acceleration = 0
  for (let i = 0; i < 3600; i++) {
    stepNight(state, 1 / 60)
    assert.ok(Math.abs(state.acceleration - acceleration) <= 1.8 / 60 + 1e-6)
    assert.equal(state.lateral, 2); acceleration = state.acceleration
  }
  assert.equal(state.overtakes, 0)
  assert.ok(state.minTrafficGap > 12)
})
