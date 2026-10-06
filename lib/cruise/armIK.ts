import { Vector3 } from 'three'
export const steeringAngle = (milliseconds: number) => Math.sin(milliseconds * 0.0004) * 0.025

/** Analytic elbow from two segment lengths and a vehicle-local bend hint. */
export function solveArm(shoulder: Vector3, requested: Vector3, pole: Vector3, upper: number, lower: number) {
  const axis = requested.clone().sub(shoulder)
  const distance = Math.min(upper + lower - 0.0001, Math.max(Math.abs(upper - lower) + 0.0001, axis.length()))
  if (axis.lengthSq() < 1e-10) axis.set(0, 0, 1)
  axis.normalize()
  const bend = pole.clone().sub(shoulder)
  bend.addScaledVector(axis, -bend.dot(axis))
  if (bend.lengthSq() < 1e-10) {
    bend.set(Math.abs(axis.y) < 0.9 ? 0 : 1, Math.abs(axis.y) < 0.9 ? 1 : 0, 0)
    bend.addScaledVector(axis, -bend.dot(axis))
  }
  bend.normalize()
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance)
  const elbow = shoulder.clone().addScaledVector(axis, along).addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)))
  return { elbow, hand: shoulder.clone().addScaledVector(axis, distance) }
}

export function reachBlend(seconds: number) {
  const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }
  return seconds < 1.1 ? smooth(seconds / 1.1) : 1 - smooth((seconds - 2.15) / 1.05)
}
