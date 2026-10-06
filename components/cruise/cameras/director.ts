import {
  CRUISE_SPEED, DIRECTOR_MAX_SHOT_MS, DIRECTOR_MIN_SHOT_MS,
  MODULE_LENGTH, moduleZ, routeIndexAtDistance,
} from '@/lib/cruise/constants'
import { CRUISE_ROUTE } from '@/lib/cruise/routes'
import type { CruiseDirectorShot, CruiseRuntime } from '@/lib/cruise/types'

const WEIGHT: Record<CruiseDirectorShot, number> = {
  chase: 3, hood: 1.3, driver: 0.65, side: 2.1, lowRear: 1.8,
  rearQuarter: 2.2, wideRear: 2, skyline: 1.6, billboardReveal: 1.2,
}
const FALLBACK: readonly CruiseDirectorShot[] = ['chase', 'hood', 'side']

export function allowedShots(distance: number): readonly CruiseDirectorShot[] {
  return CRUISE_ROUTE[routeIndexAtDistance(distance)].shots
}

/** Stop before the first incompatible module, including the wrapped route. */
export function shotHorizon(shot: CruiseDirectorShot, runtime: CruiseRuntime): number {
  let index = routeIndexAtDistance(runtime.distance)
  if (!(CRUISE_ROUTE[index].shots as readonly CruiseDirectorShot[]).includes(shot)) return 0
  const speed = Math.max(runtime.speed, CRUISE_SPEED)
  let seconds = (MODULE_LENGTH / 2 - moduleZ(index, runtime.distance)) / speed
  const maximum = DIRECTOR_MAX_SHOT_MS / 1000
  for (let count = 0; count < CRUISE_ROUTE.length && seconds < maximum; count++) {
    index = (index + 1) % CRUISE_ROUTE.length
    if (!(CRUISE_ROUTE[index].shots as readonly CruiseDirectorShot[]).includes(shot)) return Math.max(0, seconds)
    seconds += MODULE_LENGTH / speed
  }
  return maximum
}

export function chooseDirectorShot(
  runtime: CruiseRuntime,
  previous: CruiseDirectorShot | null,
  random: () => number = Math.random,
): CruiseDirectorShot {
  const allowed = allowedShots(runtime.distance)
  const minimum = DIRECTOR_MIN_SHOT_MS / 1000
  let total = 0
  for (const shot of allowed) {
    if (shot !== previous && shotHorizon(shot, runtime) >= minimum) total += WEIGHT[shot]
  }
  if (total > 0) {
    let cursor = Math.max(0, Math.min(0.999999, random())) * total
    for (const shot of allowed) {
      if (shot === previous || shotHorizon(shot, runtime) < minimum) continue
      cursor -= WEIGHT[shot]
      if (cursor < 0) return shot
    }
  }
  for (const shot of FALLBACK) {
    if (shot !== previous && allowed.includes(shot) && shotHorizon(shot, runtime) >= minimum) return shot
  }
  // Holding a valid composition is preferable to an unsafe short transition.
  if (previous && allowed.includes(previous) && shotHorizon(previous, runtime) >= minimum) return previous
  for (const shot of FALLBACK) if (allowed.includes(shot)) return shot
  return allowed[0] ?? 'chase'
}

export function directorShotDuration(
  shot: CruiseDirectorShot,
  runtime: CruiseRuntime,
  random: () => number = Math.random,
): number {
  const minimum = DIRECTOR_MIN_SHOT_MS / 1000
  const maximum = Math.min(DIRECTOR_MAX_SHOT_MS / 1000, shotHorizon(shot, runtime))
  const sample = Math.max(0, Math.min(1, random()))
  return Math.max(0.1, Math.min(maximum, minimum + (maximum - minimum) * Math.pow(sample, 0.75)))
}
