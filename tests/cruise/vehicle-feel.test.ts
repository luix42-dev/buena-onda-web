import test from 'node:test'
import assert from 'node:assert/strict'
import {createVehicleFeel, roadMicroProfile, stepVehicleFeel} from '../../lib/cruise-os/vehicle-feel'

type Input = Parameters<typeof stepVehicleFeel>[1]
const input = (overrides: Partial<Input> = {}): Input => ({
  distance: 0, speed: 12, acceleration: 0, curvature: 0, wheel: 0,
  paused: false, reduced: false, focused: false, ...overrides,
})
function run(seconds: number, hz: number, sample: (time: number) => Input) {
  const state = createVehicleFeel()
  for (let frame = 0; frame < seconds * hz; frame++) stepVehicleFeel(state, sample((frame + 1) / hz), 1 / hz)
  return state
}
const near = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}, tolerance ${tolerance}`)

test('positive route yaw bends forward -Z toward left -X; both steering outputs follow that turn', () => {
  // Cruise yaw is atan2(-dx,-dz). A quarter-circle toward -X therefore has
  // increasing positive yaw, independently of the presentation implementation.
  const radius = 50, arc = .1
  const x = radius * (Math.cos(arc) - 1), z = -radius * Math.sin(arc)
  const yaw = Math.atan2(-x, -z)
  assert.ok(yaw > 0)
  const left = run(2, 60, () => input({curvature: 1 / radius}))
  const right = run(2, 60, () => input({curvature: -1 / radius}))
  assert.ok(left.frontSteer > 0 && left.steering > 0)
  assert.ok(right.frontSteer < 0 && right.steering < 0)
  near(left.frontSteer, -right.frontSteer, 1e-8, 'symmetric tire steering')
  near(left.steering, -right.steering, 1e-8, 'symmetric cabin wheel')
  assert.ok(Math.abs(left.steering) > Math.abs(left.frontSteer), 'cabin wheel turns farther than road wheels')
})

test('steady acceleration raises the nose, braking lowers it; turning leans outward', () => {
  const accelerating = run(3, 60, () => input({speed: 0, acceleration: 2}))
  const braking = run(3, 60, () => input({speed: 0, acceleration: -2}))
  // With a -Z forward model, positive X rotation raises its nose.
  assert.ok(accelerating.pitch > .003)
  assert.ok(braking.pitch < -.003)
  // Like a real car (and GTA IV), it dives harder under braking than it squats on throttle.
  assert.ok(-braking.pitch > accelerating.pitch * 1.2, `dive ${-braking.pitch} exceeds squat ${accelerating.pitch}`)
  const left = run(3, 60, () => input({curvature: .02}))
  const right = run(3, 60, () => input({curvature: -.02}))
  assert.ok(left.roll < 0 && right.roll > 0, 'body leans toward the outside of each bend')
})

test('30, 60 and 120 Hz follow the same moving road without large presentation drift', () => {
  const sample = (t: number) => input({distance: 12 * t, curvature: .012 * Math.sin(t * .7), acceleration: Math.sin(t)})
  const reference = run(8, 120, sample)
  for (const hz of [30, 60]) {
    const actual = run(8, hz, sample)
    near(actual.heave, reference.heave, .002, `${hz} Hz heave in metres`)
    near(actual.pitch, reference.pitch, .002, `${hz} Hz pitch in radians`)
    near(actual.roll, reference.roll, .001, `${hz} Hz roll in radians`)
    near(actual.frontSteer, reference.frontSteer, .001, `${hz} Hz tire steering`)
    near(actual.steering, reference.steering, .012, `${hz} Hz cabin steering`)
  }
})

test('road profile stays millimetre-scale, including negative distance and route joints', () => {
  for (let i = -20000; i <= 20000; i++) {
    const value = roadMicroProfile(i / 100)
    assert.ok(Number.isFinite(value) && Math.abs(value) < .0075, `road displacement at ${i / 100}: ${value}`)
  }
})

test('long rough-road traversal and intermittent large frame gaps stay finite and bounded', () => {
  const state = createVehicleFeel()
  for (let i = 0; i < 7200; i++) {
    const dt = i % 113 === 0 ? .5 : 1 / 60
    stepVehicleFeel(state, input({distance: i * .65, speed: 39, acceleration: i % 180 < 90 ? 8 : -8, curvature: .07 * Math.sin(i / 100)}), dt)
    assert.ok(Object.values(state).every(Number.isFinite))
    // GTA-scale body motion: dive/squat to 4.3 deg, roll to 6.9 deg, tail-out to 8 deg at the 0.8 g limits.
    assert.ok(Math.abs(state.heave) <= .0151, 'heave under 15 mm (bump stop)')
    assert.ok(Math.abs(state.pitch) <= .0939, 'pitch under 5.4 degrees (bump stop)')
    assert.ok(Math.abs(state.roll) <= .1501, 'roll under 8.6 degrees (bump stop)')
    assert.ok(Math.abs(state.yaw) <= .1751, 'tail-out under 10 degrees (bump stop)')
    assert.ok(Math.abs(state.frontSteer) <= .481 && Math.abs(state.steering) <= 2.601)
  }
})

test('parking damps existing motion instead of freezing a displaced body', () => {
  const state = run(2, 60, t => input({distance: t * 12, curvature: .02, acceleration: 3}))
  assert.ok(Math.abs(state.pitch) + Math.abs(state.roll) > .005)
  for (let i = 0; i < 240; i++) stepVehicleFeel(state, input({paused: true, distance: 24}), 1 / 60)
  for (const key of ['heave', 'pitch', 'roll', 'yaw', 'hv', 'pv', 'rv', 'yv'] as const) near(state[key], 0, .00001, `parked ${key}`)
  near(state.frontRoad, 0, 1e-12, 'parked front road motion')
  near(state.rearRoad, 0, 1e-12, 'parked rear road motion')
})

for (const suppression of ['reduced', 'focused'] as const) {
  test(`${suppression} settles body motion while preserving route steering`, () => {
    const state = run(2, 60, t => input({distance: t * 12, acceleration: 3, curvature: -.02}))
    for (let i = 0; i < 240; i++) stepVehicleFeel(state, input({[suppression]: true, curvature: .02, distance: 24 + i / 5}), 1 / 60)
    for (const key of ['heave', 'pitch', 'roll', 'yaw'] as const) near(state[key], 0, .00001, `${suppression} ${key}`)
    assert.ok(state.frontSteer > .02 && state.steering > .2, 'steering follows the new left bend')
    near(state.frontRoad, 0, 1e-12, `${suppression} front road motion`)
    near(state.rearRoad, 0, 1e-12, `${suppression} rear road motion`)
  })
}

test('GTA IV character: braking dives ~2.5 deg at 0.5 g, overshoots, then rocks to rest within ~1.5 s', () => {
  const state = createVehicleFeel()
  let peak = 0
  for (let i = 0; i < 180; i++) { stepVehicleFeel(state, input({speed: 20, acceleration: -4.9}), 1 / 60); peak = Math.min(peak, state.pitch) }
  const steady = state.pitch
  near(steady, -.0436, .004, 'steady dive at 0.5 g')
  assert.ok(peak < steady * 1.15, `underdamped: peak ${peak} overshoots steady ${steady}`)
  for (let i = 0; i < 90; i++) stepVehicleFeel(state, input({speed: 20, acceleration: 0}), 1 / 60)
  assert.ok(Math.abs(state.pitch) < .006, `settled 1.5 s after release: ${state.pitch}`)
})

test('GTA IV character: the tail steps out in a fast bend and the front wheels counter-steer', () => {
  // 0.5 g left bend at 20 m/s.
  const bend = run(3, 60, () => input({speed: 20, curvature: 4.9 / 400}))
  near(bend.yaw, .0588, .006, 'tail-out of ~3.4 deg into a left bend')
  assert.ok(bend.roll < -.05, 'body rolls hard to the outside')
  const geometric = Math.atan(4.9 / 400 * 2.46)
  assert.ok(bend.frontSteer > 0 && bend.frontSteer < geometric, 'front wheels hold less lock than the path needs (counter-steer)')
  const slow = run(3, 60, () => input({speed: 3, curvature: 4.9 / 400}))
  assert.ok(Math.abs(slow.yaw) < .002, 'no tail-out at parking speed')
})
