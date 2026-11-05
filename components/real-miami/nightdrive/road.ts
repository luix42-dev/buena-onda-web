import type { District } from './state'

export const CHUNK_LENGTH = 96
export const CHUNK_COUNT = 13
export const CHUNKS_BEHIND = 4
export const ROAD_STEP = 4

/** Stable scalar noise for decoration, independent of traversal order. */
export function roadRandom(index: number, seed: number): number {
  let value = Math.imul(index | 0, 374761393) ^ Math.imul(seed | 0, 668265263)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

/** s is longitudinal parameter, not arc length. Derivatives permit true speed. */
export function roadSample(s: number, seed: number) {
  const phase = roadRandom(0, seed) * Math.PI * 2
  const a = s / 240 + phase
  const b = s / 610 + phase * .7
  const c = s / 330 + phase * .3
  const dx = 26 / 240 * Math.cos(a) + 17 / 610 * Math.cos(b)
  const dy = 1.8 / 330 * Math.cos(c)
  const ddx = -26 / (240 * 240) * Math.sin(a) - 17 / (610 * 610) * Math.sin(b)
  return {
    x: 26 * Math.sin(a) + 17 * Math.sin(b),
    y: 1.8 * Math.sin(c), z: -s, dx, dy,
    metric: Math.sqrt(1 + dx * dx + dy * dy),
    yaw: -Math.atan(dx),
    curvature: ddx / Math.pow(1 + dx * dx, 1.5),
  }
}

const RETRO_CYCLE = 3200
const smoothstep = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x) }

/** Retrowave alone leaves the city for a 65 m high, sweeping skyway, then rejoins it.
 * Each 3.2 km chapter begins and ends at the original road with zero added slope. */
export function retrowaveSkywayMix(s: number): number {
  const phase = ((s % RETRO_CYCLE) + RETRO_CYCLE) % RETRO_CYCLE
  return smoothstep((phase - 850) / 180) * (1 - smoothstep((phase - 2460) / 180))
}

/** The bridge briefly descends toward the tropical island without changing its road heading. */
export function retrowaveIslandMix(s: number): number {
  const phase = ((s % RETRO_CYCLE) + RETRO_CYCLE) % RETRO_CYCLE
  return smoothstep((phase - 1200) / 450) * (1 - smoothstep((phase - 2050) / 450))
}

function retroPosition(s: number, seed: number) {
  const base = roadSample(s, seed)
  const phase = ((s % RETRO_CYCLE) + RETRO_CYCLE) % RETRO_CYCLE
  const rise = smoothstep((phase - 480) / 520)
  const fall = 1 - smoothstep((phase - 2400) / 520)
  const open = retrowaveSkywayMix(s)
  const island = retrowaveIslandMix(s)
  return { x: base.x + open * (55 * Math.sin(s / 160) + 18 * Math.sin(s / 75)), y: base.y + 65 * rise * fall - 56 * island }
}

export function retrowaveRoadSample(s: number, seed: number) {
  const center = retroPosition(s, seed), before = retroPosition(s - .5, seed), after = retroPosition(s + .5, seed)
  const dx = after.x - before.x, dy = after.y - before.y
  const ddx = after.x - 2 * center.x + before.x
  return { ...center, z: -s, dx, dy, metric: Math.sqrt(1 + dx * dx + dy * dy), yaw: -Math.atan(dx), curvature: ddx / Math.pow(1 + dx * dx, 1.5) }
}

/** Seeded coast/city lengths, both >=700m; continuous 192m entrances. */
export function districtAt(s: number, seed: number): { district: District; mix: number } {
  const pairLength = 1700
  const pair = Math.floor(s / pairLength)
  const local = s - pair * pairLength
  const coastLength = 700 + roadRandom(pair, seed + 37) * 300
  const smooth = (value: number) => {
    const t = Math.max(0, Math.min(1, value))
    return t * t * (3 - 2 * t)
  }
  // The trailing transition returns to coast before the next pair boundary.
  const mix = smooth((local - coastLength) / 192) * (1 - smooth((local - pairLength + 192) / 192))
  return { district: mix >= .5 ? 'neon' : 'coast', mix }
}
