/** Look v2 Highway mode: an authored I-95 (Miami) night stretch, not OSM-derived.
 * The shipped OSM extract covers Miami Beach only; I-95 is not in it. This is a 36 km closed loop of
 * long sweepers (minimum radius ~600 m) so a 15-20 minute session at ~110 km/h never laps.
 * Same sample() contract as createMiamiRoute, so the drive, ads and cameras need no special path. */
export const HIGHWAY = {
  length: 36000, step: 5,
  /** Our carriageway: four 3.7 m lanes centred on the route line, 3 m shoulders, barriers at +-10.6 m. */
  laneWidth: 3.7, lanes: 4, shoulder: 3, barrier: 10.6,
  /** Oncoming carriageway centre, across the median. */
  oncoming: -22.4,
  /** Deck height above the city grid below (the route itself stays at y = 0). */
  deck: 14,
  lampEvery: 40, gantryEvery: 1500, billboardEvery: 620, pierEvery: 32,
  /** Anchor near I-95 at the Miami River for the readout's lat/lon. */
  origin: [-80.2046, 25.7705] as [number, number],
} as const

/** Sweeper harmonics: heading wanders around one full turn per lap. */
const WAVES = [[7, .34, .6], [13, .27, 2.1], [23, .09, 4.4], [3, .2, 1.3]] as const
const NAMES = ['I-95 North / Downtown Miami', 'I-95 North / Brickell', 'I-95 Express / Biscayne Blvd', 'I-95 North / Little Havana', 'I-95 Express / Design District', 'I-95 South / Miami River']

export type HighwaySample = { x: number; y: number; z: number; dx: number; dy: number; yaw: number; metric: number; curvature: number; streetName: string; lat: number; lon: number }

export function createHighwayRoute() {
  const { length, step } = HIGHWAY, n = Math.round(length / step)
  const xs = new Float64Array(n + 1), zs = new Float64Array(n + 1), heading = (s: number) => {
    let t = 2 * Math.PI * s / length
    for (const [k, a, p] of WAVES) t += a * Math.sin(2 * Math.PI * k * s / length + p)
    return t
  }
  // Integrate heading (yaw convention matches createMiamiRoute: forward = (-sin yaw, -cos yaw)).
  for (let i = 1; i <= n; i++) { const h = heading((i - .5) * step); xs[i] = xs[i - 1] - Math.sin(h) * step; zs[i] = zs[i - 1] - Math.cos(h) * step }
  // Close the loop: spread the small integration gap along the lap.
  const ex = xs[n] - xs[0], ez = zs[n] - zs[0]
  for (let i = 0; i <= n; i++) { xs[i] -= ex * i / n; zs[i] -= ez * i / n }
  const points: [number, number][] = Array.from({ length: n }, (_, i) => [xs[i], zs[i]])
  const wrap = (d: number) => ((d % length) + length) % length
  function at(distance: number) {
    const s = wrap(distance) / step, i = Math.floor(s), t = s - i, j = i + 1
    return { x: xs[i] + (xs[j] - xs[i]) * t, z: zs[i] + (zs[j] - zs[i]) * t }
  }
  function sample(distance: number): HighwaySample {
    const p = at(distance), before = at(distance - 2), after = at(distance + 2)
    const yaw = Math.atan2(-(after.x - before.x), -(after.z - before.z))
    const y0 = Math.atan2(-(p.x - before.x), -(p.z - before.z)), y1 = Math.atan2(-(after.x - p.x), -(after.z - p.z))
    // Per half-metre, like the OSM route's curvature, so the touring speed planner reads it the same way.
    const curvature = Math.atan2(Math.sin(y1 - y0), Math.cos(y1 - y0)) / 4
    const segment = Math.floor(wrap(distance) / 3000) % NAMES.length
    return { x: p.x, y: 0, z: p.z, dx: -(after.x - before.x), dy: 0, yaw, metric: 1, curvature, streetName: NAMES[segment],
      lat: HIGHWAY.origin[1] - p.z / 111320, lon: HIGHWAY.origin[0] + p.x / (111320 * Math.cos(HIGHWAY.origin[1] * Math.PI / 180)) }
  }
  return { length, points, sample }
}
export type HighwayRoute = ReturnType<typeof createHighwayRoute>

/** World position of a point at route `distance`, `lateral` metres to the right, `up` metres high. */
export function highwayPoint(route: HighwayRoute, distance: number, lateral: number, up = 0) {
  const p = route.sample(distance)
  return { x: p.x + Math.cos(p.yaw) * lateral, y: up, z: p.z - Math.sin(p.yaw) * lateral, yaw: p.yaw }
}
