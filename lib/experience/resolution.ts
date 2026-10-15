/** Rendering quality only. Music, DOM controls and station choice are independent. */
export function nextSceneryDpr(current: number, fps: number, ceiling: number): number {
  const max = Math.max(.6, Math.min(1.25, Number.isFinite(ceiling) ? ceiling : 1))
  const value = Math.max(.6, Math.min(max, Number.isFinite(current) ? current : max))
  if (!Number.isFinite(fps) || fps <= 0) return value
  if (fps < 32) return Math.max(.6, Math.round(value * .82 * 100) / 100)
  if (fps < 42) return Math.max(.6, Math.round(value * .92 * 100) / 100)
  if (fps > 58) return Math.min(max, Math.round((value + .04) * 100) / 100)
  return value
}
