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

/** GPU class from the unmasked renderer string, read once from a throwaway context. Integrated laptop GPUs
 * were landing on High (12 cores and 16 GB say nothing about the GPU): an Intel UHD 630 ran Retrowave at 7 fps. */
let gpuClass: 'weak' | 'integrated' | 'capable' | null = null
export function detectGpuClass(): 'weak' | 'integrated' | 'capable' {
  if (gpuClass) return gpuClass
  gpuClass = 'capable'
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl')
    if (!gl) return gpuClass = 'weak'
    const info = gl.getExtension('WEBGL_debug_renderer_info'), name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    if (/swiftshader|llvmpipe|software|basic render|mali-[gt][0-9]{2}\b|adreno \(tm\) [3-5]\d\d|powervr|intel\(r\) (hd|uhd) graphics|intel hd|gma/i.test(name)) gpuClass = 'weak'
    else if (/intel|iris|radeon\(tm\) graphics|radeon graphics|vega \d|apple gpu|mali|adreno/i.test(name)) gpuClass = 'integrated'
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { /* unknown GPU: keep the memory/core heuristic */ }
  return gpuClass
}

/** Heuristic: memory/cores/touch, then GPU class. Logged in diagnostics so measurements record the tier. */
export function detectTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'high'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const memory = nav.deviceMemory ?? 8, cores = nav.hardwareConcurrency || 8
  if (memory <= 3 || cores <= 4) return 'low'
  // The Look: phones start on the cheapest path (no post pass; CSS film layer). Choose Medium/High to step up.
  if (touch && cruiseLookEnabled()) return 'low'
  const gpu = detectGpuClass()
  if (gpu === 'weak') return 'low'
  if (gpu === 'integrated' || touch) return 'medium'
  return 'high'
}

/** Auto mode only: a tier lower than detected, after the scenery resolution is already at its floor. */
export function stepDown(profile: QualityProfile, steps: number): QualityProfile {
  const order: QualityTier[] = ['high', 'medium', 'low']
  return QUALITY[order[Math.min(order.length - 1, order.indexOf(profile.tier) + Math.max(0, steps))]]
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
