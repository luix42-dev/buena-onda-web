'use client'

import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { NightState } from '../nightdrive/state'
import { roadRandom } from '../nightdrive/road'
import { pulse } from '../master/pulse'
import { glowTex } from '../master/cockpit/textures'
import landmarkRegistry from '../../../public/real-miami/miami/landmarks.json'
import { createMiamiLandmark, type LandmarkConfig } from './MiamiLandmarks'
import { wetAsphaltTexture } from './wetAsphalt'
import { applyOceanDriveFacade, streetNight } from './paintedPlaster'
import { createMiamiStreetDetail } from './MiamiStreetDetail'
import { roomWindowTexture, palmLeafTexture } from './streetDetailTextures'

export type MiamiPoint = [number, number]
export type MiamiData = {
  roads: { id: number | string; name?: string; type?: string; width: number; points: MiamiPoint[] }[]
  buildings: { id: number | string; name?: string; height: number; levels?: number | null; points: MiamiPoint[] }[]
  land: { id: number | string; type: string; points: MiamiPoint[] }[]
  advertisingPlots?: { id: string; x: number; z: number; yaw?: number; roadId?: number | string; campaign?: string }[]
}
export type MiamiRoute = { sample: (distance: number) => { x: number; y: number; z: number; yaw: number } }
type StreetSurfaces = { plasterColor: T.Texture; plasterNormal: T.Texture; plasterRoughness: T.Texture; pavementColor: T.Texture; pavementNormal: T.Texture; pavementRoughness: T.Texture }
const CELL = 250
const PASTELS = ['#f2c4c8', '#bfe2d4', '#f3e1a4', '#cec3e5', '#b8dbe9', '#f5d0ad', '#eef0e4', '#f6d9e4']
const temp = new T.Object3D()
type Placement = { p: number[]; s: number[]; yaw?: number; tint?: string }
type Cell = { group: T.Group; x: number; z: number; detail: T.Group; built: boolean; windows?: T.InstancedMesh; paneLod?: boolean }

// The geographic footprint is never replaced with a generated bounding rectangle.
function polygon(points: MiamiPoint[], height: number): T.BufferGeometry | null {
  if (points.length < 3) return null
  const shape = new T.Shape(points.map(([x, z]) => new T.Vector2(x, -z)))
  const geo = height > 0
    ? new T.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 })
    : new T.ShapeGeometry(shape)
  geo.rotateX(-Math.PI / 2)
  return geo
}
function ribbon(points: MiamiPoint[], width: number, lift: number) {
  if (points.length < 2) return null
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  let distance = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)]
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1
    if (i) distance += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    for (const sign of [-1, 1]) {
      positions.push(points[i][0] - dz / len * width * .5 * sign, lift, points[i][1] + dx / len * width * .5 * sign)
      uv.push(sign < 0 ? 0 : width / 2.1, distance / 2.1)
    }
    if (i < points.length - 1) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2) }
  }
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals()
  return geo
}
function merged(group: T.Group, geos: T.BufferGeometry[], material: T.Material) {
  if (!geos.length) return
  // Flatten first: ShapeGeometry and ExtrudeGeometry differ in indexed layout.
  const normalized = geos.map(g => g.index ? g.toNonIndexed() : g)
  const geometry = mergeGeometries(normalized, false)
  geos.forEach(g => g.dispose()); normalized.forEach(g => g.dispose())
  if (geometry) group.add(new T.Mesh(geometry, material))
}
function instances(group: T.Group, geometry: T.BufferGeometry, material: T.Material, placements: Placement[]) {
  if (!placements.length) return
  const mesh = new T.InstancedMesh(geometry, material, placements.length)
  placements.forEach((v, i) => {
    temp.position.set(v.p[0], v.p[1], v.p[2]); temp.scale.set(v.s[0], v.s[1], v.s[2]); temp.rotation.set(0, v.yaw || 0, 0)
    temp.updateMatrix(); mesh.setMatrixAt(i, temp.matrix)
    if (v.tint) mesh.setColorAt(i, new T.Color(v.tint))
  })
  mesh.computeBoundingSphere(); group.add(mesh)
  return mesh
}
function center(points: MiamiPoint[]) {
  const n = points.length || 1
  return points.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0])
}

function curvedFrond() {
  const positions: number[] = [], indices: number[] = [], uv: number[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, x = -.8 + 2.2 * t, y = Math.sin(t * Math.PI) * .18 - t * t * .48
    const width = Math.pow(Math.sin(t * Math.PI), .8) * .5 * (i % 2 ? .82 : 1)
    positions.push(x, y, -width, x, y + .055, 0, x, y, width)
    uv.push(t, 0, t, .5, t, 1)
    if (i < 8) { const a = i * 3; indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4) }
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals()
  return geo
}

// Signed footprint winding orients +z outwards. The far pane preserves the
// same recessed glass/color dimensions, omitting the subpixel dark frame.
function framedWindow(paneOnly = false) {
  const positions: number[] = [], colors: number[] = [], uv: number[] = []
  const quad = (x0: number, y0: number, x1: number, y1: number, z: number, brightness: number, side: number) => {
    const points = [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]
    const order = side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    order.forEach(i => { positions.push(...points[i]); colors.push(brightness, brightness, brightness); uv.push(points[i][0] + .5, points[i][1] + .5) })
  }
  quad(-.42, -.42, .42, .42, .16, .9, 1)
  if (!paneOnly) {
    quad(-.5, -.5, -.42, .5, .5, .2, 1); quad(.42, -.5, .5, .5, .5, .2, 1)
    quad(-.42, -.5, .42, -.42, .5, .24, 1); quad(-.42, .42, .42, .5, .5, .24, 1)
    quad(-.018, -.42, .018, .42, .51, .16, 1)
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals()
  return geo
}

function stuccoTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!, pixels = ctx.createImageData(128, 128)
  for (let i = 0; i < 128 * 128; i++) {
    const value = Math.round(213 + (roadRandom(i, 7283) - .5) * 34)
    pixels.data.set([value, value, value, 255], i * 4)
  }
  ctx.putImageData(pixels, 0, 0)
  const texture = new T.CanvasTexture(canvas); texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(.12, .12); texture.anisotropy = 4
  return texture
}

function pointSegmentDistance(p: number[], a: MiamiPoint, b: MiamiPoint) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / Math.max(.01, dx * dx + dz * dz)))
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t)
}

function createWorld(data: MiamiData, asphaltSource: T.Texture, trafficSource: T.Group, surfaces: StreetSurfaces) {
  const group = new T.Group(), cells = new Map<string, Cell>()
  const landmarkConfigs = landmarkRegistry.landmarks as unknown as LandmarkConfig[]
  const landmarkAssets = new Map<string, ReturnType<typeof createMiamiLandmark>>()
  if (new URLSearchParams(globalThis.window.location.search).get('landmarks') !== 'off') {
    for (const config of landmarkConfigs) {
      const building = data.buildings.find(b => String(b.id) === String(config.osmBuildingId))
      if (building) {
        const roomExperiment = window.location.pathname === '/cruise/os' && new URLSearchParams(window.location.search).get('visual') === 'rooms' && config.kind === 'colony'
        const asset = createMiamiLandmark(building, config, surfaces, roomExperiment)
        landmarkAssets.set(String(building.id), asset); group.add(asset.group)
      }
    }
  }
  const geometries: T.BufferGeometry[] = [], textures: T.Texture[] = []
  const cone = new T.ConeGeometry(1, 1, 8, 1, true), box = new T.BoxGeometry(1, 1, 1), trunk = new T.CylinderGeometry(.14, .2, 1, 6), leaf = curvedFrond(), frameGeometry = framedWindow(), paneGeometry = framedWindow(true)
  const fullWindowDetail = new URLSearchParams(globalThis.window.location.search).get('windowLod') === 'full'
  // Lamps share the window material; give their box a white vertex tint so the
  // framed-window color attribute cannot leave lamp attributes unspecified.
  box.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(box.getAttribute('position').count * 3).fill(1), 3))
  geometries.push(cone, box, trunk, leaf, frameGeometry, paneGeometry)
  const landmarkSpots = (landmarkRegistry.landmarks as unknown as { streetFacing: { edge: number[][] } }[]).map(l => [(l.streetFacing.edge[0][0] + l.streetFacing.edge[1][0]) / 2, (l.streetFacing.edge[0][1] + l.streetFacing.edge[1][1]) / 2])
  const asphalt = asphaltSource.clone(); asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping
  asphalt.anisotropy = 4; asphalt.needsUpdate = true; textures.push(asphalt)
  const glow = glowTex(); textures.push(glow)
  const wetness = wetAsphaltTexture(); textures.push(wetness)
  const roomMap = roomWindowTexture(), leafMap = palmLeafTexture(); textures.push(roomMap, leafMap)
  const surfaceMap = (source: T.Texture, color: boolean, repeat: number) => { const map = source.clone(); map.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(repeat, repeat); map.anisotropy = 4; map.needsUpdate = true; textures.push(map); return map }
  const plasterMap = surfaceMap(surfaces.plasterColor, true, .4), plasterNormal = surfaceMap(surfaces.plasterNormal, false, .4), plasterRough = surfaceMap(surfaces.plasterRoughness, false, .4)
  const pavementMap = surfaceMap(surfaces.pavementColor, true, 1), pavementNormal = surfaceMap(surfaces.pavementNormal, false, 1), pavementRough = surfaceMap(surfaces.pavementRoughness, false, 1)
  const oceanSegments = data.roads.filter(r => r.name === 'Ocean Drive').flatMap(r => r.points.slice(1).map((b, i) => [r.points[i], b] as const))
  const mats = {
    road: new T.MeshStandardMaterial({ color: '#89949c', map: asphalt, roughness: .84, side: T.DoubleSide }),
    sidewalk: new T.MeshStandardMaterial({ color: '#bab5a4', map: pavementMap, normalMap: pavementNormal, normalScale: new T.Vector2(.35, .35), roughnessMap: pavementRough, roughness: .92, side: T.DoubleSide }),
    curb: new T.MeshStandardMaterial({ color: '#b5b3a5', roughness: .87 }),
    building: new T.MeshStandardMaterial({ vertexColors: true, color: 'white', map: plasterMap, normalMap: plasterNormal, normalScale: new T.Vector2(.25, .25), roughness: .94, roughnessMap: plasterRough }),
    windows: new T.MeshStandardMaterial({ vertexColors: true, color: '#d6ded5', map: roomMap, emissiveMap: roomMap, emissive: '#ffffff', emissiveIntensity: .65, roughness: .22, metalness: .08 }),
    lamps: new T.MeshStandardMaterial({ color: '#fff1cf', emissive: '#ffd399', emissiveIntensity: 1.4, toneMapped: false }),
    deco: new T.MeshStandardMaterial({ color: '#d9d6c4', roughness: .75 }),
    neon: new T.MeshStandardMaterial({ color: '#73dbcb', emissive: '#65dacb', emissiveIntensity: .7, toneMapped: false }),
    poles: new T.MeshStandardMaterial({ color: '#686e73', roughness: .7 }),
    trunks: new T.MeshStandardMaterial({ color: '#847061', roughness: 1 }),
    leaves: new T.MeshStandardMaterial({ color: '#b4c69b', map: leafMap, alphaTest: .32, roughness: .8, side: T.DoubleSide }),
    marks: new T.MeshBasicMaterial({ color: '#d8c797', side: T.DoubleSide }),
    ground: new T.MeshStandardMaterial({ color: '#486952', roughness: 1, side: T.DoubleSide }),
    land: new T.MeshStandardMaterial({ color: '#626663', roughness: 1, side: T.DoubleSide }),
    beach: new T.MeshStandardMaterial({ color: '#c5ab89', roughness: 1, side: T.DoubleSide }),
    water: new T.MeshStandardMaterial({ color: '#163b51', roughness: .38, metalness: .18, side: T.DoubleSide }),
    umbrellas: new T.MeshStandardMaterial({ color: 'white', roughness: .85, side: T.DoubleSide }),
    uplights: new T.MeshBasicMaterial({ color: '#ffcf8a', map: glow, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    pools: new T.MeshBasicMaterial({ color: '#ffc77c', map: glow, transparent: true, opacity: .13, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
  }
  applyOceanDriveFacade(mats.building, streetNight)
  mats.windows.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif')
  }
  const adMaterials: T.Material[] = []
  const getCell = (p: number[]) => {
    const x = Math.floor(p[0] / CELL), z = Math.floor(p[1] / CELL), key = `${x}:${z}`
    if (!cells.has(key)) { const g = new T.Group(), detail = new T.Group(); g.add(detail); group.add(g); cells.set(key, { group: g, detail, x: (x + .5) * CELL, z: (z + .5) * CELL, built: false }) }
    return cells.get(key)!
  }
  type Palm = { x: number; z: number; height: number; crown: number; yaw: number; uplit?: boolean }
  type Contents = { roads: typeof data.roads; buildings: typeof data.buildings; palms: Palm[] }
  const contents = new Map<Cell, Contents>()
  const forCell = (p: number[]) => { const cell = getCell(p); if (!contents.has(cell)) contents.set(cell, { roads: [], buildings: [], palms: [] }); return contents.get(cell)! }
  data.buildings.forEach(b => forCell(center(b.points)).buildings.push(b))
  // Split ways into centerline segments before bucketing; a long OSM way cannot
  // disappear simply because its far-away centroid is outside the streaming radius.
  data.roads.forEach(r => { for (let i = 1; i < r.points.length; i++) {
    const points = [r.points[i - 1], r.points[i]]
    forCell(center(points)).roads.push({ ...r, points })
  } })
  // Decorations follow cumulative distance along a complete OSM way. Restarting
  // a palm row on every short centerline segment produced dense, uniform trees.
  const junctionDegrees = new Map<string, number>(), junctionPoints = new Map<string, MiamiPoint>()
  const pointKey = (p: MiamiPoint) => `${p[0].toFixed(1)}:${p[1].toFixed(1)}`
  const vehicleRoad = (type?: string) => !['footway', 'path', 'cycleway', 'steps', 'pedestrian', 'track'].includes(type || '')
  data.roads.filter(r => vehicleRoad(r.type)).forEach(r => {
    for (let i = 1; i < r.points.length; i++) for (const p of [r.points[i - 1], r.points[i]]) {
      const key = pointKey(p); junctionDegrees.set(key, (junctionDegrees.get(key) || 0) + 1); junctionPoints.set(key, p)
    }
  })
  const junctions = Array.from(junctionPoints.entries()).filter(([key]) => (junctionDegrees.get(key) || 0) >= 3).map(([, p]) => p)
  const buildingBounds = data.buildings.map(b => ({ points: b.points, minX: Math.min(...b.points.map(p => p[0])), maxX: Math.max(...b.points.map(p => p[0])), minZ: Math.min(...b.points.map(p => p[1])), maxZ: Math.max(...b.points.map(p => p[1])) }))
  const clearsBuildings = (p: MiamiPoint) => !buildingBounds.some(b => {
    if (p[0] < b.minX - 2 || p[0] > b.maxX + 2 || p[1] < b.minZ - 2 || p[1] > b.maxZ + 2) return false
    let inside = false
    for (let i = 0, j = b.points.length - 1; i < b.points.length; j = i++) {
      const a = b.points[i], c = b.points[j]
      if ((a[1] > p[1]) !== (c[1] > p[1]) && p[0] < (c[0] - a[0]) * (p[1] - a[1]) / (c[1] - a[1]) + a[0]) inside = !inside
      if (pointSegmentDistance(p, a, c) < 2) return true
    }
    return inside
  })
  data.roads.forEach(r => {
    if (!vehicleRoad(r.type) || ['service', 'motorway', 'motorway_link'].includes(r.type || '')) return
    const promenade = r.name === 'Ocean Drive', seed = Number(r.id) || 1984
    // Keep the promenade recognizable; selected other named streets get sparse
    // single trees rather than matching avenues of palms on both sides.
    if (!promenade && (!r.name || roadRandom(seed, 811) > .35)) return
    let station = 20 + roadRandom(seed, 913) * 27, distance = 0, tree = 0
    for (let i = 1; i < r.points.length; i++) {
      const a = r.points[i - 1], b = r.points[i], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz)
      while (station < distance + len) {
        const along = station - distance, t = along / Math.max(.01, len)
        const x = a[0] + dx * t, z = a[1] + dz * t
        // Ocean Drive's park promenade lies east; use its east sidewalk. Other
        // roads choose one varying side, leaving intersections and facades clear.
        const side = promenade ? (dz < 0 ? 1 : -1) : roadRandom(seed + tree, 622) < .5 ? 1 : -1
        const setback = (r.width || 8) / 2 + 3.1 + roadRandom(seed + tree, 177) * 1.2
        const p: MiamiPoint = [x - dz / Math.max(.01, len) * setback * side, z + dx / Math.max(.01, len) * setback * side]
        if (!junctions.some(j => Math.hypot(j[0] - x, j[1] - z) < 14) && clearsBuildings(p)) {
          forCell(p).palms.push({ x: p[0], z: p[1], height: 6.9 + roadRandom(seed + tree, 155) * 2.8, crown: .84 + roadRandom(seed + tree, 933) * .3, yaw: roadRandom(seed + tree, 442) * Math.PI * 2, uplit: promenade })
        }
        station += promenade ? 48 + roadRandom(seed + tree, 254) * 30 : 95 + roadRandom(seed + tree, 254) * 55
        tree++
      }
      distance += len
    }
  })
  // Geography polygons stay in one static draw group. Data supplies real coast /
  // beach / park shapes; no synthetic coast is inferred from the cruising path.
  const landGroup = new T.Group(); group.add(landGroup)
  const waterGeo = new T.PlaneGeometry(10000, 10000); waterGeo.rotateX(-Math.PI / 2)
  const water = new T.Mesh(waterGeo, mats.water); water.position.y = -.18; landGroup.add(water); geometries.push(waterGeo)
  for (const [type, material] of [['beach', mats.beach], ['park', mats.ground], ['land', mats.land], ['water', mats.water]] as const) {
    const geos = data.land.filter(p => p.type === type || (type === 'land' && p.type === 'island'))
      .map(p => polygon(p.points, 0)).filter((g): g is T.BufferGeometry => !!g)
    geos.forEach(g => g.translate(0, type === 'land' ? -.025 : type === 'water' ? -.16 : .002, 0))
    merged(landGroup, geos, material)
  }
  const buildCell = (cell: Cell) => {
    const content = contents.get(cell); if (!content || cell.built) return
    const started = performance.now()
    const roads: T.BufferGeometry[] = [], sidewalks: T.BufferGeometry[] = [], bodies: T.BufferGeometry[] = []
    const tables: Placement[] = [], umbrellas: Placement[] = [], uplights: Placement[] = [], promenadePoles: Placement[] = [], promenadeLamps: Placement[] = []
    const windows: Placement[] = [], bands: Placement[] = [], neons: Placement[] = [], trunks: Placement[] = [], fronds: Placement[] = [], poles: Placement[] = [], lamps: Placement[] = [], marks: Placement[] = [], pools: Placement[] = [], curbs: Placement[] = []
    content.roads.forEach(r => {
      const width = r.width || 8, road = ribbon(r.points, width, .025)
      if (road) roads.push(road)
      if (['footway', 'path', 'cycleway', 'steps'].includes(r.type || '')) {
        const walk = ribbon(r.points, width + 3.6, .012)
        if (walk) sidewalks.push(walk)
      } else for (let i = 1; i < r.points.length; i++) {
        const start = r.points[i - 1], end = r.points[i], sx = end[0] - start[0], sz = end[1] - start[1], length = Math.hypot(sx, sz)
        if (length < .5) continue
        const trimStart = junctions.some(j => Math.hypot(j[0] - start[0], j[1] - start[1]) < 1.5) ? Math.min(width / 2 + 2, length * .4) : 0
        const trimEnd = junctions.some(j => Math.hypot(j[0] - end[0], j[1] - end[1]) < 1.5) ? Math.min(width / 2 + 2, length * .4) : 0
        for (const side of [-1, 1]) {
          const nx = -sz / length * side, nz = sx / length * side
          const a: MiamiPoint = [start[0] + sx / length * trimStart + nx * (width / 2 + .95), start[1] + sz / length * trimStart + nz * (width / 2 + .95)]
          const b: MiamiPoint = [end[0] - sx / length * trimEnd + nx * (width / 2 + .95), end[1] - sz / length * trimEnd + nz * (width / 2 + .95)]
          const walk = ribbon([a, b], 1.8, .16)
          if (walk) sidewalks.push(walk)
          curbs.push({ p: [(a[0] + b[0]) / 2 - nx * .85, .09, (a[1] + b[1]) / 2 - nz * .85], s: [length - trimStart - trimEnd, .18, .18], yaw: Math.atan2(-sz, sx) })
        }
      }
      const a = r.points[0], b = r.points[1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx)
      // Place repeated details on each *real* street, independent of the selected route.
      if (['footway', 'path', 'cycleway', 'steps'].includes(r.type || '')) return
      for (let s = 8; s < len; s += 30) {
        const x = a[0] + dx * s / len, z = a[1] + dz * s / len
        for (const side of [-1, 1]) {
          const px = x - dz / len * (width / 2 + 1.3) * side, pz = z + dx / len * (width / 2 + 1.3) * side
          poles.push({ p: [px, 3.6, pz], s: [.1, 7.2, .1] }); lamps.push({ p: [px, 7.22, pz], s: [.6, .12, .45] })
          pools.push({ p: [x - dz / len * width * .25 * side, .044, z + dx / len * width * .25 * side], s: [6.5, 1, 10], yaw: yaw + Math.PI / 2 })
        }
      }
      if (width >= 6) for (let s = 3; s < len; s += 6) marks.push({ p: [a[0] + dx * s / len, .038, a[1] + dz * s / len], s: [2.7, .012, .11], yaw })
      if (r.name === 'Ocean Drive') {
        // Look Bible G4/G5: cafe tables under pastel umbrellas on the hotel (west) side,
        // and lamp posts along the Lummus Park promenade (east side, ~20 m out).
        const ex = -dz / len, ez = dx / len, east = ex >= 0 ? 1 : -1
        for (let s = 4; s < len - 2; s += 9) {
          const x = a[0] + dx * s / len, z = a[1] + dz * s / len, seedT = Number(r.id) * 31 + Math.floor(s)
          const tx = x - ex * east * (width / 2 + 4.3), tz = z - ez * east * (width / 2 + 4.3)
          if (!landmarkSpots.some(([lx, lz]) => Math.hypot(lx - tx, lz - tz) < 16) && clearsBuildings([tx, tz])) {
            tables.push({ p: [tx, .74, tz], s: [.8, .05, .8], yaw }, { p: [tx, .37, tz], s: [.07, .74, .07], yaw })
            umbrellas.push({ p: [tx, 2.25, tz], s: [1.35, .45, 1.35], tint: PASTELS[Math.floor(roadRandom(seedT, 77) * PASTELS.length)] })
            tables.push({ p: [tx, 1.15, tz], s: [.045, 2.1, .045], yaw })
          }
        }
        for (let s = 10; s < len; s += 26) {
          const x = a[0] + dx * s / len, z = a[1] + dz * s / len, px = x + ex * east * 20, pz = z + ez * east * 20
          if (!clearsBuildings([px, pz])) continue
          promenadePoles.push({ p: [px, 2.1, pz], s: [.08, 4.2, .08] }); promenadeLamps.push({ p: [px, 4.22, pz], s: [.34, .16, .34] })
          pools.push({ p: [px, .046, pz], s: [5.5, 1, 5.5] })
        }
      }
    })
    content.palms.forEach(palm => {
      trunks.push({ p: [palm.x, palm.height / 2, palm.z], s: [1, palm.height, 1] })
      if (palm.uplit) uplights.push({ p: [palm.x, .05, palm.z], s: [2.6, 1, 2.6] })
      for (let f = 0; f < 8; f++) {
        const angle = palm.yaw + f * Math.PI * 2 / 8
        fronds.push({ p: [palm.x + Math.cos(angle) * 1.25 * palm.crown, palm.height, palm.z + Math.sin(angle) * 1.25 * palm.crown], s: [1.8 * palm.crown, 2 * palm.crown, .75 * palm.crown], yaw: -angle })
      }
    })
    content.buildings.forEach((b, index) => {
      if (landmarkAssets.has(String(b.id))) return
      const height = Math.max(3, b.height || 9), geo = polygon(b.points, height)
      if (!geo) return
      const centroid = center(b.points), oceanFront = height < 25 && oceanSegments.some(([a, c]) => pointSegmentDistance(centroid, a, c) < 85)
      // Look Bible: Ocean Drive frontage carries the district's pastel paint; inland blocks stay sun-bleached neutrals.
      const tint = oceanFront ? new T.Color(PASTELS[Math.floor(roadRandom(Number(b.id) || index, 1984) * PASTELS.length)]).multiplyScalar(.82) : new T.Color().setHSL(.055 + roadRandom(Number(b.id) || index, 1984) * .08, .16, .56)
      const colors = new Float32Array(geo.getAttribute('position').count * 3)
      for (let i = 0; i < colors.length; i += 3) { colors[i] = tint.r; colors[i + 1] = tint.g; colors[i + 2] = tint.b }
      geo.setAttribute('color', new T.BufferAttribute(colors, 3)); bodies.push(geo)
      const points = b.points
      const signedArea = points.reduce((area, point, i) => {
        const next = points[(i + 1) % points.length]
        return area + point[0] * next[1] - next[0] * point[1]
      }, 0)
      for (let e = 1; e < points.length; e++) {
        const a = points[e - 1], c = points[e], dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx)
        const windowYaw = yaw + (signedArea > 0 ? Math.PI : 0)
        if (len < 3) continue
        // Art-directed windows/eyebrows follow exact mapped facade edges; these
        // are procedural embellishments, not a surveyed recreation of each hotel.
        for (let row = 0; row < Math.min(9, Math.floor(height / 3)); row++) {
          if (oceanFront && row === 0) continue // Detailed storefronts own the ground-floor frontage.
          const storefront = oceanFront && row === 0
          for (let s = 1.8; s < len - 1; s += 3.8) windows.push({ p: [a[0] + dx * s / len, (storefront ? 1.4 : 1.8) + row * 3, a[1] + dz * s / len], s: [storefront ? 2.45 : 1.25, storefront ? 2.25 : 1.1, storefront ? .24 : .14], yaw: windowYaw, tint: roadRandom(index * 101 + row * 7 + Math.floor(s), 84) > .2 ? storefront ? '#e8bc86' : '#ffd6a6' : '#403d57' })
          if (height < 22) bands.push({ p: [(a[0] + c[0]) / 2, 2.55 + row * 3, (a[1] + c[1]) / 2], s: [len, .13, .3], yaw })
        }
        if (oceanFront) bands.push({ p: [(a[0] + c[0]) / 2, 2.68, (a[1] + c[1]) / 2], s: [len * .96, .18, 1.15], yaw })
        if (height < 22 && e % 2 === 0) neons.push({ p: [(a[0] + c[0]) / 2, height - .4, (a[1] + c[1]) / 2], s: [len * .7, .09, .14], yaw, tint: index % 3 ? '#73dbcb' : '#ed7cae' })
      }
    })
    merged(cell.group, sidewalks, mats.sidewalk); merged(cell.group, roads, mats.road); merged(cell.group, bodies, mats.building)
    instances(cell.group, box, mats.curb, curbs)
    cell.windows = instances(cell.detail, frameGeometry, mats.windows, windows)
    instances(cell.detail, box, mats.deco, bands); instances(cell.detail, box, mats.neon, neons)
    instances(cell.detail, trunk, mats.trunks, trunks); instances(cell.detail, leaf, mats.leaves, fronds)
    instances(cell.detail, box, mats.poles, poles); instances(cell.detail, box, mats.lamps, lamps); instances(cell.detail, box, mats.marks, marks)
    const poolGeometry = new T.CircleGeometry(1, 20); poolGeometry.rotateX(-Math.PI / 2); geometries.push(poolGeometry)
    instances(cell.detail, poolGeometry, mats.pools, pools)
    instances(cell.detail, poolGeometry, mats.uplights, uplights)
    instances(cell.detail, box, mats.deco, tables); instances(cell.detail, cone, mats.umbrellas, umbrellas)
    instances(cell.detail, box, mats.poles, promenadePoles); instances(cell.detail, box, mats.lamps, promenadeLamps)
    cell.built = true
    return performance.now() - started
  }
  // Original classic-traffic GLTF, scale and forward-direction correction.
  const base = trafficSource.clone(true), bounds = new T.Box3().setFromObject(base), size = bounds.getSize(new T.Vector3())
  if (size.x > size.z) base.rotation.y = Math.PI / 2
  base.updateMatrixWorld(true); bounds.setFromObject(base); base.scale.setScalar(4.7 / Math.max(.01, bounds.getSize(size).z)); base.updateMatrixWorld(true)
  let rearZ = 0
  base.traverse(o => { if (o instanceof T.Mesh && (Array.isArray(o.material) ? o.material : [o.material]).some(m => /rear/i.test(m.name))) rearZ = new T.Box3().setFromObject(o).getCenter(new T.Vector3()).z })
  if (rearZ < 0) base.rotation.y += Math.PI
  base.updateMatrixWorld(true); bounds.setFromObject(base)
  const c = bounds.getCenter(new T.Vector3()); base.position.set(-c.x, -bounds.min.y, -c.z)
  const trafficMaterials: T.Material[] = [], taillights: T.MeshStandardMaterial[] = []
  const headlights = new T.MeshStandardMaterial({ color: '#fff6e0', emissive: '#fff1cc', emissiveIntensity: 6, toneMapped: false }); trafficMaterials.push(headlights)
  const lampGeometry = new T.CircleGeometry(.11, 16); geometries.push(lampGeometry)
  const front = bounds.min.z - c.z
  const traffic = ['#7fd3c8', '#d9485a'].map(tint => {
    const car = new T.Group(), body = base.clone(true), changed = new Map<T.Material, T.Material>()
    body.traverse(o => {
      if (!(o instanceof T.Mesh)) return
      const adjust = (original: T.Material) => {
        if (!(original instanceof T.MeshStandardMaterial) || !/paint|rear/i.test(original.name)) return original
        if (changed.has(original)) return changed.get(original)!
        const material = original.clone()
        if (/paint/i.test(original.name)) { material.color.set(tint); material.roughness = .3; material.metalness = .05 }
        else { material.color.set('#c3142c'); material.emissive.set('#ff1f3d'); taillights.push(material) }
        changed.set(original, material); trafficMaterials.push(material); return material
      }
      o.material = Array.isArray(o.material) ? o.material.map(adjust) : adjust(o.material); o.castShadow = false
    })
    car.add(body)
    for (const x of [-.6, .6]) { const lamp = new T.Mesh(lampGeometry, headlights); lamp.position.set(x, .72, front - .01); lamp.rotation.y = Math.PI; car.add(lamp) }
    group.add(car); return car
  })
  const streetDetail = createMiamiStreetDetail(data); group.add(streetDetail.group)
  return { group, cells, mats, streetNight, wetness, streetDetail, traffic, buildCell, geometries, textures, adMaterials, trafficMaterials, taillights, headlights, frameGeometry, paneGeometry, fullWindowDetail, landmarkAssets, lastTelemetry: 0 }
}

export default function MiamiWorld({ state, night, data, route, blend, enhanced = true }: { state: MutableRefObject<NightState>; night: boolean; data: MiamiData; route: MiamiRoute; blend?: MutableRefObject<number>; enhanced?: boolean }) {
  const asset = useGLTF('/real-miami/traffic/classic-traffic.glb', false, true)
  const asphalt = useTexture('/real-miami/materials/clean-asphalt/color.webp')
  const maps = useTexture(['/real-miami/materials/street-depth/plaster-color.jpg', '/real-miami/materials/street-depth/plaster-normal.jpg', '/real-miami/materials/street-depth/plaster-roughness.jpg', '/real-miami/materials/street-depth/pavement-color.jpg', '/real-miami/materials/street-depth/pavement-normal.jpg', '/real-miami/materials/street-depth/pavement-roughness.jpg'])
  const surfaces = useMemo(() => ({ plasterColor: maps[0], plasterNormal: maps[1], plasterRoughness: maps[2], pavementColor: maps[3], pavementNormal: maps[4], pavementRoughness: maps[5] }), [maps[0], maps[1], maps[2], maps[3], maps[4], maps[5]]) // Cached inputs stay owned by useTexture.
  const world = useMemo(() => createWorld(data, asphalt, asset.scene, surfaces), [data, asphalt, asset.scene, surfaces])
  useEffect(() => {
    world.mats.road.roughnessMap = enhanced ? world.wetness : null
    world.mats.road.roughness = enhanced ? .92 : .84
    world.mats.road.envMapIntensity = enhanced ? 1.6 : 1
    world.mats.road.needsUpdate = true
  }, [world, enhanced])
  useEffect(() => () => {
    const geos = new Set<T.BufferGeometry>(world.geometries)
    world.cells.forEach(cell => cell.group.traverse(o => { if (o instanceof T.Mesh) { geos.add(o.geometry); if (o instanceof T.InstancedMesh) o.dispose() } }))
    // Traffic asset geometries/materials are cached and remain owned by useGLTF.
    world.group.children.filter(g => g !== world.streetDetail.group && !world.traffic.includes(g as T.Group) && !Array.from(world.landmarkAssets.values()).some(a => a.group === g) && !Array.from(world.cells.values()).some(c => c.group === g)).forEach(g => g.traverse(o => { if (o instanceof T.Mesh) geos.add(o.geometry) }))
    geos.forEach(g => g.dispose()); Object.values(world.mats).forEach(m => m.dispose()); world.textures.forEach(t => t.dispose())
    world.adMaterials.forEach(m => m.dispose()); world.trafficMaterials.forEach(m => m.dispose())
    world.landmarkAssets.forEach(a => a.dispose())
    world.streetDetail.dispose()
  }, [world])
  useFrame(({ gl }) => {
    const s = state.current, p = route.sample(s.distance)
    world.group.position.set(-p.x, -p.y, -p.z)
    const pending: { cell: Cell; distance: number }[] = []
    world.cells.forEach(cell => {
      const distance = Math.hypot(cell.x - p.x, cell.z - p.z)
      cell.group.visible = distance < 850; cell.detail.visible = distance < 450
      if (cell.windows) {
        const paneLod = !world.fullWindowDetail && (cell.paneLod ? distance >= 330 : distance > 350)
        if (paneLod !== cell.paneLod) {
          cell.windows.geometry = paneLod ? world.paneGeometry : world.frameGeometry
          cell.paneLod = paneLod
        }
      }
      if (!cell.built && distance < 950) pending.push({ cell, distance })
    })
    // Closest cells first, bounded work per frame. Geometry is retained after a
    // cell is first built, so revisiting a neighborhood does not rebake facades.
    pending.sort((a, b) => a.distance - b.distance)
    const begin = performance.now()
    for (const { cell } of pending) {
      const ms = world.buildCell(cell)
      if (ms !== undefined) { s.generationMs = ms; s.maxGenerationMs = Math.max(s.maxGenerationMs, ms); s.chunksGenerated++ }
      if (performance.now() - begin > 4) break
    }
    const darkness = blend ? blend.current : night ? 1 : 0
    world.streetDetail.update(p.x, p.z, darkness)
    world.landmarkAssets.forEach(asset => {
      asset.group.visible = Math.hypot(asset.group.position.x - p.x, asset.group.position.z - p.z) < 850
      asset.setBlend(darkness)
    })
    world.streetNight.value = darkness
    world.mats.windows.emissiveIntensity = .12 + darkness * .6 + (pulse.source === 'live' ? pulse.energy * .06 : 0)
    world.mats.lamps.emissiveIntensity = .1 + darkness * 1.3
    world.mats.neon.emissiveIntensity = .15 + darkness * 1.15
    world.mats.pools.opacity = (enhanced ? .26 : .13) * darkness
    world.mats.uplights.opacity = .5 * darkness
    // G11: faint sodium spill so asphalt between light pools never reads as a black hole.
    world.mats.road.emissive.set('#2a1d12'); world.mats.road.emissiveIntensity = darkness * (enhanced ? .55 : .3)
    world.mats.water.color.set('#23798a').lerp(new T.Color('#163b51'), darkness)
    world.headlights.emissiveIntensity = .25 + darkness * 5.75
    world.taillights.forEach(m => { m.emissiveIntensity = .6 + darkness * 2.4 })
    if (performance.now() - world.lastTelemetry > 900) {
      const chunks = Array.from(world.cells.values())
      document.documentElement.dataset.miamiChunks = JSON.stringify({ built: chunks.filter(c => c.built).length, active: chunks.filter(c => c.group.visible).length, total: chunks.length, pending: pending.length, paneLod: chunks.filter(c => c.group.visible && c.detail.visible && c.paneLod).length, windowLod: world.fullWindowDetail ? 'full' : 'distance', renderedTriangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures })
      world.lastTelemetry = performance.now()
    }
    s.traffic.forEach((car, i) => {
      if (!world.traffic[i]) return
      const t = route.sample(car.distance)
      world.traffic[i].position.set(t.x + Math.cos(t.yaw) * car.lateral, t.y, t.z - Math.sin(t.yaw) * car.lateral)
      world.traffic[i].rotation.y = t.yaw
    })
  })
  return <primitive object={world.group} dispose={null} />
}
