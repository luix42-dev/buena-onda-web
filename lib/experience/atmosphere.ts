import type { RideCameraProfile, RidePoint, RideVehicleId } from '../real-miami/ride-vehicles'

export const MIN_SUNSET_SECONDS = 30 * 60
export const MAX_SUNSET_SECONDS = 45 * 60
export const DEFAULT_SUNSET_SECONDS = 40 * 60

/** URL `sunsetMinutes`: a plain decimal in the editorial 30–45 minute range. */
export function sunsetDurationSeconds(raw: string | null | undefined): number {
  if (typeof raw !== 'string' || !/^\d+(?:\.\d+)?$/.test(raw.trim())) return DEFAULT_SUNSET_SECONDS
  const minutes = Number(raw.trim())
  return Number.isFinite(minutes) && minutes >= 30 && minutes <= 45 ? minutes * 60 : DEFAULT_SUNSET_SECONDS
}

/** Elapsed simulation time: pausing the drive never advances the transition. */
export function nightBlend(elapsed: number, cycleStart: number, night: boolean, durationSeconds = DEFAULT_SUNSET_SECONDS): number {
  if (night) return 1
  if (!Number.isFinite(elapsed) || !Number.isFinite(cycleStart)) return 0
  const duration = Number.isFinite(durationSeconds) && durationSeconds >= MIN_SUNSET_SECONDS && durationSeconds <= MAX_SUNSET_SECONDS ? durationSeconds : DEFAULT_SUNSET_SECONDS
  return Math.max(0, Math.min(1, (elapsed - cycleStart) / duration))
}

/** Raise the windshield gaze without moving the eye, changing yaw or zooming.
 * The original cabin, radio-focus and chase profiles retain their exact values.
 */
export function experienceCameraProfile(profile: RideCameraProfile, vehicle: RideVehicleId, enabled = false): RideCameraProfile {
  if (!enabled || (vehicle !== 'countach' && vehicle !== 'wrangler')) return profile
  const lift = (eye: RidePoint, target: RidePoint): RidePoint => {
    const gap = Math.max(0, eye[1] - target[1])
    // Countach's low windshield needs a smaller correction than the Jeep.
    const rise = Math.min(vehicle === 'countach' ? .11 : .28, gap * .5)
    return [target[0], target[1] + rise, target[2]]
  }
  return {
    ...profile,
    target: lift(profile.driver, profile.target),
    ...(profile.targetPortrait ? { targetPortrait: lift(profile.driverPortrait || profile.driver, profile.targetPortrait) } : {}),
  }
}
