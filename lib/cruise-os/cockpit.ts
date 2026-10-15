import type { RideCameraProfile, RideVehicleId } from '../real-miami/ride-vehicles'

/** Cruise OS seat adjustment only; legacy cameras and radio geometry stay intact. */
export function cruiseCockpitProfile(profile: RideCameraProfile, vehicle: RideVehicleId, enabled = false): RideCameraProfile {
  if (!enabled || vehicle !== 'countach') return profile
  return {
    ...profile,
    driver: [profile.driver[0], .90, .02],
    driverPortrait: [(profile.driverPortrait || profile.driver)[0], .91, .04],
    target: [profile.target[0], .80, profile.target[2]],
    targetPortrait: [(profile.targetPortrait || profile.target)[0], .81, (profile.targetPortrait || profile.target)[2]],
  }
}
