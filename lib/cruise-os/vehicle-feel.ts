/** Sprung-mass presentation model with GTA IV-style driving feel (Luis, 2026-10-22: "achieve the physics engine
 * in GTA4 or similar, specifically for driving"). Not a tire/collision simulator: the route follower still owns
 * where the car goes; this owns how the body behaves about that path.
 *
 * What makes GTA IV's cars feel the way they do, and how it is reproduced here:
 *  - Soft, long-travel suspension: ride frequency ~1.15 Hz (a real Countach is ~1.9 Hz), so the body moves a lot.
 *  - Heavy, quasi-static load transfer from real mass geometry: nose dive under braking, squat on throttle,
 *    several degrees of roll in corners (Countach 5000QV: 1490 kg, wheelbase 2.46 m, CG 0.46 m high).
 *  - Underdamped settling (damping ratio ~0.3): the body overshoots and rocks for about a second after every
 *    input, instead of snapping to the new attitude.
 *  - Rear tires that slip: in a corner the tail steps out (body yaws into the turn beyond the path tangent),
 *    building with lateral g and lagging the steering; the front wheels and cabin wheel counter-steer against it.
 * Road texture is an authored millimetre-scale profile, sampled by distance. Springs are stepped at 120 Hz
 * regardless of frame rate; tires are not attached to the sprung body's visual roll/pitch.
 * Units: metres, seconds, radians. Car space: nose toward -Z; positive X rotation raises the nose. */
export type VehicleFeel = {
  heave: number; pitch: number; roll: number
  /** Body yaw relative to the path tangent (tail-out). Positive = nose points left of the path, like route yaw. */
  yaw: number
  steering: number; frontSteer: number; frontRoad: number; rearRoad: number
  hv: number; pv: number; rv: number; yv: number
}
export const createVehicleFeel = (): VehicleFeel => ({ heave: 0, pitch: 0, roll: 0, yaw: 0, steering: 0, frontSteer: 0, frontRoad: 0, rearRoad: 0, hv: 0, pv: 0, rv: 0, yv: 0 })
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

/** Tuning, derived from the car and GTA IV's handling character (not copied values). */
export const FEEL = {
  /** Lateral grip limit the body responds to: beyond ~0.8 g a real tire has let go. */
  maxLateral: 8, maxLongitudinal: 8,
  /** Dive/squat: rad per m/s^2. 0.5 g braking = 2.5 deg of dive; a mid-engine car squats a little less. */
  dive: .0089, squat: .0065, pitchLimit: .075,
  /** Roll: rad per m/s^2 of lateral acceleration. 0.5 g = 3.8 deg, leaning out of the bend. */
  roll: .0135, rollLimit: .12,
  /** Tail-out: body yaw per m/s^2 lateral. 0.5 g = 3.4 deg, the nose pointing into the turn beyond the path. */
  slip: .012, slipLimit: .14,
  /** How much of the tail-out the driver counter-steers (front wheels and cabin wheel). */
  counterSteer: .5,
  /** Natural frequencies (rad/s) and damping ratios. Low ratios are the GTA rock-and-settle. */
  heave: { w: 7.5, z: .3 }, pitch: { w: 7.2, z: .32 }, rollSpring: { w: 6.5, z: .3 }, yawSpring: { w: 5, z: .45 },
  /** A parked or settled car is critically damped: nothing excites it, so it should not keep rocking. */
  restDamping: .9,
  /** Bump stops: the body may overshoot its steady attitude by this factor before the suspension bottoms out. */
  travel: 1.25,
} as const

export function roadMicroProfile(distance: number) {
  const joint = ((distance % 11) + 11) % 11
  return .0022 * Math.sin(distance * 1.7) + .0012 * Math.sin(distance * 4.1) + .004 * Math.exp(-Math.pow((joint - .24) / .14, 2))
}

export function stepVehicleFeel(m: VehicleFeel, input: { distance: number; speed: number; acceleration: number; curvature: number; wheel: number; paused: boolean; reduced: boolean; focused: boolean }, delta: number) {
  if (!Number.isFinite(delta) || delta <= 0) return m
  const active = !input.paused && !input.reduced && !input.focused
  const speed = input.paused ? 0 : Math.max(0, input.speed), strength = active ? Math.min(1, speed / 5) : 0
  m.frontRoad = roadMicroProfile(input.distance + 1.23) * strength
  m.rearRoad = roadMicroProfile(input.distance - 1.23) * strength
  // Accelerations the body feels. Lateral: positive curvature bends left, which throws the body right (negative).
  const lateral = clamp(-input.curvature * speed * speed, -FEEL.maxLateral, FEEL.maxLateral)
  const longitudinal = clamp(input.acceleration, -FEEL.maxLongitudinal, FEEL.maxLongitudinal)
  const heave = (m.frontRoad + m.rearRoad) / 2
  const pitch = active ? clamp((m.frontRoad - m.rearRoad) / 2.46 + longitudinal * (longitudinal < 0 ? FEEL.dive : FEEL.squat), -FEEL.pitchLimit, FEEL.pitchLimit) : 0
  const roll = active ? clamp(lateral * FEEL.roll, -FEEL.rollLimit, FEEL.rollLimit) : 0
  // Rear slip only once the tires are loaded: nothing steps out at parking speed.
  const grip = Math.min(1, speed / 9)
  const yaw = active ? clamp(-lateral * FEEL.slip * grip, -FEEL.slipLimit, FEEL.slipLimit) : 0
  let remaining = Math.min(delta, .1)
  while (remaining > 1e-7) {
    const dt = Math.min(remaining, 1 / 120); remaining -= dt
    for (const [value, velocity, target, spring, limit] of [['heave', 'hv', heave, FEEL.heave, .012], ['pitch', 'pv', pitch, FEEL.pitch, FEEL.pitchLimit], ['roll', 'rv', roll, FEEL.rollSpring, FEEL.rollLimit], ['yaw', 'yv', yaw, FEEL.yawSpring, FEEL.slipLimit]] as const) {
      const z = active ? spring.z : FEEL.restDamping
      m[velocity] += (spring.w * spring.w * (target - m[value]) - 2 * z * spring.w * m[velocity]) * dt
      m[value] += m[velocity] * dt
      // Bump stop: bottoming out kills most of the velocity instead of bouncing elastically.
      const stop = limit * FEEL.travel
      if (m[value] > stop) { m[value] = stop; m[velocity] = Math.min(0, m[velocity]) * .3 } else if (m[value] < -stop) { m[value] = -stop; m[velocity] = Math.max(0, m[velocity]) * .3 }
    }
    // Bicycle steering follows the actual route, minus the counter-steer that holds the tail; cabin wheel uses a 13:1 ratio.
    const roadWheel = clamp(Math.atan(input.curvature * 2.46) - m.yaw * FEEL.counterSteer, -.48, .48)
    m.frontSteer += (roadWheel - m.frontSteer) * (1 - Math.exp(-9 * dt))
    const wheel = clamp(roadWheel * 13, -2.6, 2.6)
    m.steering += (wheel - m.steering) * (1 - Math.exp(-8 * dt))
  }
  return m
}
