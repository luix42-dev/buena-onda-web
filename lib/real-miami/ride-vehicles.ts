export type RideVehicleId = 'countach' | 'wrangler' | 'eighties' | 'cadillac' | 'delorean' | 'coastal-coupe' | 'classic-coupe' | 'island-trail'
export type RidePoint = [number, number, number]
export type RideCameraProfile = {
  label: string
  driver: RidePoint
  driverFov?: number
  driverPortrait?: RidePoint
  target: RidePoint
  targetPortrait?: RidePoint
  radioPosition: RidePoint
  radioTarget: RidePoint
  radioFov?: number
  radioPortraitFov?: number
  chase: RidePoint
  chasePortrait?: RidePoint
  chaseTarget?: RidePoint
}
export const WRANGLER_CAMERA_PROFILE: RideCameraProfile = {
  label: 'Wrangler 2012', driver: [-.28, 1.60, .85], driverPortrait: [-.06, 1.60, 1.05],
  target: [-.01, 1.00, -3], targetPortrait: [-.01, .85, -3],
  radioPosition: [.08, 1.43, .35], radioTarget: [.31, 1.07, -.447],
  chase: [-1.2, 3.5, 8.5], chasePortrait: [-.6, 3.5, 9.5], chaseTarget: [0, 1.05, 0],
}
