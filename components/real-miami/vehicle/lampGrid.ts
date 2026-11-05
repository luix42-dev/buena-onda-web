/** World-space light registry (50 m cells) so the night paint can mirror the real poles and screens.
 * Worlds register as they build; positions are absolute world metres, deduplicated per source.
 * Each entry is x, y, z, rgb (0xRRGGBB), intensity. */
const CELL = 50, STRIDE = 5
const cells = new Map<string, number[]>(), seen = new Set<string>()
export const LAMP_STRIDE = STRIDE
export function registerLamp(x: number, y: number, z: number, rgb = 0xffb15c, intensity = 1) {
  const id = `${Math.round(x * 4)},${Math.round(y * 4)},${Math.round(z * 4)}`
  if (seen.has(id)) return
  seen.add(id)
  const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`
  let cell = cells.get(key); if (!cell) cells.set(key, cell = [])
  cell.push(x, y, z, rgb, intensity)
}
/** Sources within ~radius of (x, z), appended to `out` as flat STRIDE-sized records. */
export function lampsNear(x: number, z: number, radius: number, out: number[]) {
  out.length = 0
  const r = Math.ceil(radius / CELL), cx = Math.floor(x / CELL), cz = Math.floor(z / CELL)
  for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { const cell = cells.get(`${cx + i},${cz + j}`); if (cell) for (const v of cell) out.push(v) }
  return out
}
