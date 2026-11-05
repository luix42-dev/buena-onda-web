/** "The Look" (Oct 2026): retro wet-night chase look from the retrovideonet reference.
 * Scoped to /cruise/prototype; `?look=before` renders the previous prototype look for matched comparisons. */
export function cruiseLookEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return (window.location.pathname === '/cruise' || window.location.pathname === '/cruise/prototype') && new URLSearchParams(window.location.search).get('look') !== 'before'
}

/** Near-black navy sky, cyan as the dominant light, sodium streetlights, red taillights. */
export const LOOK = {
  sky: { top: '#01030a', mid: '#050c1f', horizon: '#0c1d36' },
  fog: '#0a1629',
  fogDensity: .0042,
  road: '#262d38',
  roadEmissive: '#0a1424',
  sodium: '#ffb15c',
  cyan: '#4fe3ff',
  red: '#ff2a3c',
} as const

/** Chase: farther behind and above the car, with a gentle downward gaze. */
export const LOW_CHASE = {
  position: [0, 2.5, 8.6] as const,
  positionPortrait: [0, 2.55, 9.1] as const,
  target: [0, .9, -15] as const,
  fov: 38,
  fovPortrait: 54,
}

/** Small hand-held sway; zero with reduced motion. Returns lateral, vertical (m) and roll (rad). */
export function lowChaseSway(t: number, reduced: boolean) {
  if (reduced) return { x: 0, y: 0, roll: 0 }
  return {
    x: Math.sin(t * .37) * .11 + Math.sin(t * .83 + 1.3) * .035,
    y: Math.sin(t * .51 + .4) * .025,
    roll: Math.sin(t * .29 + 2.1) * .006,
  }
}

/** Look v2 camera language (Miami Vice mood, our own car). Car space: nose toward -Z, metres.
 * Countach-measured; other cars scale from their bounds via `cinemaRig`. */
export type CinemaShot = 'hood' | 'wheel' | 'wheelClose'
type Pose = { position: readonly [number, number, number]; target: readonly [number, number, number]; fov: number; fovPortrait: number }
export const CINEMA: Record<CinemaShot, Pose> = {
  // Low at the base of the windshield, over the glossy hood; lights slide across the paint.
  // The Countach hood drops ~30 deg below the windshield base, so horizon and a full hood do not fit one frame.
  // Default keeps the horizon with a mirrored hood strip; `?hoodframe=tight` trades the horizon for more hood.
  hood: { position: [0, 1.12, -.9], target: [0, -9.8, -30], fov: 56, fovPortrait: 78 },
  // Low beside and ahead of the front wheel, looking back down the flank at the road behind.
  wheel: { position: [-2.05, .52, -3.6], target: [-.7, .42, 1.2], fov: 40, fovPortrait: 62 },
  // Tight on the front rim for short inserts.
  wheelClose: { position: [-1.85, .42, -.85], target: [-.86, .34, -1.3], fov: 30, fovPortrait: 46 },
}
/** Countach bounds the poses were authored against (length 4.14 m, half width ~1.0 m, roof ~1.07 m). */
const AUTHORED = { length: 4.14, half: 1.0, height: 1.07 }
const HOOD_TIGHT: Pose = { position: [0, 1.12, -.9], target: [0, -13.5, -30], fov: 48, fovPortrait: 70 }
const hoodTight = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('hoodframe') === 'tight'
export function cinemaRig(shot: CinemaShot, bounds?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }) {
  const pose = shot === 'hood' && hoodTight() ? HOOD_TIGHT : CINEMA[shot]
  if (!bounds) return pose
  const length = bounds.max.z - bounds.min.z, half = (bounds.max.x - bounds.min.x) / 2, height = bounds.max.y - bounds.min.y
  if (!(length > 2 && half > .5 && height > .6)) return pose
  const clamp = (v: number) => Math.min(1.35, Math.max(.8, v))
  const sz = clamp(length / AUTHORED.length), sx = clamp(half / AUTHORED.half), sy = clamp(height / AUTHORED.height)
  const scale = (v: readonly [number, number, number]) => [v[0] * sx, v[1] * sy, v[2] * sz] as const
  return { ...pose, position: scale(pose.position), target: shot === 'hood' ? [0, pose.target[1] * sy, pose.target[2]] as const : scale(pose.target) }
}
/** Road vibration on the wheel-level shots: a few millimetres, zero with reduced motion. */
export function wheelShake(t: number, speed: number, reduced: boolean) {
  if (reduced) return 0
  const k = Math.min(1, speed / 25)
  return (Math.sin(t * 31) * .0022 + Math.sin(t * 47 + 1.7) * .0014) * k
}
