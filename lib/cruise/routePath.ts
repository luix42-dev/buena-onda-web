import { WORLD_LENGTH } from './constants'

const FREQUENCY = Math.PI * 2 / WORLD_LENGTH
const AMPLITUDE = 34

function pathX(distance: number) {
  return AMPLITUDE * Math.sin(distance * FREQUENCY * 2) + 12 * Math.sin(distance * FREQUENCY * 3 + .7)
}
function pathSlope(distance: number) {
  return AMPLITUDE * FREQUENCY * 2 * Math.cos(distance * FREQUENCY * 2)
    + 12 * FREQUENCY * 3 * Math.cos(distance * FREQUENCY * 3 + .7)
}

export type RoutePose = { x: number; z: number; yaw: number }

/**
 * Periodic corridor in the current car's tangent frame: HERO_X stays driving-local.
 * Wrap pooled objects with moduleZ first, then include localZ and lateralX here.
 * Each lap repeats lateral position, tangent and curvature without a seam.
 */
export function routeRelativePose(distance: number, longitudinalZ: number, lateralX = 0): RoutePose {
  const station = distance - longitudinalZ
  const currentAngle = Math.atan(pathSlope(distance))
  const yaw = currentAngle - Math.atan(pathSlope(station))
  const dx = pathX(station) - pathX(distance)
  const cosine = Math.cos(currentAngle), sine = Math.sin(currentAngle)
  return {
    x: cosine * dx + sine * longitudinalZ + lateralX * Math.cos(yaw),
    z: -sine * dx + cosine * longitudinalZ - lateralX * Math.sin(yaw),
    yaw,
  }
}

/** Signed turn per metre for a small, smoothed steering animation. */
export function routeCurvature(distance: number) {
  const second = -AMPLITUDE * (FREQUENCY * 2) ** 2 * Math.sin(distance * FREQUENCY * 2)
    - 12 * (FREQUENCY * 3) ** 2 * Math.sin(distance * FREQUENCY * 3 + .7)
  return -second / (1 + pathSlope(distance) ** 2) ** 1.5
}
