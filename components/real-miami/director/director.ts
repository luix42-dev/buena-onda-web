import * as T from 'three'
import type { createMiamiRoute, MiamiGeoData } from '@/lib/real-miami/miami-geo'
import { BuildingIndex } from './occlusion'

/**
 * Director Camera for the real-Miami cruise.
 *
 * Lineage: the shot scheduler idea (weighted choice, no back-to-back repeats,
 * min/max hold, compatibility horizon) comes from the legacy runtime director in
 * components/cruise/cameras/director.ts (commit adc7a76), which only knew a
 * synthetic straight module road. This port works on the geographic route,
 * adds world-fixed shots, music-locked cuts, and geometry safety.
 *
 * Everything here is computed in WORLD coordinates (X east, Z south, Y up) and
 * converted to render coordinates (world minus route origin) on output, matching
 * MiamiWorld's treadmill: the car sits near the render origin.
 */
export type DirectorShotId = 'aerial' | 'sideTrack' | 'frontLow' | 'roofMount' | 'windshield' | 'landmarkPass' | 'rearChase' | 'reflection' | 'oceanSide'
export type DirectorTier = 'low' | 'medium' | 'high'
type Route = ReturnType<typeof createMiamiRoute>
type Vec = T.Vector3
type LandmarkInput = { name: string; kind: string; bodyHeight?: number; streetFacing: { edge: number[][]; normal: number[]; width: number } }
type Approach = { meters: number; landmark: LandmarkInput; facade: Vec; normal: Vec; road: Vec }

export const SHOT_LABEL: Record<DirectorShotId, string> = {
  aerial: 'Aerial', sideTrack: 'Long lens', frontLow: 'Low front', roofMount: 'Roof mount', windshield: 'Windshield',
  landmarkPass: 'Landmark', rearChase: 'Rear chase', reflection: 'Reflection', oceanSide: 'Ocean side',
}
const CATEGORY: Record<DirectorShotId, 'establish' | 'long' | 'mid' | 'close' | 'locked'> = {
  aerial: 'establish', sideTrack: 'long', oceanSide: 'long', frontLow: 'mid', rearChase: 'mid', windshield: 'mid',
  roofMount: 'close', reflection: 'close', landmarkPass: 'locked',
}
const WEIGHT: Record<DirectorShotId, number> = {
  aerial: .5, sideTrack: 2.3, oceanSide: 1.7, frontLow: 1.6, rearChase: 1.5, windshield: 1.0, roofMount: 1.0, reflection: .9, landmarkPass: 0,
}
/** Hold in bars (4 beats). Converted with the measured tempo, so slow songs hold longer. */
const BARS: Record<DirectorShotId, [number, number]> = {
  aerial: [3, 4], sideTrack: [2, 3], oceanSide: [2, 3], frontLow: [2, 3], rearChase: [2, 3], windshield: [2, 2], roofMount: [2, 3], reflection: [2, 2], landmarkPass: [3, 5],
}
const MIN_SHOT = 4, MAX_SHOT = 12, WORLD_FIXED: DirectorShotId[] = ['landmarkPass', 'oceanSide']

type Plan = {
  id: DirectorShotId; start: number; target: number; side: 1 | -1; seed: number
  distance?: number; height?: number; fixed?: Vec; look?: Vec; hfov: number
  approach?: Approach; seenCar: boolean; exitAt: number; handheld: number
}
export type DirectorInputs = {
  dt: number; distance: number; speed: number; lateral: number; aspect: number; reduced: boolean
  carMin: Vec; carMax: Vec; traffic: { distance: number }[]; kick: number; phrase: number; beatLive: boolean; night: number
}
export type DirectorFrame = { position: Vec; target: Vec; fov: number; shot: DirectorShotId; cut: boolean }
export type DirectorHistory = { shot: DirectorShotId; seconds: number; reason: string }

function mulberry(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const UP = new T.Vector3(0, 1, 0)

/** Beat tracker over the shared pulse.kick envelope (live FFT, or the honest 112 BPM groove fallback). */
class BeatClock {
  interval = .55; last = -10; count = 0; private previous = 0; private intervals: number[] = []
  /** Returns 'bar' on a downbeat estimate, 'beat' on other beats, '' otherwise. */
  update(now: number, kick: number): '' | 'beat' | 'bar' {
    const rising = kick > .42 && this.previous <= .42 && now - this.last > .26
    this.previous = kick
    if (!rising) return ''
    const gap = now - this.last
    if (gap > .3 && gap < 1.3) {
      this.intervals.push(gap); if (this.intervals.length > 9) this.intervals.shift()
      const sorted = [...this.intervals].sort((a, b) => a - b); this.interval = sorted[sorted.length >> 1]
    }
    this.last = now; this.count++
    return this.count % 4 === 0 ? 'bar' : 'beat'
  }
  alive(now: number) { return now - this.last < Math.max(2.4, this.interval * 4) }
  get bar() { return this.interval * 4 }
}

export class CruiseDirector {
  readonly history: DirectorHistory[] = []
  private index: BuildingIndex
  private approaches: Approach[] = []
  private ads: [number, number][]
  private random: () => number
  private beats = new BeatClock()
  private now = 0
  private plan: Plan | null = null
  private sinceAerial = 0
  private heading = 0
  private headingReady = false
  private blocked = 0
  private lost = 0
  private losTimer = 0
  private losClear = true
  private shotLandmarks = new Set<number>()
  private forced: DirectorShotId | null = null
  private allowed: DirectorShotId[] = []
  private out = { position: new T.Vector3(), target: new T.Vector3(), fov: 50, shot: 'aerial' as DirectorShotId, cut: true }
  private v = { car: new T.Vector3(), anchor: new T.Vector3(), f: new T.Vector3(), r: new T.Vector3(), fs: new T.Vector3(), rs: new T.Vector3(), a: new T.Vector3(), b: new T.Vector3(), c: new T.Vector3(), d: new T.Vector3() }
  private tier: DirectorTier = 'high'

  constructor(private route: Route, data: Pick<MiamiGeoData, 'buildings'>, landmarks: LandmarkInput[], ads: [number, number][] = [], seed = Date.now()) {
    this.index = new BuildingIndex(data)
    this.ads = ads
    this.random = mulberry(seed)
    this.approaches = this.findApproaches(landmarks)
    this.setTier('high')
  }

  setTier(tier: DirectorTier) {
    this.tier = tier
    const all: DirectorShotId[] = ['aerial', 'sideTrack', 'frontLow', 'roofMount', 'windshield', 'landmarkPass', 'rearChase', 'reflection', 'oceanSide']
    // Low tier drops the shots that show the most city at once and the road-level reflection.
    this.allowed = tier === 'low' ? all.filter(s => s !== 'reflection' && s !== 'oceanSide') : all
  }
  force(shot: DirectorShotId | null) { this.forced = shot; if (shot) this.plan = null }
  reset() { this.plan = null; this.sinceAerial = 0; this.headingReady = false; this.shotLandmarks.clear() }
  snapshot() {
    const p = this.plan
    return { shot: p?.id ?? null, label: p ? SHOT_LABEL[p.id] : null, elapsed: p ? this.now - p.start : 0, planned: p?.target ?? 0, beatInterval: this.beats.interval, beatAlive: this.beats.alive(this.now), tier: this.tier, landmark: p?.approach?.landmark.name ?? null, history: this.history.slice(-24) }
  }

  private findApproaches(landmarks: LandmarkInput[]) {
    const out: Approach[] = []
    for (const landmark of landmarks) {
      const [a, b] = landmark.streetFacing.edge, facade = new T.Vector3((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2)
      const normal = new T.Vector3(landmark.streetFacing.normal[0], 0, landmark.streetFacing.normal[1]).normalize()
      let previous = Infinity, falling = false
      for (let m = 0; m < this.route.length; m += 3) {
        const p = this.route.sample(m), d = Math.hypot(p.x - facade.x, p.z - facade.z)
        if (d > previous && falling && previous < 45) {
          const at = this.route.sample(m - 3)
          out.push({ meters: m - 3, landmark, facade, normal, road: new T.Vector3(at.x, 0, at.z) })
        }
        falling = d < previous; previous = d
      }
    }
    return out.sort((x, y) => x.meters - y.meters)
  }
  private ahead(meters: number, distance: number) { const L = this.route.length; return (((meters - distance) % L) + L) % L }

  private basis(yaw: number, f: Vec, r: Vec) { f.set(-Math.sin(yaw), 0, -Math.cos(yaw)); r.set(Math.cos(yaw), 0, -Math.sin(yaw)) }
  private adNear(x: number, z: number, radius: number) { return this.ads.some(([ax, az]) => Math.hypot(ax - x, az - z) < radius) }
  private poseOk(p: Vec, look: Vec) { return p.y > .1 && !this.index.solid(p.x, p.y, p.z, .6) && this.index.clear(p.x, p.y, p.z, look.x, look.y, look.z) }

  /** Builds and validates a plan, or returns null if the shot cannot be framed here. */
  private makePlan(id: DirectorShotId, input: DirectorInputs, approach?: Approach): Plan | null {
    const rnd = this.random, centre: 1 | -1 = input.lateral >= 0 ? -1 : 1, side: 1 | -1 = rnd() < .5 ? 1 : -1
    const bars = BARS[id], beatsAlive = this.beats.alive(this.now), bar = beatsAlive ? this.beats.bar : 2.2
    const target = Math.min(MAX_SHOT, Math.max(MIN_SHOT, Math.round(bars[0] + rnd() * (bars[1] - bars[0])) * bar)) * (input.reduced ? 1.4 : 1)
    const plan: Plan = { id, start: this.now, target, side, seed: rnd() * 100, hfov: 50, seenCar: false, exitAt: 0, handheld: 0 }
    const { car, anchor, fs, rs, a } = this.v
    const ahead = (meters: number) => input.traffic.some(t => { const d = this.ahead(t.distance, input.distance); return d > 0 && d < meters })
    if (id === 'aerial') {
      plan.distance = 55 + rnd() * 18; plan.height = 34 + rnd() * 14; plan.hfov = 36
      this.pose(plan, input, a, this.v.b, 0)
      return this.poseOk(a, anchor) ? plan : null
    }
    if (id === 'sideTrack') {
      // Prefer the ocean (east, +X) side on Ocean Drive: buildings compress behind the car.
      const sides: (1 | -1)[] = rs.x >= 0 ? [1, -1] : [-1, 1]
      for (const s of sides) for (const L of [24, 19, 15, 11]) {
        a.copy(car).addScaledVector(rs, s * L).addScaledVector(fs, 1.5).addScaledVector(UP, 1.35)
        if (this.poseOk(a, anchor)) { plan.side = s; plan.distance = L; plan.hfov = T.MathUtils.radToDeg(2 * Math.atan(4.1 / L)); plan.handheld = .4; return plan }
      }
      return null
    }
    if (id === 'frontLow' || id === 'windshield' || id === 'reflection') {
      if (ahead(22)) return null
      plan.side = id === 'windshield' ? side : centre // never between the car and the storefront curb
      if (id === 'reflection' && input.night < .5) return null
      plan.handheld = id === 'reflection' ? 0 : id === 'windshield' ? .5 : .8
      plan.hfov = id === 'frontLow' ? 54 : id === 'windshield' ? 38 : 50
      this.pose(plan, input, a, this.v.b, 0)
      return this.poseOk(a, anchor) ? plan : null
    }
    if (id === 'rearChase' || id === 'roofMount') {
      plan.hfov = id === 'rearChase' ? 60 : 74; plan.handheld = id === 'rearChase' ? .7 : 0; plan.side = centre
      return plan
    }
    if (id === 'landmarkPass' && approach) {
      const across = Math.hypot(approach.road.x - approach.facade.x, approach.road.z - approach.facade.z)
      const back = across + 13
      const p = new T.Vector3().copy(approach.facade).addScaledVector(approach.normal, back).setY(1.7)
      const look = new T.Vector3().copy(approach.facade).addScaledVector(approach.normal, 3).setY((approach.landmark.bodyHeight || 10) * .3)
      if (!this.poseOk(p, look) || this.index.solid(p.x, p.y, p.z, 1.2) || this.adNear(look.x, look.z, 14)) return null
      plan.fixed = p; plan.look = look; plan.approach = approach
      plan.hfov = T.MathUtils.clamp(T.MathUtils.radToDeg(2 * Math.atan((approach.landmark.streetFacing.width / 2 + 10) / back)), 38, 72)
      plan.target = MAX_SHOT + 2
      return plan
    }
    if (id === 'oceanSide') {
      const street = this.route.sample(input.distance).streetName
      if (!/Ocean Drive/i.test(street)) return null
      const arrive = this.route.sample(input.distance + Math.max(6, input.speed) * 4)
      const east = new T.Vector3(Math.cos(arrive.yaw), 0, -Math.sin(arrive.yaw)); if (east.x < 0) east.negate()
      const p = new T.Vector3(arrive.x, 0, arrive.z).addScaledVector(east, 36 + rnd() * 10).setY(2.3)
      const look = new T.Vector3(arrive.x, 3, arrive.z).addScaledVector(east, -8)
      if (!this.poseOk(p, look) || this.adNear(look.x, look.z, 12)) return null
      plan.fixed = p; plan.look = look; plan.hfov = 44
      return plan
    }
    return null
  }

  private choose(input: DirectorInputs, reason: string, previous: Plan | null): Plan {
    if (this.forced) { const p = this.makePlan(this.forced, input, this.nextApproach(input, 300)?.approach); if (p) return p }
    if (!previous || this.sinceAerial >= 6) { const p = this.makePlan('aerial', input); if (p) return p }
    const prevId = previous?.id, prevCat = prevId ? CATEGORY[prevId] : null
    const candidates = this.allowed.filter(s => s !== prevId && s !== 'landmarkPass' && s !== 'aerial')
    // Weighted pick, avoiding the previous shot and (softly) its category.
    const pool: { plan: Plan; w: number }[] = []
    for (const id of candidates) {
      const plan = this.makePlan(id, input); if (!plan) continue
      pool.push({ plan, w: WEIGHT[id] * (CATEGORY[id] === prevCat ? .35 : 1) })
    }
    const total = pool.reduce((a, b) => a + b.w, 0)
    let cursor = this.random() * total
    for (const entry of pool) { cursor -= entry.w; if (cursor <= 0) return entry.plan }
    void reason
    return this.makePlan(prevId === 'rearChase' ? 'roofMount' : 'rearChase', input)!
  }
  private nextApproach(input: DirectorInputs, within: number) {
    let best: { approach: Approach; ahead: number } | null = null
    for (const approach of this.approaches) {
      const d = this.ahead(approach.meters, input.distance)
      if (d < within && (!best || d < best.ahead)) best = { approach, ahead: d }
    }
    return best
  }

  private cut(input: DirectorInputs, reason: string, next?: Plan | null) {
    const previous = this.plan
    if (previous) {
      this.history.push({ shot: previous.id, seconds: +(this.now - previous.start).toFixed(2), reason })
      if (this.history.length > 64) this.history.shift()
    }
    this.plan = next || this.choose(input, reason, previous)
    this.sinceAerial = this.plan.id === 'aerial' ? 0 : this.sinceAerial + 1
    if (this.plan.approach) this.shotLandmarks.add(this.plan.approach.meters)
    this.blocked = 0; this.lost = 0; this.losTimer = 0; this.losClear = true
    this.out.cut = true
  }

  /** Camera pose for the plan at `elapsed` seconds, written in WORLD coordinates. */
  private pose(plan: Plan, input: DirectorInputs, position: Vec, target: Vec, elapsed: number) {
    const { car, anchor, f, r, fs, rs } = this.v
    const front = -input.carMin.z, rear = input.carMax.z, top = input.carMax.y
    const hand = input.reduced ? 0 : plan.handheld, t = this.now + plan.seed
    switch (plan.id) {
      case 'aerial': {
        const back = plan.distance! - elapsed * .9, lateral = plan.side * (26 + elapsed * 1.3)
        position.copy(car).addScaledVector(fs, -back).addScaledVector(rs, lateral).addScaledVector(UP, plan.height! + Math.sin(elapsed * .2) * 1.5)
        target.copy(car).addScaledVector(fs, 16)
        break
      }
      case 'sideTrack':
        position.copy(car).addScaledVector(rs, plan.side * plan.distance!).addScaledVector(fs, 1.5 - elapsed * .12).addScaledVector(UP, 1.35)
        target.copy(anchor).addScaledVector(fs, .3)
        break
      case 'frontLow': {
        const d = Math.max(6.2, 10 - elapsed * .45) + front
        position.copy(car).addScaledVector(fs, d).addScaledVector(rs, plan.side * 1.7).addScaledVector(UP, .55)
        target.copy(car).addScaledVector(UP, top * .55).addScaledVector(fs, front * .4)
        break
      }
      case 'reflection': {
        const d = Math.max(8, 12 - elapsed * .4) + front
        position.copy(car).addScaledVector(fs, d).addScaledVector(rs, plan.side * .9).addScaledVector(UP, .17)
        target.copy(car).addScaledVector(UP, top * .4)
        break
      }
      case 'windshield':
        // Rigidly car-mounted ahead of the bumper, looking back in at the lit dash.
        position.copy(car).addScaledVector(f, front + 2.7).addScaledVector(r, plan.side * .3).addScaledVector(UP, top * 1.22)
        target.copy(car).addScaledVector(UP, top * .62).addScaledVector(f, -.05)
        break
      case 'roofMount':
        position.copy(car).addScaledVector(UP, top + .16).addScaledVector(f, -.15)
        target.copy(car).addScaledVector(f, 32).addScaledVector(UP, .9)
        break
      case 'rearChase':
        position.copy(car).addScaledVector(fs, -(rear + 4.4)).addScaledVector(rs, plan.side * .6).addScaledVector(UP, .74)
        target.copy(car).addScaledVector(fs, 6).addScaledVector(UP, .5)
        break
      case 'landmarkPass':
        position.copy(plan.fixed!)
        target.copy(plan.look!)
        break
      case 'oceanSide':
        position.copy(plan.fixed!)
        // Pan only: the look point eases between the hotel row and the car.
        target.lerpVectors(plan.look!, anchor, .55)
        break
    }
    if (hand > 0) {
      const sway = (a: number, b: number) => Math.sin(t * a) * .6 + Math.sin(t * b + 1.3) * .4
      position.addScaledVector(rs, sway(1.1, 2.3) * .035 * hand).addScaledVector(UP, sway(1.7, 2.9) * .025 * hand)
      target.addScaledVector(rs, sway(.7, 1.9) * .05 * hand).addScaledVector(UP, sway(1.3, .9) * .04 * hand)
    }
  }

  private carInFrame(position: Vec, target: Vec, hfov: number, aspect: number) {
    const { a, b, c, d, anchor } = this.v
    a.subVectors(target, position).normalize()          // forward
    b.crossVectors(a, UP).normalize()                   // right
    c.crossVectors(b, a)                                // up
    d.subVectors(anchor, position); const depth = d.dot(a)
    if (depth <= .2) return false
    const th = Math.tan(T.MathUtils.degToRad(hfov) / 2), tv = th / aspect
    return Math.abs(d.dot(b) / depth) < th * .95 && Math.abs(d.dot(c) / depth) < tv * .95
  }

  update(input: DirectorInputs): DirectorFrame {
    const dt = Math.min(input.dt, .1)
    this.now += dt
    this.out.cut = false
    const origin = this.route.sample(input.distance), yaw = origin.yaw
    const { car, anchor, f, r, fs, rs } = this.v
    car.set(origin.x + input.lateral * Math.cos(yaw), 0, origin.z - input.lateral * Math.sin(yaw))
    anchor.copy(car).setY(input.carMax.y * .5)
    this.basis(yaw, f, r)
    // Lazy heading for tracking rigs: cornering reads as a camera operator, not a gimbal lock.
    if (!this.headingReady) { this.heading = yaw; this.headingReady = true }
    const delta = Math.atan2(Math.sin(yaw - this.heading), Math.cos(yaw - this.heading))
    this.heading += delta * (1 - Math.exp(-dt * 2.2))
    this.basis(this.heading, fs, rs)

    const beat = this.beats.update(this.now, input.beatLive ? input.kick : 0)
    if (!this.plan) this.cut(input, 'enter')
    let plan = this.plan!
    const elapsed = this.now - plan.start
    // A landmark ahead pre-empts the current shot on the next beat (never mid-phrase if music is live).
    const next = this.nextApproach(input, 120)
    const tta = next ? next.ahead / Math.max(3, input.speed) : Infinity
    if (next && plan.id !== 'landmarkPass' && this.allowed.includes('landmarkPass') && !this.shotLandmarks.has(next.approach.meters) && tta > 2.2 && tta < 5.5 && elapsed > 2.5 && (beat || !this.beats.alive(this.now))) {
      const p = this.makePlan('landmarkPass', input, next.approach)
      if (p) { this.cut(input, 'landmark ahead', p); plan = this.plan! }
      else this.shotLandmarks.add(next.approach.meters)
    }
    // Forget landmarks once they are well behind, so the next lap can feature them again.
    this.shotLandmarks.forEach(m => { if (this.ahead(m, input.distance) < this.route.length - 400 && this.ahead(m, input.distance) > 150) this.shotLandmarks.delete(m) })

    const e = this.now - plan.start
    this.pose(plan, input, this.out.position, this.out.target, e)
    const inFrame = this.carInFrame(this.out.position, this.out.target, plan.hfov, input.aspect)
    // Line-of-sight is checked at 8 Hz; it is a footprint test, not a mesh raycast.
    this.losTimer -= dt
    if (this.losTimer <= 0) {
      this.losTimer = .125
      const p = this.out.position
      this.losClear = !this.index.solid(p.x, p.y, p.z, .3) && (plan.id === 'roofMount' || this.index.clear(p.x, p.y, p.z, anchor.x, anchor.y, anchor.z))
    }
    this.blocked = this.losClear ? 0 : this.blocked + dt
    this.lost = inFrame ? 0 : this.lost + dt
    if (inFrame) plan.seenCar = true

    const fixed = WORLD_FIXED.includes(plan.id)
    const beatLen = this.beats.alive(this.now) ? this.beats.interval : .5
    let reason = ''
    if (this.blocked > .35) reason = 'safety: line of sight'
    else if (!fixed && this.lost > .6) reason = 'safety: car out of frame'
    else if (fixed && !plan.seenCar && e > 6) reason = 'car never entered'
    else if ((plan.id === 'frontLow' || plan.id === 'windshield' || plan.id === 'reflection') && input.traffic.some(t => { const d = this.ahead(t.distance, input.distance); return d > 0 && d < 16 })) reason = 'safety: traffic ahead'
    if (!reason && fixed && plan.seenCar && !inFrame && !plan.exitAt) plan.exitAt = this.now
    if (!reason && plan.exitAt && this.now - plan.exitAt >= beatLen && (beat || this.now - plan.exitAt >= beatLen * 2)) reason = 'held one beat after exit'
    if (!reason && fixed && e > MAX_SHOT + 2) reason = 'max hold'
    if (!reason && !fixed && e >= plan.target) {
      if (!this.beats.alive(this.now)) reason = 'time (no beat)'
      else if (beat === 'bar' || (input.phrase > .9 && e >= MIN_SHOT)) reason = beat === 'bar' ? 'bar' : 'phrase'
      else if (e >= plan.target + this.beats.bar * 1.05 && beat) reason = 'beat (bar overdue)'
    }
    if (reason) {
      this.cut(input, reason)
      this.pose(this.plan!, input, this.out.position, this.out.target, 0)
      plan = this.plan!
    }
    this.out.shot = plan.id
    this.out.fov = T.MathUtils.clamp(T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(plan.hfov) / 2) / input.aspect)), 8, 95)
    // World → render coordinates (MiamiWorld translates the city by -origin).
    this.out.position.x -= origin.x; this.out.position.z -= origin.z
    this.out.target.x -= origin.x; this.out.target.z -= origin.z
    return this.out
  }
}
