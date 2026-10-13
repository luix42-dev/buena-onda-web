import type { MiamiGeoData } from '@/lib/real-miami/miami-geo'

/** Coarse world-space building index (OSM footprints extruded to their height).
 * Used only for Director framing safety: camera-inside-building and line of sight
 * to the car. World coordinates: X east, Z south, Y up (handoff convention). */
type Footprint = { points: [number, number][]; height: number; minX: number; maxX: number; minZ: number; maxZ: number }
const CELL = 25

export class BuildingIndex {
  private grid = new Map<string, Footprint[]>()
  constructor(data: Pick<MiamiGeoData, 'buildings'>, raise: Map<string, number> = new Map()) {
    for (const b of data.buildings) {
      if (b.points.length < 3) continue
      const xs = b.points.map(p => p[0]), zs = b.points.map(p => p[1])
      const f: Footprint = { points: b.points, height: Math.max(3, b.height || 9, raise.get(String(b.id)) || 0), minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
      for (let gx = Math.floor(f.minX / CELL); gx <= Math.floor(f.maxX / CELL); gx++)
        for (let gz = Math.floor(f.minZ / CELL); gz <= Math.floor(f.maxZ / CELL); gz++) {
          const key = `${gx}:${gz}`
          if (!this.grid.has(key)) this.grid.set(key, [])
          this.grid.get(key)!.push(f)
        }
    }
  }
  /** True when a world point lies inside (or within `margin` metres of) a footprint, below its roof. */
  solid(x: number, y: number, z: number, margin = 0): boolean {
    const cell = this.grid.get(`${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`)
    if (!cell) return false
    for (const f of cell) {
      if (y > f.height + margin || x < f.minX - margin || x > f.maxX + margin || z < f.minZ - margin || z > f.maxZ + margin) continue
      if (inside(x, z, f.points)) return true
      if (margin > 0 && nearEdge(x, z, f.points, margin)) return true
    }
    return false
  }
  /** Samples the segment every `step` metres; endpoints excluded so the car body itself never blocks. */
  clear(ax: number, ay: number, az: number, bx: number, by: number, bz: number, step = 1.5): boolean {
    const length = Math.hypot(bx - ax, by - ay, bz - az), n = Math.max(2, Math.ceil(length / step))
    for (let i = 1; i < n - 1; i++) {
      const t = i / n
      if (this.solid(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t)) return false
    }
    return true
  }
}

function inside(x: number, z: number, points: [number, number][]) {
  let result = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], c = points[j]
    if ((a[1] > z) !== (c[1] > z) && x < (c[0] - a[0]) * (z - a[1]) / (c[1] - a[1]) + a[0]) result = !result
  }
  return result
}
function nearEdge(x: number, z: number, points: [number, number][], margin: number) {
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / Math.max(1e-4, dx * dx + dz * dz)))
    if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < margin) return true
  }
  return false
}
