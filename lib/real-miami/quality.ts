/** Quality tiers for the real-Miami cruise. Auto-selected once; the visitor can override.
 * Tiers only gate optional cost (DPR ceiling, film grain/streak, crowd density, the
 * most expensive Director shots). Radio, cars, map and ads never depend on the tier. */
export type QualityTier = 'high' | 'medium' | 'low'
export type QualityChoice = QualityTier | 'auto'
import { cruiseLookEnabled } from '../cruise-os/look'
export const QUALITY_KEY = 'buena-onda:quality:v1'

export type QualityProfile = { tier: QualityTier; dpr: [number, number]; filmic: boolean; crowdDensity: number; directorTier: QualityTier }
export const QUALITY: Record<QualityTier, QualityProfile> = {
  high: { tier: 'high', dpr: [1, 1.25], filmic: true, crowdDensity: 1, directorTier: 'high' },
  medium: { tier: 'medium', dpr: [1, 1.25], filmic: true, crowdDensity: 1, directorTier: 'medium' },
  low: { tier: 'low', dpr: [1, 1], filmic: false, crowdDensity: .5, directorTier: 'low' },
}

/** Heuristic only: memory/cores/touch. Logged in diagnostics so measurements record the tier. */
export function detectTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'high'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const memory = nav.deviceMemory ?? 8, cores = nav.hardwareConcurrency || 8
  if (memory <= 3 || cores <= 4) return 'low'
  // The Look: phones start on the cheapest path (no post pass; CSS film layer). Choose Medium/High to step up.
  if (touch && cruiseLookEnabled()) return 'low'
  return touch ? 'medium' : 'high'
}

export function readChoice(): QualityChoice {
  try {
    const param = new URLSearchParams(location.search).get('quality')
    if (param === 'high' || param === 'medium' || param === 'low' || param === 'auto') return param
    const stored = localStorage.getItem(QUALITY_KEY)
    if (stored === 'high' || stored === 'medium' || stored === 'low') return stored
  } catch { /* storage may be unavailable; auto is fine */ }
  return 'auto'
}
export function saveChoice(choice: QualityChoice) {
  try { if (choice === 'auto') localStorage.removeItem(QUALITY_KEY); else localStorage.setItem(QUALITY_KEY, choice) } catch { /* ignore */ }
}
export function resolve(choice: QualityChoice): QualityProfile { return QUALITY[choice === 'auto' ? detectTier() : choice] }
