import type { NightState } from './state'
import { roadSample, districtAt } from './road'

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
const transitions = new WeakMap<NightState, { from: number; start: number }>()
function changeLane(s: NightState, target: number) {
  transitions.set(s, { from: s.lateral, start: s.elapsed })
  s.laneTarget = target
}

/** Kinematic touring, in meters/seconds. No audio or React lifecycle dependency. */
export function stepNight(s: NightState, elapsed: number, geography?: {
  sample: (distance: number) => {metric:number;curvature:number}
  district?: (distance:number) => {district:NightState['district'];mix:number}
  touring?: boolean
}) {
  const sample = geography ? (distance:number, _seed?:number) => geography.sample(distance) : roadSample
  if (s.paused || !Number.isFinite(elapsed) || elapsed <= 0) return
  // No hidden-tab catch-up. Substeps keep following decisions stable at low FPS.
  let remaining = Math.min(elapsed, .1)
  while (remaining > 1e-7) {
    const dt = Math.min(remaining, .025); remaining -= dt
    s.elapsed += dt
    for (const car of s.traffic) {
      car.distance += car.speed * dt / sample(car.distance, s.seed).metric
      if (s.distance - car.distance > 380) car.distance = s.distance + 550 + car.id * 110
    }
    const frame = sample(s.distance, s.seed)
    const phase = .5 + .5 * Math.sin(s.elapsed / 23)
    const desired = s.mood === 'cruise' ? 8 + 4 * phase : s.mood === 'night-drive' ? 12 + 8 * phase : 18 + 7 * Math.pow(phase, 4)
    const leftSafe = s.traffic.every(car => car.lateral > 0 || Math.abs(car.distance - s.distance) > 45 + Math.max(0, car.speed - s.speed) * 5)
    const leader = s.traffic.find(car => car.lateral > 0 && car.distance > s.distance && car.distance - s.distance < 55)
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
      const t = clamp((s.elapsed - transition.start) / 5, 0, 1)
      const smooth = t * t * t * (10 + t * (-15 + 6 * t))
      s.lateral = transition.from + (s.laneTarget - transition.from) * smooth
      if (t === 1) {
        transitions.delete(s)
        if (s.maneuver === 'returning') { s.maneuver = 'follow'; s.overtakes++ }
      }
    }
    let target = Math.min(desired, Math.sqrt(1.3 / Math.max(.00001, Math.abs(frame.curvature))))
    if (geography?.touring) {
      // Preview real intersections before braking; reacting only at the vertex
      // would carry highway speed through a short mapped right-angle turn.
      target = Math.min(target, 13.5)
      for (let ahead=2; ahead<=Math.max(35,s.speed*4); ahead+=2) {
        const bend = Math.abs(sample(s.distance+ahead,s.seed).curvature)
        const cornerSpeedSquared = 1.3 / Math.max(.00001,bend)
        target = Math.min(target,Math.sqrt(cornerSpeedSquared+2*1.8*Math.max(0,ahead-5)))
      }
    }
    for (const car of s.traffic) {
      const gap = (car.distance - s.distance) * frame.metric
      const sharesLane = Math.abs(car.lateral - s.lateral) < 1.9 || Math.abs(car.lateral - s.laneTarget) < .1
      if (sharesLane && gap > 0) {
        // Start braking early; retain 12 m center separation plus two seconds.
        target = Math.min(target, Math.max(0, car.speed + (gap - 12 - s.speed * 2) * .28))
      }
      if (Math.abs(car.lateral - s.lateral) < 1.9) s.minTrafficGap = Math.min(s.minTrafficGap, Math.abs(gap))
    }
    s.targetSpeed = target
    const requested = clamp((target - s.speed) * .9, -2.6, s.reduced ? .65 : 1.25)
    s.acceleration += clamp(requested - s.acceleration, -1.8 * dt, 1.8 * dt)
    s.speed = Math.max(0, s.speed + s.acceleration * dt)
    const travel = s.speed * dt
    s.odometer += travel; s.distance += travel / frame.metric
    s.wheel = clamp((s.laneTarget - s.lateral) * .12 - frame.curvature * 25, -.5, .5)
    const district = geography?.district?.(s.distance) ?? districtAt(s.distance, s.seed)
    s.district = district.district; s.districtMix = district.mix
  }
}
