/** "The Look" (Oct 2026): retro wet-night chase look from the retrovideonet reference.
 * Scoped to /cruise/prototype; `?look=before` renders the previous prototype look for matched comparisons. */
export function cruiseLookEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname === '/cruise/prototype' && new URLSearchParams(window.location.search).get('look') !== 'before'
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

/** Low chase framing: ~1.25 m up, ~6 m back, roofline just under the vanishing point. */
export const LOW_CHASE = {
  position: [0, 1.28, 6.1] as const,
  positionPortrait: [0, 1.32, 6.6] as const,
  target: [0, 1.12, -40] as const,
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
