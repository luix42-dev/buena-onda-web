import { QUALITY } from './constants'
import type { CruiseQuality } from './types'

export function initialQuality(): CruiseQuality {
  if (typeof window === 'undefined') return 'low'
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number }
  if (window.matchMedia('(pointer: coarse)').matches || (navigatorWithMemory.deviceMemory ?? 8) <= 4) return 'low'
  return (navigator.hardwareConcurrency ?? 4) >= 8 ? 'high' : 'medium'
}

export function qualityDpr(quality: CruiseQuality): number {
  return Math.min(window.devicePixelRatio || 1, QUALITY[quality].dpr)
}
