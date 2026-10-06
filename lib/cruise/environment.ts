import type { CruiseTimeMode, CruiseTimeOfDay } from './types'

export const MIAMI_TIME_ZONE = 'America/New_York'

const MIAMI_HOUR = new Intl.DateTimeFormat('en-US', {
  timeZone: MIAMI_TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
})

export function miamiHour(date: Date): number {
  const hour = MIAMI_HOUR.formatToParts(date).find(part => part.type === 'hour')?.value
  return Number.parseInt(hour ?? '0', 10)
}

export function timeOfDayAtMiamiHour(hour: number): CruiseTimeOfDay {
  const normalized = ((Math.trunc(hour) % 24) + 24) % 24
  if (normalized >= 7 && normalized < 17) return 'day'
  if (normalized >= 17 && normalized < 20) return 'sunset'
  return 'night'
}

export function resolveCruiseTime(mode: CruiseTimeMode, date = new Date()): CruiseTimeOfDay {
  return mode === 'auto' ? timeOfDayAtMiamiHour(miamiHour(date)) : mode
}
