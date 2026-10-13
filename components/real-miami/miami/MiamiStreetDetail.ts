import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import registry from '../../../public/real-miami/miami/landmarks.json'
import type { MiamiData, MiamiPoint } from './MiamiWorld'

// Original procedural storefronts. Geographic footprints/road positions are
// OSM; these small facade and furniture details are art direction, not surveys.
type Layer = 'trim' | 'dark' | 'timber' | 'fabric' | 'foliage' | 'display' | 'sign'
type Cell = { group: T.Group; x: number; z: number; geometry: Record<Layer, T.BufferGeometry[]> }
const layers: Layer[] = ['trim', 'dark', 'timber', 'fabric', 'foliage', 'display', 'sign']
const rand = (n: number) => { const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v) }

function atlas(signs = false) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = signs ? 128 : 512
  const ctx = canvas.getContext('2d')!
  const labels = ['OCEAN CAFE', 'LOBBY / WELCOME', 'COASTAL DINING', 'ESPRESSO / GELATO']
  for (let i = 0; i < 4; i++) {
    const x = i * 256
    if (signs) {
      ctx.fillStyle = ['#183e3c', '#283a48', '#513c40', '#275044'][i]; ctx.fillRect(x, 0, 256, 128)
      ctx.strokeStyle = '#d1b981'; ctx.lineWidth = 2; ctx.strokeRect(x + 8, 8, 240, 112)
      ctx.fillStyle = '#eee4c8'; ctx.textAlign = 'center'; ctx.font = '600 21px sans-serif'
      const words = labels[i].split(' / ')
      words.forEach((word, line) => ctx.fillText(word, x + 128, words.length > 1 ? 46 + line * 28 : 60))
      ctx.font = '13px sans-serif'; ctx.fillText('MIAMI BEACH', x + 128, 101)
      continue
    }
    // Perspective floor, back wall, counter, lamps and shelving: varied
    // interior values instead of uniform glowing orange window rectangles.
    const grad = ctx.createLinearGradient(0, 0, 0, 512)
    grad.addColorStop(0, '#182b31'); grad.addColorStop(.55, ['#6d6654', '#526d6b', '#6b5352', '#536450'][i]); grad.addColorStop(1, '#202c32')
    ctx.fillStyle = grad; ctx.fillRect(x, 0, 256, 512)
    ctx.fillStyle = '#25353d'; ctx.beginPath(); ctx.moveTo(x, 512); ctx.lineTo(x + 58, 315); ctx.lineTo(x + 198, 315); ctx.lineTo(x + 256, 512); ctx.fill()
    ctx.strokeStyle = '#536263'; ctx.lineWidth = 2
    for (let j = 0; j < 7; j++) { ctx.beginPath(); ctx.moveTo(x + 128, 315); ctx.lineTo(x + j * 43, 512); ctx.stroke() }
    for (const y of [342, 378, 430, 490]) { ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 248, y); ctx.stroke() }
    ctx.fillStyle = '#24343a'; ctx.fillRect(x + 22, 155, 74, 132)
    ctx.fillStyle = '#cabca1'
    for (let s = 0; s < 3; s++) { ctx.fillRect(x + 20, 184 + s * 38, 80, 5); for (let b = 0; b < 5; b++) ctx.fillRect(x + 27 + b * 13, 165 + s * 38, 7, 18) }
    ctx.fillStyle = '#b49368'; ctx.fillRect(x + 130, 304, 110, 67); ctx.fillStyle = '#e4d4b3'; ctx.fillRect(x + 124, 299, 120, 10)
    for (let p = 0; p < 2; p++) {
      const px = x + 140 + p * 64
      ctx.strokeStyle = '#18242a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, 100 + p * 20); ctx.stroke()
      ctx.fillStyle = '#dfc99b'; ctx.beginPath(); ctx.ellipse(px, 115 + p * 20, 22, 12, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.fillStyle = 'rgba(139,186,197,.13)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 230, 512); ctx.lineTo(x + 185, 512); ctx.fill()
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4
  return texture
}

function nearest(p: MiamiPoint, segments: { a: MiamiPoint; b: MiamiPoint; width: number }[]) {
  let best = { distance: Infinity, x: 0, z: 0, width: 8 }
  for (const s of segments) {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1]
    const t = T.MathUtils.clamp(((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dz) / Math.max(.001, dx * dx + dz * dz), 0, 1)
    const x = s.a[0] + dx * t, z = s.a[1] + dz * t, distance = Math.hypot(p[0] - x, p[1] - z)
    if (distance < best.distance) best = { distance, x, z, width: s.width }
  }
  return best
}

export function createMiamiStreetDetail(data: MiamiData) {
  const group = new T.Group(); group.name = 'Miami original street detail'
  const cells = new Map<string, Cell>(), box = new T.BoxGeometry(1, 1, 1)
  const cylinder = new T.CylinderGeometry(1, 1, 1, 8), bush = new T.IcosahedronGeometry(1, 0)
  const panel = new T.PlaneGeometry(1, 1), matrix = new T.Matrix4(), rotation = new T.Quaternion()
  const displayMap = atlas(), signMap = atlas(true)
  const mats: Record<Layer, T.MeshStandardMaterial> = {
    trim: new T.MeshStandardMaterial({ color: '#ddd7c6', roughness: .66 }),
    dark: new T.MeshStandardMaterial({ color: '#27393d', roughness: .33, metalness: .32 }),
    timber: new T.MeshStandardMaterial({ color: '#9b7960', roughness: .78 }),
    fabric: new T.MeshStandardMaterial({ color: 'white', vertexColors: true, roughness: .95 }),
    foliage: new T.MeshStandardMaterial({ color: '#41664c', roughness: .95 }),
    display: new T.MeshStandardMaterial({ map: displayMap, emissiveMap: displayMap, emissive: 'white', emissiveIntensity: .22, roughness: .28 }),
    sign: new T.MeshStandardMaterial({ map: signMap, emissiveMap: signMap, emissive: 'white', emissiveIntensity: .28, roughness: .65 }),
  }
  const roads = data.roads.filter(r => !['footway', 'path', 'cycleway', 'steps'].includes(r.type || '')).flatMap(r => r.points.slice(1).map((b, i) => ({ a: r.points[i], b, width: r.width || 8 })))
  const ocean = data.roads.filter(r => r.name === 'Ocean Drive').flatMap(r => r.points.slice(1).map((b, i) => ({ a: r.points[i], b, width: r.width || 8 })))
  const landmarkIds = new Set(registry.landmarks.map(l => String(l.osmBuildingId)))
  let storefrontCount = 0, furnitureCount = 0
  const cellAt = (x: number, z: number) => {
    const cx = Math.floor(x / 100), cz = Math.floor(z / 100), key = `${cx}:${cz}`
    let cell = cells.get(key)
    if (!cell) { const g = new T.Group(); g.visible = false; group.add(g); cell = { group: g, x: (cx + .5) * 100, z: (cz + .5) * 100, geometry: { trim: [], dark: [], timber: [], fabric: [], foliage: [], display: [], sign: [] } }; cells.set(key, cell) }
    return cell
  }
  const add = (cell: Cell, layer: Layer, source: T.BufferGeometry, x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw: number, variant = 0) => {
    const geo = source.clone()
    if (layer === 'display' || layer === 'sign') {
      const uv = geo.getAttribute('uv')
      for (let i = 0; i < uv.count; i++) uv.setX(i, (variant % 4 + uv.getX(i) * .98 + .01) / 4)
    }
    if (layer === 'fabric') {
      const color = new T.Color(['#587f78', '#b89b78', '#a97676', '#667c91'][variant % 4]), colors = new Float32Array(geo.getAttribute('position').count * 3)
      for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b }
      geo.setAttribute('color', new T.BufferAttribute(colors, 3))
    }
    rotation.setFromAxisAngle(new T.Vector3(0, 1, 0), yaw)
    matrix.compose(new T.Vector3(x, y, z), rotation, new T.Vector3(sx, sy, sz)); geo.applyMatrix4(matrix)
    cell.geometry[layer].push(geo)
  }
  for (const building of data.buildings) {
    if (landmarkIds.has(String(building.id)) || building.points.length < 3 || building.height > 35) continue
    const pts = building.points, area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1] }, 0)
    const seed = Number(building.id) || 1
    for (let e = 0; e < pts.length; e++) {
      const a = pts[e], b = pts[(e + 1) % pts.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz)
      if (len < 7) continue
      const cx = (a[0] + b[0]) * .5, cz = (a[1] + b[1]) * .5, road = nearest([cx, cz], ocean)
      if (road.distance > 60) continue
      const nx = (area > 0 ? dz : -dz) / len, nz = (area > 0 ? -dx : dx) / len
      if (nx * (road.x - cx) + nz * (road.z - cz) < road.distance * .55) continue
      const yaw = Math.atan2(nx, nz), tx = nz, tz = -nx
      const local = (u: number, v: number) => [cx + tx * u + nx * v, cz + tz * u + nz * v] as const
      const cell = cellAt(cx, cz), variant = Math.floor(rand(seed + e) * 4)
      const put = (layer: Layer, u: number, y: number, v: number, w: number, h: number, depth: number, source: T.BufferGeometry = box) => {
        const [x, z] = local(u, v); add(cell, layer, source, x, y, z, w, h, depth, yaw, variant)
      }
      // A full-height articulated shopfront covers the older flush warm pane.
      // Recessed display face is behind 35cm projecting reveal frames.
      const bays = Math.max(1, Math.floor(len / 4.2)), spacing = (len - .7) / bays
      for (let bay = 0; bay < bays; bay++) {
        const u = -.5 * (len - .7) + spacing * (bay + .5), w = Math.min(3.25, spacing - .35)
        put('dark', u, 1.55, .19, w + .28, 2.7, .18)
        put('display', u, 1.58, .3, w, 2.3, 1, panel)
        for (const s of [-1, 1]) put('trim', u + s * (w / 2 + .07), 1.52, .38, .15, 2.7, .35)
        put('trim', u, .22, .4, w + .3, .19, .46); put('trim', u, 2.88, .41, w + .3, .16, .5)
        put('dark', u, 1.58, .43, .045, 2.35, .08)
        // Entry bay has a physical door, transom, brass-colored handle and step.
        if (bay === 0) { put('dark', u, 1.36, .5, .065, 2.18, .08); put('timber', u + .28, 1.25, .56, .025, .35, .045); put('trim', u, .1, .6, w + .3, .14, .7) }
        // Separate projecting canopy and valance produce cockpit-visible depth.
        const awning = .8 + rand(seed + bay * 3) * .4
        put('fabric', u, 3.04, .48 + awning * .5, w + .6, .12, awning)
        put('fabric', u, 2.89, .48 + awning, w + .6, .24, .07)
        put('dark', u, 2.98, .48 + awning, w + .66, .045, .08)
        put('sign', u, 3.53, .32, Math.min(w, 2.85), .52, 1, panel)
        storefrontCount++
      }
      // Eyebrows and vertical ribs give the ground floor Art Deco proportion.
      put('trim', 0, 4.05, .38, len, .16, .6)
      for (let u = -len * .5 + .2; u < len * .5; u += 4.8) {
        put('trim', u, 2.06, .28, .21, 3.7, .42)
        for (let rib = 0; rib < 3; rib++) put('trim', u + .12 + rib * .11, 3.82, .43, .055, .6, .12)
      }
      // Only place furniture in a mapped sidewalk strip. Test all drivable
      // roads, including cross streets, not just Ocean Drive centerlines.
      for (const u of [-len * .3, len * .3]) {
        const offset = 1.3, [x, z] = local(u, offset), clearance = nearest([x, z], roads)
        if (clearance.distance < clearance.width * .5 + .85 || clearance.distance > clearance.width * .5 + 1.3) continue
        const safe = (du: number, dv: number, radius: number) => {
          const p = local(u + du, offset + dv)
          return roads.every(segment => nearest([p[0], p[1]], [segment]).distance > segment.width * .5 + radius + .18)
        }
        if (!safe(0, 0, .46)) continue
        put('timber', u, .28, offset, .85, .54, .6)
        put('dark', u, .54, offset, .91, .07, .66)
        put('foliage', u, .85, offset, .5, .5, .38, bush)
        furnitureCount++
        if (!safe(1.5, 0, .7) || !safe(1.5, .52, .28)) continue
        put('timber', u + 1.5, .78, offset, .42, .065, .42, cylinder)
        put('dark', u + 1.5, .4, offset, .035, .72, .035)
        for (const du of [-.5, .5]) {
          put('timber', u + 1.5 + du, .44, offset, .34, .06, .34)
          put('dark', u + 1.5 + du, .72, offset - .14, .35, .45, .04)
          for (const leg of [-.13, .13]) put('dark', u + 1.5 + du + leg, .22, offset, .026, .4, .026)
        }
        furnitureCount += 3
      }
    }
  }
  for (const cell of cells.values()) {
    for (const layer of layers) {
      const list = cell.geometry[layer]
      if (!list.length) continue
      const geo = mergeGeometries(list, false)
      list.forEach(g => g.dispose()); list.length = 0
      if (geo) { geo.computeBoundingSphere(); const mesh = new T.Mesh(geo, mats[layer]); mesh.castShadow = false; mesh.receiveShadow = true; cell.group.add(mesh) }
    }
  }
  group.userData = { storefrontCount, furnitureCount, cellCount: cells.size, source: 'Original procedural detail on OSM facade edges', maxExtraDrawCalls: 28 }
  return {
    group,
    update(x: number, z: number, darkness: number) {
      const active = [...cells.values()].filter(c => Math.hypot(c.x - x, c.z - z) < 230).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)).slice(0, 4)
      const visible = new Set(active)
      for (const cell of cells.values()) cell.group.visible = visible.has(cell)
      mats.display.emissiveIntensity = .1 + T.MathUtils.clamp(darkness, 0, 1) * .34
      mats.sign.emissiveIntensity = .12 + T.MathUtils.clamp(darkness, 0, 1) * .48
    },
    dispose() {
      group.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose() })
      Object.values(mats).forEach(m => m.dispose()); displayMap.dispose(); signMap.dispose()
      box.dispose(); cylinder.dispose(); bush.dispose(); panel.dispose(); group.clear()
    },
  }
}
