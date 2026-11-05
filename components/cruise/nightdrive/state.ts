import type { DriveState, StreetCamera } from '../master/DriveController'

export type NightCamera = StreetCamera | 'la'
export type DrivingMood = 'cruise' | 'night-drive' | 'midnight-run'
export type District = 'coast' | 'neon'
export type LabTraffic = { id: number; distance: number; lateral: number; speed: number }
export type NightState = DriveState & {
  seed: number
  elapsed: number
  odometer: number
  targetSpeed: number
  acceleration: number
  mood: DrivingMood
  district: District
  districtMix: number
  laneTarget: number
  maneuver: 'follow' | 'passing' | 'returning'
  overtakes: number
  minTrafficGap: number
  traffic: LabTraffic[]
  reduced: boolean
  generationMs: number
  maxGenerationMs: number
  chunksGenerated: number
}

export function createNightState(seed = 1984): NightState {
  return {
    distance: 0, speed: 0, lateral: 2, steer: 0, paused: true, glance: 0,
    autopilot: true, seed, elapsed: 0, odometer: 0, targetSpeed: 0, acceleration: 0,
    mood: 'night-drive', district: 'coast', districtMix: 0,
    laneTarget: 2, maneuver: 'follow', overtakes: 0, minTrafficGap: Infinity,
    traffic: [{ id: 0, distance: 65, lateral: 2, speed: 9 }, { id: 1, distance: 180, lateral: -2, speed: 14 }],
    reduced: false, generationMs: 0, maxGenerationMs: 0, chunksGenerated: 0,
  }
}
