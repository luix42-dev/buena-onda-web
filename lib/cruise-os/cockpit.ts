import type { RideCameraProfile, RideVehicleId } from '../real-miami/ride-vehicles'
import poses from './cockpit-poses.json'

/** Cruise OS seat adjustment only; legacy cameras and radio geometry stay intact. */
export function cruiseCockpitProfile(profile: RideCameraProfile, vehicle: RideVehicleId, enabled = false): RideCameraProfile {
  if (!enabled) return profile
  const pose=poses[vehicle as keyof typeof poses]
  if(!pose)return profile
  const driver=pose.eye as [number,number,number]
  const target:[number,number,number]=[driver[0],driver[1]+Math.tan(pose.pitch)*4,driver[2]-4]
  const driverPortrait=pose.eyePortrait as [number,number,number]
  const targetPortrait:[number,number,number]=[driverPortrait[0],driverPortrait[1]+Math.tan(pose.pitchPortrait)*4,driverPortrait[2]-4]
  return {
    ...profile,
    driver,driverPortrait,target,targetPortrait,driverFov:pose.fov,
  }
}
