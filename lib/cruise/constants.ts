import type {
  CruiseCamera,
  CruiseQuality,
  CruiseQualitySettings,
  CruiseTimeMode,
  CruiseWeather,
} from './types'
import { CRUISE_ROUTE } from './routes'

export const HERO_X = 3.5
export const CRUISE_SPEED = 12.5
export const MODULE_LENGTH = 64
export const MODULE_COUNT = CRUISE_ROUTE.length
export const WORLD_LENGTH = MODULE_LENGTH * MODULE_COUNT
export const WORLD_MIN_Z = -(WORLD_LENGTH - MODULE_LENGTH * 2)
export const WORLD_MAX_Z = MODULE_LENGTH * 2
export const WORLD_CENTER_Z = (WORLD_MIN_Z + WORLD_MAX_Z) * 0.5
export const HUD_HIDE_MS = 4_000
export const CAMERA_ORDER: readonly CruiseCamera[] = ['chase', 'hood', 'driver', 'side', 'lowRear']
export const CAMERA_LABELS: Record<CruiseCamera, string> = {
  chase: 'Rear chase', hood: 'Hood', driver: 'Driver POV', side: 'Side tracking', lowRear: 'Low rear',
}
export const DIRECTOR_MIN_SHOT_MS = 5_000
export const DIRECTOR_MAX_SHOT_MS = 18_000
export const TIME_ORDER: readonly CruiseTimeMode[] = ['day', 'sunset', 'night', 'auto']
export const TIME_LABELS: Record<CruiseTimeMode, string> = {
  day: 'Day', sunset: 'Sunset', night: 'Night', auto: 'Miami time',
}
export const WEATHER_ORDER: readonly CruiseWeather[] = ['clear', 'rain']
export const WEATHER_LABELS: Record<CruiseWeather, string> = {
  clear: 'Clear', rain: 'Rain',
}
export const QUALITY: Record<CruiseQuality, CruiseQualitySettings> = {
  low: {
    dpr: 1, shadows: false, shadowMapSize: 512, palmDetail: 5,
    trafficCount: 6, pedestriansPerModule: 2, rainParticles: 0,
  },
  medium: {
    dpr: 1.35, shadows: true, shadowMapSize: 1024, palmDetail: 7,
    trafficCount: 11, pedestriansPerModule: 4, rainParticles: 420,
  },
  high: {
    dpr: 1.75, shadows: true, shadowMapSize: 2048, palmDetail: 9,
    trafficCount: 16, pedestriansPerModule: 7, rainParticles: 760,
  },
}

/** The wrap point is behind every camera and returns beyond forward fog. */
export function moduleZ(index: number, distance: number): number {
  const unwrapped = -index * MODULE_LENGTH + distance
  return ((unwrapped - WORLD_MIN_Z) % WORLD_LENGTH + WORLD_LENGTH) % WORLD_LENGTH + WORLD_MIN_Z
}

export function routeIndexAtDistance(distance: number, worldZ = 0): number {
  let nearest = 0
  let nearestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < MODULE_COUNT; index += 1) {
    const separation = Math.abs(moduleZ(index, distance) - worldZ)
    if (separation < nearestDistance) {
      nearest = index
      nearestDistance = separation
    }
  }
  return nearest
}
