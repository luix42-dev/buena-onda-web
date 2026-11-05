import * as T from 'three'

/** Director for Neon Run. The Miami director reads OSM buildings and landmarks; this world is
 * open air above the smog, so shots are car-relative and never occluded. sideTrack and frontLow
 * keep the rolling wheels in frame; crane shows the megastructures; flyby lets the car pass. */
export type NeonShot = 'sideTrack' | 'frontLow' | 'crane' | 'rearChase' | 'flyby' | 'wheelLow'
const ORDER: NeonShot[] = ['sideTrack', 'crane', 'frontLow', 'flyby', 'wheelLow', 'rearChase']
const LENGTH: Record<NeonShot, [number, number]> = { sideTrack: [6, 9], frontLow: [5, 7], crane: [7, 10], rearChase: [5, 8], flyby: [4.5, 5.5], wheelLow: [4, 6] }
const FOV: Record<NeonShot, number> = { sideTrack: 34, frontLow: 40, crane: 48, rearChase: 44, flyby: 30, wheelLow: 46 }

export class NeonDirector {
  shot: NeonShot = 'sideTrack'
  private index = 0; private until = 0; private now = 0; private forced: NeonShot | null = null
  private side = 1; private anchor = new T.Vector3(); private seed: number
  readonly position = new T.Vector3(); readonly target = new T.Vector3()
  constructor(seed = 7) { this.seed = seed }
  reset() { this.until = 0 }
  force(shot: NeonShot | null) { this.forced = shot; this.until = 0 }
  snapshot() { return { shot: this.shot, remaining: Math.max(0, this.until - this.now) } }
  /** carPos/yaw are the car's pose (nose toward local -Z). The world is origin-relative to the car's
   * road point, so a static camera is stored as road distance + lateral and re-placed with roadAt. */
  update(dt: number, carPos: T.Vector3, yaw: number, speed: number, distance: number, roadAt: (d: number, lateral: number, up: number, out: T.Vector3) => T.Vector3) {
    this.now += dt
    const fwd = new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
    if (this.now >= this.until) {
      this.shot = this.forced ?? ORDER[this.index++ % ORDER.length]
      const [a, b] = LENGTH[this.shot], r = Math.abs(Math.sin(this.seed * 12.9898 + this.index * 78.233)) % 1
      this.until = this.now + a + (b - a) * r; this.side = this.index % 2 ? 1 : -1
      // Flyby plants a static camera ahead on the barrier and lets the car pass it.
      if (this.shot === 'flyby') this.anchor.set(distance + Math.max(26, speed * 2.6), this.side * 5.6, .7)
    }
    const t = 1 - Math.max(0, this.until - this.now) / LENGTH[this.shot][1]
    const at = (f: number, r: number, up: number, v = this.position) => v.copy(carPos).addScaledVector(fwd, f).addScaledVector(right, r).setY(carPos.y + up)
    switch (this.shot) {
      case 'sideTrack': at(.4 - t * .8, this.side * 6.4, 1.05); at(.2, 0, .55, this.target); break
      case 'wheelLow': at(-1.6 + t * 1.2, this.side * 2.9, .32); at(-1.2, 0, .3, this.target); break
      case 'frontLow': at(7.5 - t * 1.5, this.side * 1.4, .42); at(0, 0, .65, this.target); break
      case 'crane': at(-14 + t * 4, this.side * (9 - t * 4), 9 + t * 16); at(40, 0, 6, this.target); break
      case 'rearChase': at(-8.5, this.side * .6, 1.6); at(14, 0, 1.1, this.target); break
      case 'flyby': roadAt(this.anchor.x, this.anchor.y, this.anchor.z, this.position); at(0, 0, .6, this.target); break
    }
    return { position: this.position, target: this.target, fov: FOV[this.shot], shot: this.shot }
  }
}
