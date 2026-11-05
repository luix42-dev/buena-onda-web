import type { NightState } from './state'
import { roadSample, districtAt } from './road'

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
/** Touring speed ceilings (m/s) per pace. Was a flat 13.5 m/s (~49 km/h) for every pace. */
const TOURING_CAP: Record<NightState['mood'], number> = { cruise: 14, 'night-drive': 22, 'midnight-run': 30 }
const HIGHWAY_CAP: Record<NightState['mood'], number> = { cruise: 27, 'night-drive': 33, 'midnight-run': 39 }
const transitions = new WeakMap<NightState, { from: number; start: number }>()
/** Traffic drivers: Intelligent Driver Model (free-road acceleration, braking for whoever is ahead in the lane,
 * the player included) and the sideways acceleration they accept in bends. Adapted from Mr.doob's slop-newyork
 * js/traffic.js (CAR_DRIVER, freeAcc, brake, bendSpeed), MIT License, Copyright (c) 2026 Mr.doob
 * (lib/cruise/engine-audio.LICENSE.txt). Car length for bumper-to-bumper gaps: 4.6 m. */
const DRIVER = { a: 2, b: 3, T: 1.2, s0: 2, aLat: 3.5, bMax: 8 }, CAR_LENGTH = 4.6
function idmBrake(speed: number, gap: number, leaderSpeed: number) {
  const desired = DRIVER.s0 + Math.max(0, speed * DRIVER.T + speed * (speed - leaderSpeed) / (2 * Math.sqrt(DRIVER.a * DRIVER.b)))
  return -DRIVER.a * (desired / Math.max(gap, .1)) ** 2
}
function changeLane(s: NightState, target: number) {
  transitions.set(s, { from: s.lateral, start: s.elapsed })
  s.laneTarget = target
}

/** Kinematic touring, in meters/seconds. No audio or React lifecycle dependency. */
export function stepNight(s: NightState, elapsed: number, geography?: {
  sample: (distance: number) => {metric:number;curvature:number}
  district?: (distance:number) => {district:NightState['district'];mix:number}
  touring?: boolean
  /** Neon Run: arcade skyway speeds (~100 / 150 / 200+ km/h by pace) with grip and brakes to match. */
  fast?: boolean
  /** Look v2 Highway (I-95): touring rules at highway speeds, ~90 / 110 / 130 km/h by pace. */
  highway?: boolean
}) {
  const sample = geography ? (distance:number, _seed?:number) => geography.sample(distance) : roadSample
  if (s.paused || !Number.isFinite(elapsed) || elapsed <= 0) return
  // No hidden-tab catch-up. Substeps keep following decisions stable at low FPS.
  let remaining = Math.min(elapsed, .1)
  while (remaining > 1e-7) {
    const dt = Math.min(remaining, .025); remaining -= dt
    s.elapsed += dt
    const fast = !!geography?.fast
    for (const car of s.traffic) {
      car.cruise ??= Math.max(6, car.speed)
      if (!fast) {
        // IDM: want the free-road speed, capped by the bends ahead; brake for the nearest car (or us) in the lane.
        const metric = sample(car.distance, s.seed).metric
        let v0 = car.cruise
        for (const ahead of [8, 24, 48, 80]) v0 = Math.min(v0, Math.sqrt(DRIVER.aLat / Math.max(Math.abs(sample(car.distance + ahead, s.seed).curvature), 1e-3) + 2 * DRIVER.b * Math.max(0, ahead - 6)))
        let acceleration = DRIVER.a * (1 - (car.speed / Math.max(v0, .5)) ** 4)
        for (const other of s.traffic) if (other !== car && Math.abs(other.lateral - car.lateral) < 1.9 && other.distance > car.distance) acceleration = Math.min(acceleration, idmBrake(car.speed, (other.distance - car.distance) * metric - CAR_LENGTH, other.speed))
        if (Math.abs(s.lateral - car.lateral) < 1.9 && s.distance > car.distance) acceleration = Math.min(acceleration, idmBrake(car.speed, (s.distance - car.distance) * metric - CAR_LENGTH, s.speed))
        car.speed = Math.max(0, car.speed + clamp(acceleration, -DRIVER.bMax, DRIVER.a) * dt)
      }
      // On the skyway traffic flows at ~70% of our pace, so overtakes stay brisk but never absurd.
      if (fast) car.speed = Math.max(car.speed, s.speed * .7)
      // Touring never overtakes, so the same-lane car paces ~90-160 m ahead
      // instead of trapping the drive behind a 32 km/h leader.
      if (geography?.touring && car.lateral > 0) {
        const gap = car.distance - s.distance
        car.speed = gap < 90 ? s.speed + 2.5 : gap > 160 ? Math.max(6, s.speed * .85) : Math.max(6, s.speed)
      }
      car.distance += car.speed * dt / sample(car.distance, s.seed).metric
      if (s.distance - car.distance > 380) car.distance = s.distance + 550 + car.id * 110
    }
    const frame = sample(s.distance, s.seed)
    const phase = .5 + .5 * Math.sin(s.elapsed / 23)
    const desired = geography?.highway
      ? s.mood === 'cruise' ? 24 + 2 * phase : s.mood === 'night-drive' ? 29 + 3 * phase : 35 + 3 * phase
      : fast
      ? s.mood === 'cruise' ? 26 + 4 * phase : s.mood === 'night-drive' ? 38 + 7 * phase : 52 + 10 * phase
      : geography?.touring
      // Real-street touring: Easy ~45-50, Cruise ~60-80, Midnight ~85-110 km/h on straights.
      ? s.mood === 'cruise' ? 12.5 + 1.5 * phase : s.mood === 'night-drive' ? 17 + 5 * phase : 24 + 6 * phase
      : s.mood === 'cruise' ? 8 + 4 * phase : s.mood === 'night-drive' ? 12 + 8 * phase : 18 + 7 * Math.pow(phase, 4)
    const leftSafe = s.traffic.every(car => car.lateral > 0 || Math.abs(car.distance - s.distance) > 45 + Math.max(0, car.speed - s.speed) * 5)
    // At skyway speeds the two-second gap is ~80 m, so a slower car must be noticed from farther back.
    const leader = s.traffic.find(car => car.lateral > 0 && car.distance > s.distance && car.distance - s.distance < (fast ? 55 + s.speed * 2.4 : 55))
    // An established follower can be speed-matched after braking while the
    // adjacent lane was occupied. Do not require renewed closing speed to pass.
    const establishedFollower = leader && s.elapsed > 8 && s.speed >= Math.max(3, leader.speed - .5)
    if (s.maneuver === 'follow' && leader && establishedFollower && desired > leader.speed + 1 && leftSafe && !s.reduced && !geography?.touring) {
      s.maneuver = 'passing'; changeLane(s, -2)
    }
    if (s.maneuver === 'passing' && s.lateral < -1.99 && s.traffic.every(car => car.lateral < 0 || car.distance < s.distance - 30 || car.distance > s.distance + 95)) {
      s.maneuver = 'returning'; changeLane(s, 2)
    }
    const transition = transitions.get(s)
    if (transition) {
      const t = clamp((s.elapsed - transition.start) / (fast ? 2.2 : 5), 0, 1)
      const smooth = t * t * t * (10 + t * (-15 + 6 * t))
      s.lateral = transition.from + (s.laneTarget - transition.from) * smooth
      if (t === 1) {
        transitions.delete(s)
        if (s.maneuver === 'returning') { s.maneuver = 'follow'; s.overtakes++ }
      }
    }
    const grip = fast ? 7 : geography?.touring ? 2.2 : 1.3 // lateral comfort, m/s^2; touring drives with intent
    let target = Math.min(desired, Math.sqrt(grip / Math.max(.00001, Math.abs(frame.curvature))))
    if (!geography || (!geography.touring && !geography.fast)) {
      // Procedural avenues and Retrowave's new skyway preview bends before the apex.
      const horizon = Math.min(160, Math.max(30, s.speed * s.speed / 5.6 + 20))
      for (let ahead = 4; ahead <= horizon; ahead += 4) {
        const bend = Math.abs(sample(s.distance + ahead, s.seed).curvature)
        target = Math.min(target, Math.sqrt(grip / Math.max(.00001, bend) + 2 * 2.8 * Math.max(0, ahead - 5)))
      }
    }
    if (geography?.touring) {
      // Preview real intersections before braking; reacting only at the vertex
      // would carry highway speed through a short mapped right-angle turn.
      target = Math.min(target, geography.highway ? HIGHWAY_CAP[s.mood] : TOURING_CAP[s.mood])
      // Look far enough ahead to brake from cruising speed (v^2 / 2a + margin).
      const horizon = Math.min(220, Math.max(35, s.speed * s.speed / 5.6 + 25))
      for (let ahead=2; ahead<=horizon; ahead+=ahead<60?2:4) {
        const bend = Math.abs(sample(s.distance+ahead,s.seed).curvature)
        const cornerSpeedSquared = grip / Math.max(.00001,bend)
        target = Math.min(target,Math.sqrt(cornerSpeedSquared+2*2.8*Math.max(0,ahead-5)))
      }
    }
    for (const car of s.traffic) {
      const gap = (car.distance - s.distance) * frame.metric
      const sharesLane = Math.abs(car.lateral - s.lateral) < 1.9 || Math.abs(car.lateral - s.laneTarget) < .1
      if (sharesLane && gap > 0) {
        if (!geography) {
          // Planned stop: arrive at the leader's speed 10 m + 1.2 s behind it at a comfortable 2.8 m/s^2,
          // so braking starts early and eases off, instead of a late proportional squeeze.
          const room = gap - 10 - car.speed * 1.2
          target = Math.min(target, room >= 0 ? Math.sqrt(car.speed * car.speed + 2 * 2.8 * room) : Math.max(0, car.speed + room * .4))
        } else {
          // Start braking early; retain 12 m center separation plus two seconds.
          target = Math.min(target, Math.max(0, car.speed + (gap - 12 - s.speed * 2) * .28))
        }
      }
      if (Math.abs(car.lateral - s.lateral) < 1.9) s.minTrafficGap = Math.min(s.minTrafficGap, Math.abs(gap))
    }
    s.targetSpeed = target
    const error = target - s.speed
    // Procedural avenues: small trims lift off the throttle (engine braking, no lamps); real braking ramps
    // in at ~3.5 m/s^3 up to 4.5 m/s^2 and is released more gently, like a driver easing off the pedal.
    const requested = !geography
      ? error >= 0 ? Math.min(error * .9, s.reduced ? .65 : 1.25) : error > -1.2 ? Math.max(error * .6, -.55) : clamp(error * 1.4, -4.5, 0)
      : clamp(error * (fast ? 1.1 : geography?.touring ? 1.2 : .9), fast ? -7 : geography?.touring ? -3.4 : -2.6, s.reduced ? .65 : fast ? 4.8 : geography?.touring ? 2.4 : 1.25)
    const jerk = fast ? 7 : geography?.touring ? 2.6 : requested < s.acceleration ? 3.5 : 2.2
    s.acceleration += clamp(requested - s.acceleration, -jerk * dt, jerk * dt)
    // Brake lamps: on past engine braking, bulbs settle in ~0.1 s.
    s.brake = (s.brake ?? 0) + ((s.acceleration < -.75 ? 1 : 0) - (s.brake ?? 0)) * Math.min(1, dt * 14)
    s.speed = Math.max(0, s.speed + s.acceleration * dt)
    const travel = s.speed * dt
    s.odometer += travel; s.distance += travel / frame.metric
    s.wheel = clamp((s.laneTarget - s.lateral) * .12 - frame.curvature * 25, -.5, .5)
    const district = geography?.district?.(s.distance) ?? districtAt(s.distance, s.seed)
    s.district = district.district; s.districtMix = district.mix
  }
}
