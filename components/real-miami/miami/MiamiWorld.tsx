'use client'

import { Suspense, useEffect, useMemo, useState, type MutableRefObject } from 'react'
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
import { createWetStreaks, wetStreakUniforms, type WetLight } from './wetStreaks'
import { cruiseLookEnabled, LOOK } from '@/lib/cruise-os/look'
import { registerLamp } from '../vehicle/lampGrid'
import OceanDriveFacades, { oceanDriveEdges, hybridOceanDriveEdges, districtOceanDriveEdges, districtOceanDriveBuildings, districtOceanDriveEnabled, hybridOceanDriveEnabled, oceanDriveEnabled } from './OceanDriveFacades'
import { readChoice, resolve } from '@/lib/real-miami/quality'
import { createAmbientTraffic } from './ambientTraffic'

export type MiamiPoint = [number, number]
export type MiamiData = {
  roads: { id: number | string; name?: string; type?: string; width: number; points: MiamiPoint[] }[]
  buildings: { id: number | string; name?: string; height: number; levels?: number | null; points: MiamiPoint[] }[]
  land: { id: number | string; type: string; points: MiamiPoint[] }[]
  advertisingPlots?: { id: string; x: number; z: number; yaw?: number; roadId?: number | string; campaign?: string }[]
}
export type MiamiRoute = { sample: (distance: number) => { x: number; y: number; z: number; yaw: number } }
type StreetSurfaces = { plasterColor: T.Texture; plasterNormal: T.Texture; plasterRoughness: T.Texture; pavementColor: T.Texture; pavementNormal: T.Texture; pavementRoughness: T.Texture; districtAsphalt: T.Texture; districtAsphaltNormal: T.Texture }
const CELL = 250
const PASTELS = ['#f2c4c8', '#bfe2d4', '#f3e1a4', '#cec3e5', '#b8dbe9', '#f5d0ad', '#eef0e4', '#f6d9e4']
const temp = new T.Object3D()
const LOOK_FACADE = new T.Color('#5d6680')
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
/** Rooms behind the glass (interior mapping): each pane ray-traces a box room in the window's own space, so the
 * painted room becomes a back wall with real depth, and floor, ceiling and side walls shift as the car passes.
 * Flat pane, no extra geometry or draw calls. Per-window wall colour comes from the instance. Only instanced
 * framed windows (the `pane` attribute) get it; facade glass sharing this material keeps the flat art. */
const ROOM_VERTEX_PARS = `
#ifdef USE_INSTANCING
attribute float pane;
varying vec3 vRoomPos;
varying vec3 vRoomEye;
varying vec3 vRoomHalf;
varying float vRoomSeed;
varying float vPane;
#endif
`
const ROOM_VERTEX = `
#ifdef USE_INSTANCING
vec3 roomScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
vRoomPos = transformed * roomScale;
vRoomEye = (inverse(modelMatrix * instanceMatrix) * vec4(cameraPosition, 1.)).xyz * roomScale;
vRoomHalf = vec3(.42 * roomScale.x, .42 * roomScale.y, 2.4 * max(roomScale.x, roomScale.y) * .42);
vRoomSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233)) + instanceMatrix[3].y * 3.7) * 43758.5453);
vPane = pane;
#endif
`
const ROOM_FRAGMENT_PARS = `
#ifdef USE_INSTANCING
varying vec3 vRoomPos;
varying vec3 vRoomEye;
varying vec3 vRoomHalf;
varying float vRoomSeed;
varying float vPane;
vec3 roomInterior(sampler2D art) {
  vec3 p = vRoomPos, d = normalize(vRoomPos - vRoomEye), h = vRoomHalf;
  float back = p.z - h.z;
  if (d.z > -1e-3) return texture2D(art, p.xy / h.xy * .42 + .5).rgb;
  float tx = (sign(d.x) * h.x - p.x) / (abs(d.x) < 1e-4 ? 1e-4 : d.x);
  float ty = (sign(d.y) * h.y - p.y) / (abs(d.y) < 1e-4 ? 1e-4 : d.y);
  float tz = (back - p.z) / d.z;
  float t = min(tz, min(tx, ty));
  vec3 hit = p + d * t;
  float depth = clamp((p.z - hit.z) / h.z, 0., 1.);
  // Miami interiors: sand, mint, salmon, lilac (linear).
  vec3 wall = vRoomSeed < .25 ? vec3(.48, .40, .26) : vRoomSeed < .5 ? vec3(.28, .45, .40) : vRoomSeed < .75 ? vec3(.58, .32, .29) : vec3(.33, .35, .48);
  vec3 lampAt = vec3(0., h.y * .9, back + h.z * .4);
  vec3 toLamp = hit - lampAt;
  float lamp = .5 + .7 * exp(-dot(toLamp, toLamp) / (h.x * h.x * 1.8));
  vec3 color;
  if (t == tz) color = texture2D(art, hit.xy / h.xy * .5 + .5).rgb * mix(vec3(1.), wall * 2., .2);
  else if (t == tx) color = wall * (.85 - .3 * depth);
  else if (d.y < 0.) color = vec3(.07, .045, .03) * (.8 + .3 * step(.5, fract(hit.x * 2.2)));
  else color = vec3(.7, .64, .52);
  return color * lamp;
}
#endif
`
const ROOM_MAP_FRAGMENT = `
#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D(map, vMapUv);
#ifdef USE_INSTANCING
if (vPane > .5) sampledDiffuseColor = vec4(roomInterior(map), 1.);
#endif
diffuseColor *= sampledDiffuseColor;
#endif
`
const ROOM_EMISSIVE_FRAGMENT = `
#ifdef USE_EMISSIVEMAP
vec4 emissiveColor = texture2D(emissiveMap, vEmissiveMapUv);
#ifdef USE_INSTANCING
if (vPane > .5) emissiveColor = vec4(roomInterior(emissiveMap), 1.);
#endif
totalEmissiveRadiance *= emissiveColor.rgb;
#endif
`

function framedWindow(paneOnly = false) {
  const positions: number[] = [], colors: number[] = [], uv: number[] = [], pane: number[] = []
  const quad = (x0: number, y0: number, x1: number, y1: number, z: number, brightness: number, side: number, glass = 0) => {
    const points = [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]
    const order = side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    order.forEach(i => { positions.push(...points[i]); colors.push(brightness, brightness, brightness); uv.push(points[i][0] + .5, points[i][1] + .5); pane.push(glass) })
  }
  quad(-.42, -.42, .42, .42, .16, .9, 1, 1)
  if (!paneOnly) {
    quad(-.5, -.5, -.42, .5, .5, .2, 1); quad(.42, -.5, .5, .5, .5, .2, 1)
    quad(-.42, -.5, .42, -.42, .5, .24, 1); quad(-.42, .42, .42, .5, .5, .24, 1)
    quad(-.018, -.42, .018, .42, .51, .16, 1)
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geo.setAttribute('pane', new T.Float32BufferAttribute(pane, 1)); geo.computeVertexNormals()
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
        const roomExperiment = (window.location.pathname === '/cruise/prototype' || (window.location.pathname === '/cruise/os' && new URLSearchParams(window.location.search).get('visual') === 'rooms')) && config.kind === 'colony'
        const asset = createMiamiLandmark(building, config, surfaces, roomExperiment)
        landmarkAssets.set(String(building.id), asset); group.add(asset.group)
      }
    }
  }
  const district = districtOceanDriveEnabled()
  const adaptedEdges = oceanDriveEnabled(cruiseLookEnabled()) ? district ? districtOceanDriveEdges : hybridOceanDriveEnabled() ? hybridOceanDriveEdges : oceanDriveEdges : new Set<string>()
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
  const districtAsphalt = surfaceMap(surfaces.districtAsphalt, true, .2625), districtAsphaltNormal = surfaceMap(surfaces.districtAsphaltNormal, false, .2625)
  const look = cruiseLookEnabled()
  const oceanSegments = data.roads.filter(r => r.name === 'Ocean Drive').flatMap(r => r.points.slice(1).map((b, i) => [r.points[i], b] as const))
  const mats = {
    road: new T.MeshStandardMaterial({ color: '#89949c', map: asphalt, roughness: .84, side: T.DoubleSide }),
    districtRoad: new T.MeshStandardMaterial({ color: '#929b9e', map: districtAsphalt, normalMap: districtAsphaltNormal, normalScale: new T.Vector2(.6, .6), roughness: .83, side: T.DoubleSide }),
    districtGutter: new T.MeshStandardMaterial({ color: '#626b6d', roughness: .8, side: T.DoubleSide }),
    districtCrosswalk: new T.MeshStandardMaterial({ color: '#d7d0b5', roughness: .9 }),
    sidewalk: new T.MeshStandardMaterial({ color: '#bab5a4', map: pavementMap, normalMap: pavementNormal, normalScale: new T.Vector2(.35, .35), roughnessMap: pavementRough, roughness: .92, side: T.DoubleSide }),
    curb: new T.MeshStandardMaterial({ color: '#b5b3a5', roughness: .87 }),
    building: new T.MeshStandardMaterial({ vertexColors: true, color: 'white', map: plasterMap, normalMap: plasterNormal, normalScale: new T.Vector2(.25, .25), roughness: .94, roughnessMap: plasterRough }),
    windows: new T.MeshStandardMaterial({ vertexColors: true, color: '#d6ded5', map: roomMap, emissiveMap: roomMap, emissive: '#ffffff', emissiveIntensity: .65, roughness: .22, metalness: .08 }),
    lamps: new T.MeshStandardMaterial({ color: '#fff1cf', emissive: look ? LOOK.sodium : '#ffd399', emissiveIntensity: 1.4, toneMapped: false }),
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
  // ?rooms=off keeps the flat painted rooms (A/B comparison).
  if (new URLSearchParams(globalThis.window.location.search).get('rooms') !== 'off') mats.windows.onBeforeCompile = shader => {
    shader.vertexShader = ROOM_VERTEX_PARS + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + ROOM_VERTEX)
    shader.fragmentShader = ROOM_FRAGMENT_PARS + shader.fragmentShader
      .replace('#include <map_fragment>', ROOM_MAP_FRAGMENT)
      .replace('#include <emissivemap_fragment>', ROOM_EMISSIVE_FRAGMENT + '\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif')
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
  // Every carriageway in a 20 m grid: street lamps must not stand on another road (wide avenues at junctions,
  // and divided avenues whose two carriageways are separate OSM ways put poles in the traffic lanes).
  const roadGrid = new Map<string, [MiamiPoint, MiamiPoint, number][]>()
  data.roads.filter(r => vehicleRoad(r.type)).forEach(r => { const half = (r.width || 8) / 2; for (let i = 1; i < r.points.length; i++) {
    const a = r.points[i - 1], b = r.points[i], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 20))
    const keys = new Set<string>(); for (let k = 0; k <= steps; k++) keys.add(`${Math.floor((a[0] + (b[0] - a[0]) * k / steps) / 20)},${Math.floor((a[1] + (b[1] - a[1]) * k / steps) / 20)}`)
    keys.forEach(key => { let list = roadGrid.get(key); if (!list) roadGrid.set(key, list = []); list.push([a, b, half]) })
  } })
  const onRoad = (x: number, z: number, margin = .7) => { const cx = Math.floor(x / 20), cz = Math.floor(z / 20)
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [a, b, half] of roadGrid.get(`${cx + i},${cz + j}`) || []) {
      const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)))
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < half + margin) return true
    }
    return false }
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
        // Palms on a divided avenue's median side landed in the other carriageway (read as poles in the road).
        if (!junctions.some(j => Math.hypot(j[0] - x, j[1] - z) < 14) && clearsBuildings(p) && !onRoad(p[0], p[1], 1.5)) {
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
    const roads: T.BufferGeometry[] = [], sidewalks: T.BufferGeometry[] = [], bodies: T.BufferGeometry[] = [], districtRoads: T.BufferGeometry[] = [], districtWalks: T.BufferGeometry[] = [], districtGutters: T.BufferGeometry[] = []
    const tables: Placement[] = [], umbrellas: Placement[] = [], uplights: Placement[] = [], promenadePoles: Placement[] = [], promenadeLamps: Placement[] = []
    const windows: Placement[] = [], bands: Placement[] = [], neons: Placement[] = [], trunks: Placement[] = [], fronds: Placement[] = [], poles: Placement[] = [], lamps: Placement[] = [], marks: Placement[] = [], crosswalks: Placement[] = [], pools: Placement[] = [], curbs: Placement[] = []
    const wet: WetLight[] = []
    content.roads.forEach(r => {
      const width = r.width || 8, oceanDistrict = district && r.name === 'Ocean Drive', road = ribbon(r.points, width, oceanDistrict ? .036 : .025)
      if (road) (oceanDistrict ? districtRoads : roads).push(road)
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
          const walkWidth = oceanDistrict ? 4.8 : 1.8
          const walkOffset = width / 2 + walkWidth / 2 + (oceanDistrict ? .18 : .05)
          const a: MiamiPoint = [start[0] + sx / length * trimStart + nx * walkOffset, start[1] + sz / length * trimStart + nz * walkOffset]
          const b: MiamiPoint = [end[0] - sx / length * trimEnd + nx * walkOffset, end[1] - sz / length * trimEnd + nz * walkOffset]
          const walk = ribbon([a, b], walkWidth, oceanDistrict ? .177 : .16)
          if (walk) (oceanDistrict ? districtWalks : sidewalks).push(walk)
          curbs.push({ p: [(a[0] + b[0]) / 2 - nx * (walkWidth / 2 - .08), .09, (a[1] + b[1]) / 2 - nz * (walkWidth / 2 - .08)], s: [length - trimStart - trimEnd, .18, .18], yaw: Math.atan2(-sz, sx) })
          if (oceanDistrict) {
            const gutterCenter: MiamiPoint = [start[0] + nx * (width / 2 - .2), start[1] + nz * (width / 2 - .2)]
            const gutterEnd: MiamiPoint = [end[0] + nx * (width / 2 - .2), end[1] + nz * (width / 2 - .2)]
            const gutter = ribbon([gutterCenter, gutterEnd], .32, .043)
            if (gutter) districtGutters.push(gutter)
          }
        }
        if (oceanDistrict && length > 14) for (const point of [start, end]) {
          if (!junctions.some(j => Math.hypot(j[0] - point[0], j[1] - point[1]) < 1.5)) continue
          const direction = point === start ? 1 : -1
          for (let stripe = 0; stripe < 5; stripe++) {
            const along = direction * (3.3 + stripe * .95)
            crosswalks.push({ p: [point[0] + sx / length * along, .053, point[1] + sz / length * along], s: [.46, .012, Math.max(3, width - 1)], yaw: Math.atan2(-sz, sx) })
          }
        }
      }
      const a = r.points[0], b = r.points[1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx)
      // Place repeated details on each *real* street, independent of the selected route.
      if (['footway', 'path', 'cycleway', 'steps'].includes(r.type || '')) return
      for (let s = 8; s < len; s += 30) {
        const x = a[0] + dx * s / len, z = a[1] + dz * s / len
        for (const side of [-1, 1]) {
          const px = x - dz / len * (width / 2 + 1.3) * side, pz = z + dx / len * (width / 2 + 1.3) * side
          if (onRoad(px, pz, 1.2)) continue
          poles.push({ p: [px, 3.6, pz], s: [.1, 7.2, .1] }); lamps.push({ p: [px, 7.22, pz], s: [.6, .12, .45] })
          registerLamp(px, 7.1, pz)
          if (look) wet.push({ x: px, y: 7.1, z: pz, width: .8, color: LOOK.sodium, intensity: .2 })
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
          if (look) wet.push({ x: px, y: 4.1, z: pz, width: .6, color: LOOK.sodium, intensity: .14 })
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
      if (landmarkAssets.has(String(b.id)) || (district && districtOceanDriveBuildings.has(String(b.id)))) return
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
        if (adaptedEdges.has(`${b.id}:${e - 1}`)) continue
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
        if (height < 22 && e % 2 === 0) {
          neons.push({ p: [(a[0] + c[0]) / 2, height - .4, (a[1] + c[1]) / 2], s: [len * .7, .09, .14], yaw, tint: index % 3 ? '#73dbcb' : '#ed7cae' })
          if (look) wet.push({ x: (a[0] + c[0]) / 2, y: height - .4, z: (a[1] + c[1]) / 2, width: Math.min(2.2, .5 + len * .08), color: index % 3 ? LOOK.cyan : '#ff5fa8', intensity: .13 })
        }
      }
    })
    merged(cell.group, sidewalks, mats.sidewalk); merged(cell.group, roads, mats.road); merged(cell.group, bodies, mats.building)
    merged(cell.group, districtRoads, mats.districtRoad); merged(cell.group, districtWalks, mats.sidewalk); merged(cell.group, districtGutters, mats.districtGutter)
    instances(cell.group, box, mats.curb, curbs)
    cell.windows = instances(cell.detail, frameGeometry, mats.windows, windows)
    instances(cell.detail, box, mats.deco, bands); instances(cell.detail, box, mats.neon, neons)
    instances(cell.detail, trunk, mats.trunks, trunks); instances(cell.detail, leaf, mats.leaves, fronds)
    instances(cell.detail, box, mats.poles, poles); instances(cell.detail, box, mats.lamps, lamps); instances(cell.detail, box, mats.marks, marks)
    instances(cell.detail, box, mats.districtCrosswalk, crosswalks)
    const poolGeometry = new T.CircleGeometry(1, 20); poolGeometry.rotateX(-Math.PI / 2); geometries.push(poolGeometry)
    instances(cell.detail, poolGeometry, mats.pools, pools)
    instances(cell.detail, poolGeometry, mats.uplights, uplights)
    instances(cell.detail, box, mats.deco, tables); instances(cell.detail, cone, mats.umbrellas, umbrellas)
    instances(cell.detail, box, mats.poles, promenadePoles); instances(cell.detail, box, mats.lamps, promenadeLamps)
    const streaks = createWetStreaks(wet); if (streaks) cell.detail.add(streaks)
    cell.built = true
    return performance.now() - started
  }
  // The hybrid keeps the old traffic path and physics but uses Ocean Drive car bodies.
  const hybridCars = hybridOceanDriveEnabled()
  const makeTrafficBase = (source: T.Object3D) => {
    const base = source.clone(true), bounds = new T.Box3().setFromObject(base), size = bounds.getSize(new T.Vector3())
    if (size.x > size.z) base.rotation.y = Math.PI / 2
    base.updateMatrixWorld(true); bounds.setFromObject(base); base.scale.setScalar(4.7 / Math.max(.01, bounds.getSize(size).z)); base.updateMatrixWorld(true)
    let rearZ = 0
    base.traverse(o => { if (o instanceof T.Mesh && (Array.isArray(o.material) ? o.material : [o.material]).some(m => /rear|tail/i.test(m.name))) rearZ = new T.Box3().setFromObject(o).getCenter(new T.Vector3()).z })
    if (rearZ < 0) base.rotation.y += Math.PI
    base.updateMatrixWorld(true); bounds.setFromObject(base)
    const c = bounds.getCenter(new T.Vector3()); base.position.set(-c.x, -bounds.min.y, -c.z)
    return { base, front: bounds.min.z - c.z, rear: bounds.max.z - c.z }
  }
  const trafficMaterials: T.Material[] = [], taillights: T.MeshStandardMaterial[] = []
  const headlights = new T.MeshStandardMaterial({ color: '#fff6e0', emissive: '#fff1cc', emissiveIntensity: 3.5, toneMapped: false }); trafficMaterials.push(headlights)
  const lampGeometry = new T.CircleGeometry(.11, 16); geometries.push(lampGeometry)
  const traffic = ['#7fd3c8', '#d9485a'].map((tint, index) => {
    const source = hybridCars ? trafficSource.getObjectByName(index ? 'sedan_L1' : 'coupe_L1') || trafficSource : trafficSource
    const { base: body, front, rear } = makeTrafficBase(source)
    const car = new T.Group(), changed = new Map<T.Material, T.Material>()
    body.traverse(o => {
      if (!(o instanceof T.Mesh)) return
      const adjust = (original: T.Material) => {
        if (!(original instanceof T.MeshStandardMaterial) || !/paint|rear|tail/i.test(original.name)) return original
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
    if (look) { const tails = createWetStreaks([-.62, .62].map(x => ({ x, y: .78, z: rear, width: .45, color: LOOK.red, intensity: .7 }))); if (tails) car.add(tails) }
    group.add(car); return car
  })
  const streetDetail = createMiamiStreetDetail(data, adaptedEdges); group.add(streetDetail.group)
  return { look, oceanDrive: adaptedEdges.size > 0, group, cells, mats, streetNight, wetness, streetDetail, traffic, buildCell, geometries, textures, adMaterials, trafficMaterials, taillights, headlights, frameGeometry, paneGeometry, fullWindowDetail, landmarkAssets, lastTelemetry: 0 }
}

export default function MiamiWorld({ state, night, data, route, blend, enhanced = true }: { state: MutableRefObject<NightState>; night: boolean; data: MiamiData; route: MiamiRoute; blend?: MutableRefObject<number>; enhanced?: boolean }) {
  const asset = useGLTF(hybridOceanDriveEnabled() ? '/real-miami/ocean-drive/game/models/parked.glb' : '/real-miami/traffic/classic-traffic.glb', false, true)
  const asphalt = useTexture('/real-miami/materials/clean-asphalt/color.webp')
  const district = districtOceanDriveEnabled()
  // WebP derivatives of the Poly Haven masters (provenance.json); Low tier (phones) takes the 512 px set.
  const [street] = useState(() => { const size = resolve(readChoice()).tier === 'low' ? '-512' : ''; return ['plaster-color', 'plaster-normal', 'plaster-roughness', 'pavement-color', 'pavement-normal', 'pavement-roughness'].map(name => `/real-miami/materials/street-depth/${name}${size}.webp`) })
  const maps = useTexture([...street, district ? '/real-miami/ocean-drive/district-asphalt.webp' : '/real-miami/materials/street-depth/plaster-color.jpg', district ? '/real-miami/ocean-drive/district-asphalt-normal.webp' : '/real-miami/materials/street-depth/plaster-normal.jpg'])
  const surfaces = useMemo(() => ({ plasterColor: maps[0], plasterNormal: maps[1], plasterRoughness: maps[2], pavementColor: maps[3], pavementNormal: maps[4], pavementRoughness: maps[5], districtAsphalt: maps[6], districtAsphaltNormal: maps[7] }), [maps[0], maps[1], maps[2], maps[3], maps[4], maps[5], maps[6], maps[7]]) // Cached inputs stay owned by useTexture.
  const world = useMemo(() => createWorld(data, asphalt, asset.scene, surfaces), [data, asphalt, asset.scene, surfaces])
  // Side-street traffic driven by the clock on the GPU (two draws); stretches along the route keep the real cars.
  const ambient = useMemo(() => {
    const avoid = (data as { route?: { points?: number[][] } }).route?.points ?? []
    const tier = resolve(readChoice()).tier
    return createAmbientTraffic(data.roads, avoid, new URLSearchParams(location.search).get('ambient') === 'off' ? 0 : tier === 'low' ? 60 : tier === 'medium' ? 110 : 160)
  }, [data])
  useEffect(() => { world.group.add(ambient.group); return () => { world.group.remove(ambient.group); ambient.dispose() } }, [world, ambient])
  useEffect(() => {
    for (const road of [world.mats.road, world.mats.districtRoad]) {
      road.roughnessMap = enhanced ? world.wetness : null
      road.roughness = world.look ? .62 : enhanced ? .92 : .84
      road.envMapIntensity = enhanced ? 1.6 : 1
      if (world.look) road.color.set(LOOK.road)
      road.needsUpdate = true
    }
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
  useFrame(({ gl, clock }) => {
    const s = state.current, p = route.sample(s.distance)
    world.group.position.set(-p.x, -p.y, -p.z)
    const pending: { cell: Cell; distance: number }[] = []
    // Low tier (phones): cell detail and full window frames end closer; the skyline itself keeps its range.
    const low = document.documentElement.dataset.cruiseQuality === 'low', detailRange = low ? 280 : 450, paneRange = low ? 220 : 350
    world.cells.forEach(cell => {
      const distance = Math.hypot(cell.x - p.x, cell.z - p.z)
      cell.group.visible = distance < 850; cell.detail.visible = distance < detailRange
      if (cell.windows) {
        const paneLod = !world.fullWindowDetail && (cell.paneLod ? distance >= paneRange - 20 : distance > paneRange)
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
    ambient.update(clock.elapsedTime, darkness, p.x, p.z)
    world.streetDetail.update(p.x, p.z, darkness)
    world.landmarkAssets.forEach(asset => {
      asset.group.visible = Math.hypot(asset.group.position.x - p.x, asset.group.position.z - p.z) < 850
      asset.setBlend(darkness)
    })
    world.streetNight.value = darkness
    world.mats.windows.emissiveIntensity = .12 + darkness * .6 + (pulse.source === 'live' ? pulse.energy * .06 : 0)
    world.mats.lamps.emissiveIntensity = .1 + darkness * (district ? .62 : 1)
    world.mats.neon.emissiveIntensity = .12 + darkness * (district ? .5 : .85)
    world.mats.pools.opacity = (world.look ? .1 : enhanced ? .26 : .13) * darkness
    wetStreakUniforms.strength.value = world.look ? darkness * (district ? (enhanced ? .5 : .35) : (enhanced ? 1 : .6)) : 0
    // Canyon walls go dark at night so lit windows and signs carry the frame.
    if (world.look) world.mats.building.color.set('#ffffff').lerp(LOOK_FACADE, darkness)
    wetStreakUniforms.time.value = s.elapsed
    world.mats.uplights.opacity = .5 * darkness
    // G11: faint sodium spill so asphalt between light pools never reads as a black hole.
    for (const road of [world.mats.road, world.mats.districtRoad]) {
      if (world.look) { road.emissive.set(LOOK.roadEmissive); road.emissiveIntensity = darkness * .8 }
      else { road.emissive.set('#2a1d12'); road.emissiveIntensity = darkness * (enhanced ? .55 : .3) }
    }
    world.mats.water.color.set('#23798a').lerp(new T.Color('#163b51'), darkness)
    world.headlights.emissiveIntensity = .25 + darkness * 3.25
    world.taillights.forEach(m => { m.emissiveIntensity = .5 + darkness * 1.5 })
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
  return <><primitive object={world.group} dispose={null} />{world.oceanDrive && <Suspense fallback={null}><OceanDriveFacades state={state} route={route} blend={blend} night={night} plaster={world.mats.building} windows={world.mats.windows} /></Suspense>}</>
}
