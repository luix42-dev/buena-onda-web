import test from 'node:test'
import assert from 'node:assert/strict'
import { createNightState } from '../components/real-miami/nightdrive/state'
import { stepNight } from '../components/real-miami/nightdrive/dynamics'

// Procedural avenue (Look v2 Retrowave): stepNight without geography.
test('retrowave closes on a slow leader with planned, ramped braking and lit brake lamps', () => {
  const s = createNightState(7); s.paused = false; s.mood = 'midnight-run'; s.speed = 22
  s.traffic = [{ id: 0, distance: 120, lateral: 2, speed: 6 }, { id: 1, distance: 2000, lateral: -2, speed: 6 }]
  let minDecel = 0, maxJerk = 0, lit = 0, last = s.acceleration
  const dt = 1 / 60
  for (let i = 0; i < 20 / dt; i++) {
    stepNight(s, dt)
    s.traffic[1].distance = s.distance; s.traffic[1].speed = s.speed // a car alongside closes the passing lane
    minDecel = Math.min(minDecel, s.acceleration)
    maxJerk = Math.max(maxJerk, Math.abs(s.acceleration - last) / dt); last = s.acceleration
    if ((s.brake ?? 0) > .9) lit++
    const gap = s.traffic[0].distance - s.distance
    assert.ok(gap > 10, `too close: ${gap.toFixed(1)} m at ${s.elapsed.toFixed(1)} s`)
  }
  assert.ok(minDecel < -1.5 && minDecel >= -4.501, `peak deceleration ${minDecel}`)
  assert.ok(maxJerk <= 3.6, `jerk ${maxJerk}`)
  assert.ok(lit > 30, 'brake lamps never lit')
  assert.ok(Math.abs(s.speed - 6) < 1.5, `settles behind the leader, speed ${s.speed}`)
})

test('retrowave small speed trims are engine braking, lamps stay off', () => {
  const s = createNightState(7); s.paused = false; s.mood = 'cruise'; s.traffic = []
  const dt = 1 / 60
  for (let i = 0; i < 30 / dt; i++) stepNight(s, dt)
  s.speed = s.targetSpeed + .8
  let lit = 0
  for (let i = 0; i < 3 / dt; i++) { stepNight(s, dt); if ((s.brake ?? 0) > .5) lit++ }
  assert.equal(lit, 0)
})
