import { Color, Vector3 } from 'three'
import type { CruiseTimeOfDay, CruiseWeather } from '@/lib/cruise/types'

const TIMES = {
  day: {
    zenith: '#397ead', horizon: '#b9d8df', ground: '#a69b7e',
    skyLight: '#cce3e8', keyLight: '#ffdfb2', sun: '#fff1cf',
    hemisphere: 1.55, key: 3.6, environment: 1, near: 105, far: 345,
    sunPosition: [85, 70, -130], lightPosition: [55, 48, -40], disc: 1,
  },
  sunset: {
    zenith: '#548bb2', horizon: '#c4ccd2', ground: '#77746b',
    skyLight: '#c4d7e8', keyLight: '#ffc596', sun: '#ffe0ac',
    hemisphere: 1.3, key: 3.25, environment: 0.8, near: 105, far: 310,
    // Measured HDR sun rotated +90 degrees around Y, matching SunsetEnvironment.
    sunPosition: [59.53, 4.38, -80.23], lightPosition: [59.53, 4.38, -80.23], disc: 1,
  },
  night: {
    zenith: '#0d1c2c', horizon: '#475968', ground: '#35403d',
    skyLight: '#b9cbd4', keyLight: '#bdcee1', sun: '#d2dde8',
    hemisphere: 1.22, key: 1.25, environment: 0.9, near: 90, far: 285,
    sunPosition: [-100, 115, -190], lightPosition: [-35, 65, -50], disc: 0.32,
  },
} satisfies Record<CruiseTimeOfDay, {
  zenith: string; horizon: string; ground: string; skyLight: string; keyLight: string; sun: string
  hemisphere: number; key: number; environment: number; near: number; far: number
  sunPosition: number[]; lightPosition: number[]; disc: number
}>

export function atmospherePreset(timeOfDay: CruiseTimeOfDay, weather: CruiseWeather) {
  const time = TIMES[timeOfDay]
  const rain = weather === 'rain'
  const night = timeOfDay === 'night'
  return {
    zenith: new Color(rain ? (night ? '#121a23' : '#53636e') : time.zenith),
    horizon: new Color(rain ? (night ? '#303c46' : '#8b9b9f') : time.horizon),
    ground: new Color(rain ? '#3e4948' : time.ground),
    skyLight: new Color(rain ? '#bacbd3' : time.skyLight),
    keyLight: new Color(rain ? '#cad5da' : time.keyLight),
    sun: new Color(time.sun),
    hemisphere: time.hemisphere * (rain ? 0.82 : 1),
    key: time.key * (rain ? (night ? 0.52 : 0.34) : 1),
    environment: time.environment * (rain ? 0.68 : 1),
    near: rain ? 42 : time.near,
    far: rain ? (night ? 175 : 195) : time.far,
    sunPosition: new Vector3(...time.sunPosition).normalize(),
    lightPosition: new Vector3(...time.lightPosition),
    disc: rain ? 0 : time.disc,
  }
}

export type AtmospherePreset = ReturnType<typeof atmospherePreset>
