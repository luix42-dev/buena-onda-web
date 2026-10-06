'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'

import { MODULE_COUNT, MODULE_LENGTH, WORLD_MAX_Z, WORLD_LENGTH, moduleZ } from '@/lib/cruise/constants'
import { CRUISE_ROUTE } from '@/lib/cruise/routes'
import { routeRelativePose } from '@/lib/cruise/routePath'
import { CRUISE_PLACES } from '@/lib/cruise/campaigns'
import type {
  CruiseQuality,
  CruiseRouteModule,
  CruiseRuntime,
  CruiseTimeOfDay,
  CruiseWeather,
  CruiseWorldFamily,
} from '@/lib/cruise/types'
import {
  addCommercialFacade,
  addResidentialFacade,
  addRoofDetails,
  addStorefrontFacade,
} from './facadeKit'
import type { FacadeTransform } from './facadeKit'
import { createCurbGeometry, createPalmFrondGeometry } from './palmGeometry'
import { createSurfaceAssets } from './surfaceAssets'
import { loadMeasuredRoad } from './measuredRoad'
import { addRoadWear } from './roadWear'
import AuthoredCoastal from './AuthoredCoastal'
import AuthoredPalms from './AuthoredPalms'
import type { CoastalPlacement } from './AuthoredCoastal'
import type { MusicAudio } from '@/lib/cruise/music-audio'
import { installMiamiMaterial } from '../music/miamiMaterials'

export type CruiseWorldProps = {
  music?: MusicAudio
  runtime: MutableRefObject<CruiseRuntime>
  quality: CruiseQuality
  timeOfDay: CruiseTimeOfDay
  weather: CruiseWeather
}

type Transform = FacadeTransform

type ModuleData = {
  authoredCoastal: boolean
  authoredPalms: boolean
  solids: Transform[]
  accents: Transform[]
  glass: Transform[]
  lights: Transform[]
  asphalt: Transform[]
  concrete: Transform[]
  curbs: Transform[]
  signs: Transform[]
  water: Transform[]
  trunks: Transform[]
  fronds: Transform[]
}

type WorldAssets = {
  box: THREE.BoxGeometry
  cylinder: THREE.CylinderGeometry
  frond: THREE.BufferGeometry
  curb: THREE.BufferGeometry
  roadColor: THREE.Texture
  roadNormal: THREE.Texture
  roadRoughness: THREE.Texture
  waterTexture: THREE.DataTexture
  roadAsphalt: THREE.MeshStandardMaterial
  roadMark: THREE.MeshStandardMaterial
  roadTravel: { value: number }
  asphalt: THREE.MeshStandardMaterial
  solid: THREE.MeshStandardMaterial
  accent: THREE.MeshStandardMaterial
  glass: THREE.MeshStandardMaterial
  light: THREE.MeshBasicMaterial
  concrete: THREE.MeshStandardMaterial
  water: THREE.MeshStandardMaterial
  trunk: THREE.MeshStandardMaterial
  leaf: THREE.MeshStandardMaterial
  sign: THREE.MeshStandardMaterial
  geometries: THREE.BufferGeometry[]
  materials: THREE.Material[]
  textures: THREE.Texture[]
}

type Range = readonly [number, number]

const MODULES = CRUISE_ROUTE.map((route, index) => ({ route, index }))
const FULL: Range = [-MODULE_LENGTH * 0.5, MODULE_LENGTH * 0.5]
const BACK: Range = [-MODULE_LENGTH * 0.5, 0]
const FRONT: Range = [0, MODULE_LENGTH * 0.5]
const UP = new THREE.Vector3(0, 1, 0)
const IDENTITY = new THREE.Quaternion()
const ASPHALT_Y = -0.02

const WORLD_LOOK = {
  day: { road: 0x747775, solid: 0xffffff, accent: 0xffffff, concrete: 0xffffff, water: 0x57b6ba, light: 0x8c806e },
  sunset: { road: 0x525655, solid: 0xffffff, accent: 0xffffff, concrete: 0xffffff, water: 0x3c9a9d, light: 0xffffff },
  night: { road: 0x515860, solid: 0x9eabc1, accent: 0xaab5ca, concrete: 0x8994a8, water: 0x245e70, light: 0xffffff },
} as const satisfies Record<CruiseTimeOfDay, Record<string, number>>

const COASTAL_COLORS = [0xe6c6ad, 0xb8d3cf, 0xf0ddd0, 0xd8d5c2, 0xd9a9a1]
const DOWNTOWN_COLORS = [0x6d777c, 0x8b8178, 0x9ba5a6, 0x746e70, 0xa08d7f]
const HOUSE_COLORS = [0xf0d6be, 0xc7ddd4, 0xf0e7d4, 0xd8c8b8, 0xc4d0d1]
const ACCENT_COLORS = [0x2d6a70, 0xbc6155, 0xe1b45e, 0x4c6673, 0xe7ded1]
const NEON_COLORS = [0x45d9d0, 0xff776d, 0xf6bd58, 0x62a7ff]

function random(seed: number) {
  const value = Math.sin(seed * 91.345 + 17.123) * 47453.5453
  return value - Math.floor(value)
}

function transform(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color?: number,
  quaternion = IDENTITY,
): Transform {
  return {
    position: new THREE.Vector3(x, y, z),
    quaternion: quaternion.clone(),
    scale: new THREE.Vector3(sx, sy, sz),
    color: color === undefined ? undefined : new THREE.Color(color),
  }
}

function segmentTransform(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  color?: number,
  roll = 0,
): Transform {
  const direction = end.clone().sub(start)
  const length = direction.length()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize())
  if (roll !== 0) quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll))
  return transform(
    (start.x + end.x) * 0.5,
    (start.y + end.y) * 0.5,
    (start.z + end.z) * 0.5,
    radius,
    length,
    radius,
    color,
    quaternion,
  )
}

function createWaterTexture() {
  const size = 64
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x
      const grain = random(index * 1.71 + 301)
      const wave = Math.sin(y * 0.7 + Math.sin(x * 0.25) * 2) * 13
      const value = Math.round(205 + grain * 34 + wave)
      pixels[index * 4] = value - 35
      pixels[index * 4 + 1] = value - 8
      pixels[index * 4 + 2] = value
      pixels[index * 4 + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 12)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function createAssets(): WorldAssets {
  const box = new THREE.BoxGeometry(1, 1, 1)
  const cylinder = new THREE.CylinderGeometry(0.82, 1, 1, 9, 1)
  const frond = createPalmFrondGeometry()
  const curb = createCurbGeometry()
  const surface = createSurfaceAssets()
  const signCanvas = document.createElement('canvas')
  signCanvas.width = 512
  signCanvas.height = 128
  const signContext = signCanvas.getContext('2d')!
  signContext.fillStyle = '#164b40'
  signContext.fillRect(0, 0, 512, 128)
  signContext.strokeStyle = '#dfebe0'
  signContext.lineWidth = 3
  signContext.strokeRect(7, 7, 498, 114)
  signContext.fillStyle = '#eff5eb'
  signContext.font = 'bold 28px Arial'
  signContext.fillText('DOWNTOWN', 25, 47)
  signContext.font = '24px Arial'
  signContext.fillText('MIAMI BEACH', 25, 87)
  signContext.font = '14px Arial'
  signContext.fillText('COASTAL BLVD', 300, 33)
  signContext.lineWidth = 7
  signContext.beginPath()
  signContext.moveTo(397, 50)
  signContext.lineTo(397, 97)
  signContext.moveTo(379, 79)
  signContext.lineTo(397, 97)
  signContext.lineTo(415, 79)
  signContext.stroke()
  const signTexture = new THREE.CanvasTexture(signCanvas)
  signTexture.colorSpace = THREE.SRGBColorSpace
  const sign = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.55, emissiveMap: signTexture, emissive: 0xffffff, emissiveIntensity: 0.15 })
  const waterTexture = createWaterTexture()

  const roadAsphalt = new THREE.MeshStandardMaterial({
    color: 0x525655,
    map: surface.roadColor,
    normalMap: surface.roadNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: surface.roadRoughness,
    roughness: 0.96,
    metalness: 0,
  })
  const roadMark = new THREE.MeshStandardMaterial({ color: 0xe7ae35, roughness: .85 })
  const asphalt = new THREE.MeshStandardMaterial({
    color: 0x525655,
    roughness: 0.96,
    metalness: 0,
  })
  const solid = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 })
  const accent = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.64 })
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: surface.windowAtlas,
    roughness: 0.3,
    metalness: 0.12,
    envMapIntensity: 0.4,
    emissive: 0x5a4638,
    emissiveMap: surface.windowAtlas,
    emissiveIntensity: 0.025,
  })
  const light = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.72, depthWrite: false })
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: surface.concreteColor,
    normalMap: surface.concreteNormal,
    normalScale: new THREE.Vector2(0.24, 0.24),
    roughness: 0.94,
  })
  const water = new THREE.MeshStandardMaterial({
    color: 0x3c9a9d,
    map: waterTexture,
    roughness: 0.23,
    metalness: 0.06,
  })
  const trunk = new THREE.MeshStandardMaterial({ color: 0x80694e, roughness: 0.98 })
  const leaf = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    side: THREE.DoubleSide,
  })

  return {
    box,
    cylinder,
    frond,
    curb,
    roadColor: surface.roadColor,
    roadNormal: surface.roadNormal,
    roadRoughness: surface.roadRoughness,
    waterTexture,
    roadAsphalt,
    roadMark,
    roadTravel: addRoadWear(roadAsphalt),
    asphalt,
    solid,
    accent,
    glass,
    light,
    concrete,
    water,
    trunk,
    leaf,
    sign,
    geometries: [box, cylinder, frond, curb],
    materials: [roadAsphalt, roadMark, asphalt, solid, accent, glass, light, concrete, water, trunk, leaf, sign],
    textures: [...surface.textures, waterTexture, signTexture],
  }
}

function addSidewalks(data: ModuleData, range: Range, wide = false, detailed = true) {
  const length = range[1] - range[0]
  const z = (range[0] + range[1]) * 0.5
  const width = wide ? 5.4 : 3.8
  data.concrete.push(transform(-7.2 - width * 0.5, 0, z, width, 0.2, length, 0xc5bcaf))
  data.concrete.push(transform(7.2 + width * 0.5, 0, z, width, 0.2, length, 0xc5bcaf))
  data.curbs.push(transform(-7.22, 0.11, z, 0.42, 0.42, length, 0xe5ddd1))
  data.curbs.push(transform(7.22, 0.11, z, 0.42, 0.42, length, 0xe5ddd1))

  const jointStep = detailed ? 5.4 : 10.8
  for (let jointZ = range[0] + jointStep; jointZ < range[1] - 1; jointZ += jointStep) {
    data.accents.push(
      transform(-7.45 - width * 0.5, 0.112, jointZ, width - 0.5, 0.018, 0.045, 0x8e8b84),
      transform(7.45 + width * 0.5, 0.112, jointZ, width - 0.5, 0.018, 0.045, 0x8e8b84),
    )
  }
  const drainStep = detailed ? 15 : 27
  for (let drainZ = range[0] + 7; drainZ < range[1]; drainZ += drainStep) {
    data.asphalt.push(
      transform(-7.47, 0.215, drainZ, 0.48, 0.035, 1.05, 0x2d3434),
      transform(7.47, 0.215, drainZ + 2.4, 0.48, 0.035, 1.05, 0x2d3434),
    )
  }
  if (detailed) {
    data.asphalt.push(
      transform(-9.1, 0.116, z - length * 0.13, 0.82, 0.025, 0.82, 0x555957),
      transform(9.45, 0.116, z + length * 0.17, 0.72, 0.025, 1.0, 0x555957),
    )
  }
}

function addOuterTerrain(data: ModuleData, range: Range, edge: number, color: number) {
  const length = range[1] - range[0]
  const z = (range[0] + range[1]) * 0.5
  const width = 64
  data.concrete.push(transform(-(edge + width * 0.5), -0.16, z, width, 0.2, length, color))
  data.concrete.push(transform(edge + width * 0.5, -0.16, z, width, 0.2, length, color))
}

function addBusShelter(data: ModuleData, side: -1 | 1, z: number, accentColor: number) {
  const rearX = side * 11.15
  const centerX = side * 10.35
  data.glass.push(
    transform(rearX, 1.48, z, 0.1, 2.6, 4.5, 0x25424a),
    transform(centerX, 1.48, z - 2.2, 1.55, 2.6, 0.1, 0x294951),
    transform(centerX, 1.48, z + 2.2, 1.55, 2.6, 0.1, 0x294951),
  )
  data.accents.push(
    transform(centerX, 2.92, z, 1.85, 0.16, 5.05, accentColor),
    transform(rearX - side * 0.06, 1.48, z - 2.25, 0.14, 2.95, 0.14, 0x343c3c),
    transform(rearX - side * 0.06, 1.48, z + 2.25, 0.14, 2.95, 0.14, 0x343c3c),
    transform(centerX, 0.75, z, 0.7, 0.16, 3.0, 0x5a4b42),
    transform(centerX + side * 0.22, 0.38, z - 1.25, 0.14, 0.75, 0.14, 0x343c3c),
    transform(centerX + side * 0.22, 0.38, z + 1.25, 0.14, 0.75, 0.14, 0x343c3c),
  )
}

function addStreetFurniture(
  data: ModuleData,
  range: Range,
  quality: CruiseQuality,
  seed: number,
  theme: 'coastal' | 'downtown',
) {
  const length = range[1] - range[0]
  const center = (range[0] + range[1]) * 0.5
  const side: -1 | 1 = theme === 'coastal' ? 1 : (seed % 2 === 0 ? -1 : 1)
  if (quality !== 'low' && length > 30) {
    addBusShelter(data, side, center + length * 0.14, theme === 'coastal' ? 0x4b7778 : 0x4b5353)
  }

  const binZ = center - length * 0.27
  data.accents.push(
    transform(side * 9.15, 0.55, binZ, 0.66, 1.1, 0.66, 0x374846),
    transform(side * 9.15, 1.12, binZ, 0.72, 0.08, 0.72, 0x252e2e),
  )

  if (quality === 'low') return
  const outerX = side * (theme === 'coastal' ? 10.1 : 11.5)
  data.accents.push(
    transform(outerX, 0.78, center - length * 0.05, 0.72, 1.56, 1.05, 0x697270),
    transform(outerX - side * 0.38, 0.9, center - length * 0.05, 0.04, 0.38, 0.24, 0x253434),
  )

  const planterCount = quality === 'high' ? 2 : 1
  for (let index = 0; index < planterCount; index += 1) {
    const planterZ = center + length * (0.31 - index * 0.5)
    data.concrete.push(transform(side * 9.75, 0.34, planterZ, 1.35, 0.65, 1.35, 0x9d9387))
    data.accents.push(
      transform(side * 9.75, 0.85, planterZ, 1.0, 0.7, 0.8, 0x38634d),
      transform(side * 9.75, 1.08, planterZ, 0.62, 0.54, 1.18, 0x47765a),
    )
  }
}

function addPalm(data: ModuleData, seed: number, x: number, z: number, detail: number, scale = 1) {
  const height = (8.5 + random(seed) * 4.2) * scale
  const bendX = (random(seed + 1) - 0.5) * 1.35
  const bendZ = (random(seed + 2) - 0.5) * 0.92
  const start = new THREE.Vector3(x, 0.1, z)
  const lower = new THREE.Vector3(x + bendX * 0.18, height * 0.34, z + bendZ * 0.14)
  const upper = new THREE.Vector3(x + bendX * 0.56, height * 0.7, z + bendZ * 0.48)
  const crown = new THREE.Vector3(x + bendX, height, z + bendZ)
  data.trunks.push(
    segmentTransform(start, lower, 0.29 * scale),
    segmentTransform(lower, upper, 0.235 * scale),
    segmentTransform(upper, crown, 0.18 * scale),
  )

  const crownVariant = Math.floor(random(seed + 5) * 3)
  const count = detail <= 5 ? 5 : 7 + crownVariant
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + random(seed + 3) * 0.42
    const length = (3.25 + random(seed + 10 + index) * 1.4) * scale
    const lift = crownVariant === 0
      ? (index % 3 === 0 ? 0.28 : -0.72)
      : crownVariant === 1
        ? (index % 2 === 0 ? -0.35 : -1.0)
        : (index % 4 === 0 ? 0.58 : -0.62)
    const tip = new THREE.Vector3(
      crown.x + Math.cos(angle) * length,
      crown.y + (lift - random(seed + 20 + index) * 0.5) * scale,
      crown.z + Math.sin(angle) * length,
    )
    const direction = tip.clone().sub(crown).normalize()
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle))
    const normal = tangent.clone().cross(direction).normalize()
    const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, direction, normal))
    data.fronds.push(transform(
      (crown.x + tip.x) * 0.5, (crown.y + tip.y) * 0.5, (crown.z + tip.z) * 0.5,
      (0.38 + random(seed + index + 90) * 0.1) * scale, length, length,
      index % 3 === 0 ? 0x7c9257 : 0x537a46, rotation,
    ))
  }
}

function addLamp(data: ModuleData, x: number, z: number, towardRoad: -1 | 1, neon = false) {
  data.accents.push(transform(x, 2.7, z, 0.13, 5.4, 0.13, 0x343c3c))
  data.accents.push(transform(x + towardRoad * 0.7, 5.32, z, 1.4, 0.11, 0.11, 0x343c3c))
  data.lights.push(transform(
    x + towardRoad * 1.32,
    5.2,
    z,
    0.46,
    0.16,
    0.34,
    neon ? 0x5de5dc : 0xffd59a,
  ))
}

function addCoastal(data: ModuleData, moduleIndex: number, range: Range, quality: CruiseQuality) {
  addSidewalks(data, range, true, quality !== 'low')
  const length = range[1] - range[0]
  const center = (range[0] + range[1]) * 0.5
  data.concrete.push(transform(-44, -.15, center, 63, .2, length, 0xb3b29b))
  data.concrete.push(transform(15.2, -0.13, center, 12, 0.18, length, 0xdcc99e))
  data.water.push(transform(45, -0.2, center, 48, 0.12, length, 0x3b999d))
  data.accents.push(transform(10.3, 0.12, center, 0.18, 0.48, length, 0xeee5d8))

  const hotelCount = length > 40 && quality === 'high' ? 3 : 2
  for (let index = 0; index < hotelCount; index += 1) {
    if (data.authoredCoastal) continue
    const seed = moduleIndex * 151 + index * 37
    const depth = Math.min(18, length / hotelCount - 1.3)
    const z = range[0] + (index + 0.5) * length / hotelCount
    const width = 9 + random(seed + 1) * 4
    const height = 10 + random(seed + 2) * 11
    const x = -13.1 - width * 0.5 - random(seed + 3) * 2
    const body = COASTAL_COLORS[(moduleIndex + index) % COASTAL_COLORS.length]
    data.solids.push(transform(x, height * 0.5, z, width, height, depth, body))
    const frameColor = ACCENT_COLORS[(moduleIndex + index) % ACCENT_COLORS.length]
    const facadeX = x + width * 0.5 + 0.3
    addCommercialFacade(data, {
      side: -1,
      facadeX,
      centerZ: z,
      depth,
      height,
      columns: quality === 'low' ? 3 : 4,
      seed,
      quality,
      frameColor,
      variant: (moduleIndex + index) % 2 === 0 ? 'deco' : 'balcony',
    })
    addStorefrontFacade(data, {
      side: -1,
      facadeX,
      z,
      width: depth * 0.64,
      seed,
      frameColor,
      neon: false,
    })
    addRoofDetails(data, {
      side: -1,
      centerX: x,
      width,
      centerZ: z,
      depth,
      height,
      seed,
      parapetColor: body,
      quality,
    })
  }

  const palms = quality === 'low' ? 2 : quality === 'medium' ? 3 : 4
  for (let index = 0; index < palms; index += 1) {
    if (data.authoredPalms) continue
    const z = range[0] + (index + 0.55) * length / palms
    addPalm(data, moduleIndex * 97 + index * 19, 11.8 + (index % 2) * 2.2, z, quality === 'high' ? 9 : quality === 'medium' ? 7 : 5)
  }
  addLamp(data, -8.9, range[0] + length * 0.28, 1)
  addLamp(data, 8.9, range[0] + length * 0.72, -1)
  addStreetFurniture(data, range, quality, moduleIndex, 'coastal')
}

function addDowntown(
  data: ModuleData,
  moduleIndex: number,
  range: Range,
  quality: CruiseQuality,
  neon = false,
) {
  addSidewalks(data, range, true, quality !== 'low')
  const landZ = (range[0] + range[1]) / 2, landLength = range[1] - range[0]
  data.concrete.push(transform(-44.6, -.16, landZ, 64, .2, landLength, 0x777a78))
  if (moduleIndex % 3 !== 1) data.concrete.push(transform(44.6, -.16, landZ, 64, .2, landLength, 0x777a78))
  const length = range[1] - range[0]
  const towersPerSide = length > 40 ? 3 : 2
  for (const side of [-1, 1] as const) {
    if (side === 1 && moduleIndex % 3 === 1) continue
    for (let index = 0; index < towersPerSide; index += 1) {
      const seed = moduleIndex * 211 + index * 41 + (side > 0 ? 17 : 0)
      const depth = Math.min(18, length / towersPerSide - 1)
      const z = range[0] + (index + 0.5) * length / towersPerSide
      const width = 8 + random(seed + 2) * 6
      const height = 18 + random(seed + 3) * 25
      const x = side * (13.1 + width * 0.5 + random(seed + 4) * 3.4)
      const color = DOWNTOWN_COLORS[(moduleIndex + index + (side > 0 ? 2 : 0)) % DOWNTOWN_COLORS.length]
      data.solids.push(transform(x, height * 0.5, z, width, height, depth, color))
      const facadeX = x - side * (width * 0.5 + 0.3)
      const frameColor = ACCENT_COLORS[(moduleIndex + index + (side > 0 ? 1 : 0)) % ACCENT_COLORS.length]
      addCommercialFacade(data, {
        side,
        facadeX,
        centerZ: z,
        depth,
        height,
        columns: quality === 'high' ? 5 : 4,
        seed,
        quality,
        frameColor,
        variant: (moduleIndex + index) % 3 === 0 ? 'deco' : 'tower',
      })
      addStorefrontFacade(data, {
        side,
        facadeX,
        z,
        width: Math.min(8.5, depth * 0.68),
        seed,
        frameColor,
        neon,
      })
      addRoofDetails(data, {
        side,
        centerX: x,
        width,
        centerZ: z,
        depth,
        height,
        seed,
        parapetColor: color,
        quality,
      })
    }
  }
  if (moduleIndex % 3 === 1) {
    const center = (range[0] + range[1]) / 2
    data.water.push(transform(62, -.65, center, 94, .14, length, 0x3b9299))
    data.concrete.push(transform(14.8, -.1, center, .6, 1.1, length, 0xbcb7ad))
    data.accents.push(transform(13.2, .62, center, .12, .12, length, 0xcbd1cb))
    for (let z = range[0] + 8; z < range[1]; z += 20) {
      addPalm(data, moduleIndex * 13 + z, 11.1, z, quality === 'low' ? 5 : 7, .8)
      data.accents.push(transform(21, -.05, z, 12, .3, 2.5, 0x938574))
    }
  }
  if (CRUISE_ROUTE[moduleIndex].id === 'downtown-underpass') {
    data.solids.push(transform(0, 8.1, -4, 53, 1.2, 15, 0xa9aca5))
    for (const side of [-1, 1]) {
      data.solids.push(transform(side * 10.7, 3.6, -4, 1.4, 7.3, 2.2, 0x939990))
      data.accents.push(transform(side * 7.7, 7.36, -4, .2, .14, 13, 0xf0c87e))
    }
  }
  addLamp(data, -8.75, range[0] + length * 0.24, 1, neon)
  addLamp(data, 8.75, range[0] + length * 0.72, -1, neon)
  addStreetFurniture(data, range, quality, moduleIndex + (neon ? 11 : 0), 'downtown')
}

function addCauseway(data: ModuleData, moduleIndex: number, range: Range, quality: CruiseQuality) {
  const length = range[1] - range[0]
  const center = (range[0] + range[1]) * 0.5
  data.water.push(transform(0, -1.4, center, 320, 0.14, length, 0x3b9299))
  data.concrete.push(transform(0, -0.34, center, 15.4, 0.72, length, 0xa8a59f))
  data.concrete.push(transform(-7.5, 0.42, center, 0.28, 0.9, length, 0xd2cec5))
  data.concrete.push(transform(7.5, 0.42, center, 0.28, 0.9, length, 0xd2cec5))
  for (let z = range[0] + 5; z < range[1]; z += 12) {
    data.concrete.push(transform(-6.9, -2.9, z, 0.75, 5.4, 0.75, 0x9e9b94))
    data.concrete.push(transform(6.9, -2.9, z, 0.75, 5.4, 0.75, 0x9e9b94))
  }
  addLamp(data, -7.9, range[0] + length * 0.22, 1)
  addLamp(data, 7.9, range[0] + length * 0.7, -1)

  // Detailed, landward towers live in WorldBackdrop. Keep the open-water span
  // clear of the former repeated box buildings that appeared to float offshore.
}

function addHighwayWidth(data: ModuleData, range: Range, taper?: 'toward-back' | 'toward-front') {
  const length = range[1] - range[0]
  if (!taper) {
    const center = (range[0] + range[1]) * 0.5
    data.asphalt.push(transform(-10, ASPHALT_Y - 0.005, center, 6.2, 0.12, length))
    data.asphalt.push(transform(10, ASPHALT_Y - 0.005, center, 6.2, 0.12, length))
    return
  }
  const steps = 32
  for (let index = 0; index < steps; index += 1) {
    const stepLength = length / steps
    const z = range[0] + (index + 0.5) * stepLength
    const progress = taper === 'toward-back' ? 1 - (index + 0.5) / steps : (index + 0.5) / steps
    const width = progress * 6.2
    data.asphalt.push(transform(-7 - width * 0.5, ASPHALT_Y - 0.005, z, width, 0.12, stepLength))
    data.asphalt.push(transform(7 + width * 0.5, ASPHALT_Y - 0.005, z, width, 0.12, stepLength))
  }
}

function addHighway(data: ModuleData, moduleIndex: number, range: Range, taper?: 'toward-back' | 'toward-front') {
  const length = range[1] - range[0]
  const center = (range[0] + range[1]) * 0.5
  addHighwayWidth(data, range, taper)
  const steps = taper ? 32 : 1
  for (let step = 0; step < steps; step += 1) {
    const z = range[0] + (step + 0.5) * length / steps
    const progress = !taper ? 1 : taper === 'toward-back' ? 1 - (step + 0.5) / steps : (step + 0.5) / steps
    const edge = 7 + progress * 6.2
    for (const side of [-1, 1]) {
      data.concrete.push(transform(side * (edge + 0.25), 0.45, z, 0.5, 1.05, length / steps, 0xc4c1b9))
      data.accents.push(transform(side * (edge - 0.4), 0.055, z, 0.12, 0.025, length / steps, 0xeee9d9))
    }
  }
  for (let z = range[0] + 5; z < range[1]; z += 11) {
    data.accents.push(transform(-7.05, 0.06, z, 0.12, 0.025, 5.2, 0xeee9d9))
    data.accents.push(transform(7.05, 0.06, z, 0.12, 0.025, 5.2, 0xeee9d9))
  }

  if (CRUISE_ROUTE[moduleIndex].id === 'highway-overpass') {
    data.concrete.push(transform(0, 5.7, center - 2, 34, 1.2, 7, 0xaaa7a1))
    data.asphalt.push(transform(0, 6.34, center - 2, 34, 0.08, 6.4, 0x626665))
    data.concrete.push(transform(-15, 2.7, center - 2, 1.2, 5.4, 4.4, 0x999792))
    data.concrete.push(transform(15, 2.7, center - 2, 1.2, 5.4, 4.4, 0x999792))
    data.accents.push(transform(0, 6.4, center - 2, 34, 0.025, 0.12, 0xe9b63d))
    for (const offset of [-3.3, 3.3]) data.accents.push(transform(0, 6.7, center - 2 + offset, 34, 0.45, 0.15, 0xc7ccca))
    for (const side of [-1, 1]) {
      const slope = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * -0.18)
      data.concrete.push(transform(side * 33, 3.1, center - 2, 33, 1.2, 7, 0xaaa7a1, slope))
      data.asphalt.push(transform(side * 33, 3.73, center - 2, 33, 0.08, 6.4, 0x626665, slope))
      for (const offset of [-3.3, 3.3]) data.accents.push(transform(side * 33, 4.1, center - 2 + offset, 33, 0.45, 0.15, 0xc7ccca, slope))
    }
  }

  const signZ = range[0] + length * 0.68
  // One sign every few modules leaves long sky/water sightlines.
  addLamp(data, -13.9, center, 1)
  addLamp(data, 13.9, center + 25, -1)
  data.water.push(transform(65, -1.4, center, 96, .14, length, 0x3b9299))
  data.concrete.push(transform(-43, -.3, center, 58, .3, length, 0x909c88))
  for (const z of [range[0] + 13, range[0] + 43]) addPalm(data, moduleIndex * 23 + z, -18, z, 5)
  if (moduleIndex % 4 !== 0) return
  data.accents.push(transform(-14, 3.2, signZ, 0.22, 6.4, 0.22, 0x48504f))
  data.accents.push(transform(14, 3.2, signZ, 0.22, 6.4, 0.22, 0x48504f))
  data.accents.push(transform(0, 6.25, signZ, 28, 0.2, 0.22, 0x48504f))
  data.signs.push(transform(3.6, 5.55, signZ - 0.04, 6.1, 1.55, 0.18))
}

function addResidential(data: ModuleData, moduleIndex: number, range: Range, quality: CruiseQuality) {
  addSidewalks(data, range, false, quality !== 'low')
  addOuterTerrain(data, range, 11, 0x8b927c)
  const length = range[1] - range[0]
  const lots = length > 40 ? 4 : 2
  for (const side of [-1, 1] as const) {
    data.concrete.push(transform(side * 12.4, 1.25, (range[0] + range[1]) * 0.5, 0.34, 2.5, length, 0xe4d8c8))
    for (let index = 0; index < lots; index += 1) {
      const seed = moduleIndex * 179 + index * 31 + (side > 0 ? 13 : 0)
      const lotDepth = length / lots
      const z = range[0] + (index + 0.5) * lotDepth
      const width = 7 + random(seed) * 3.5
      const depth = Math.max(7, lotDepth - 2)
      const height = 3.8 + random(seed + 1) * 2.4
      const x = side * (16 + width * 0.5 + random(seed + 2) * 2)
      const body = HOUSE_COLORS[(moduleIndex + index + (side > 0 ? 1 : 0)) % HOUSE_COLORS.length]
      data.solids.push(transform(x, height * 0.5, z, width, height, depth, body))
      data.solids.push(transform(x, height + 0.45, z, width * 1.04, 0.9, depth * 1.04, 0xe7ddd0))
      addResidentialFacade(data, {
        side,
        facadeX: x - side * (width * 0.5 + 0.3),
        centerZ: z,
        depth,
        height,
        seed,
        frameColor: 0xe2d7c8,
      })
      data.asphalt.push(transform(side * 10.3, 0.1, z, 6.1, 0.08, 3.1, 0x5b5e5d))
      if (index % 2 === 0) {
        addPalm(data, seed + 80, side * 10.6, z + depth * 0.28, quality === 'high' ? 8 : quality === 'medium' ? 7 : 5, 0.78)
      }
      if (quality !== 'low' && index === 1) {
        data.accents.push(
          transform(side * 11.25, 0.72, z - depth * 0.34, 0.58, 1.44, 0.78, 0x747b78),
          transform(side * 10.94, 0.84, z - depth * 0.34, 0.035, 0.3, 0.2, 0x253434),
        )
      }
    }
  }
  addLamp(data, -8.75, range[0] + length * 0.3, 1)
  addLamp(data, 8.75, range[0] + length * 0.76, -1)
}

function addBeach(data: ModuleData, moduleIndex: number, range: Range, quality: CruiseQuality) {
  const length = range[1] - range[0]
  const center = (range[0] + range[1]) / 2
  addSidewalks(data, range, true, quality !== 'low')
  data.concrete.push(transform(-30, -0.15, center, 35, 0.2, length, 0x819979))
  data.concrete.push(transform(18, -0.12, center, 12, 0.18, length, 0xe0cda1))
  data.water.push(transform(78, -0.23, center, 108, 0.12, length, 0x3b999d))
  data.accents.push(transform(16, 0.14, center, 4, 0.22, length, 0x9c8870))
  for (let z = range[0] + 2; z < range[1]; z += 4) {
    data.accents.push(transform(16, 0.26, z, 4, 0.025, 0.055, 0x675f51))
  }
  for (let z = range[0] + 8; z < range[1] - 3; z += 20) {
    // Keep the coastal billboard's road-facing approach clear of palm trunks.
    addPalm(data, moduleIndex * 29 + z, moduleIndex===5?-42:-19, z, quality === 'low' ? 5 : 7)
    if(moduleIndex%3===1){
      data.accents.push(transform(20, 0.55, z, 0.85, 0.14, 2.4, 0x53888b))
      data.accents.push(transform(22, 1.5, z, 0.12, 3, 0.12, 0xdad7c6))
      data.accents.push(transform(22, 3, z, 3.3, 0.16, 3.3, 0x467e87))
    }
  }
  if (CRUISE_ROUTE[moduleIndex].id === 'beach-pier') {
    data.accents.push(transform(43, 0.8, center, 54, 0.35, 4, 0x9c8870))
    for (let x = 19; x < 70; x += 6) {
      for (const side of [-1, 1]) {
        data.accents.push(transform(x, 1.4, center + side * 1.9, 0.15, 1.5, 0.15, 0xede4ce))
        data.accents.push(transform(x, -0.3, center + side * 1.7, 0.3, 2.2, 0.3, 0x655e50))
      }
    }
    for (const side of [-1, 1]) data.accents.push(transform(43, 2.05, center + side * 1.9, 54, 0.12, 0.12, 0xede4ce))
  }
  addLamp(data, -8.9, center, 1)
}

function addWaterfront(data: ModuleData, moduleIndex: number, range: Range, quality: CruiseQuality) {
  const length = range[1] - range[0]
  const center = (range[0] + range[1]) / 2
  addSidewalks(data, range, true, quality !== 'low')
  data.concrete.push(transform(-27, -0.15, center, 29, 0.2, length, 0x8b927c))
  data.water.push(transform(61, -0.7, center, 96, 0.15, length, 0x3b9299))
  data.concrete.push(transform(12.9, -0.1, center, 0.6, 0.9, length, 0xbcb7ad))
  for (let z = range[0] + 8; z < range[1] - 5; z += 20) {
    data.accents.push(transform(23, -0.2, z, 20, 0.28, 2.4, 0x938574))
    for (let x = 17; x < 33; x += 7) {
      data.accents.push(transform(x, 0.3, z, 0.25, 1.3, 0.25, 0xd8d1bf))
      const boatZ = z + 4.8
      data.solids.push(transform(x + 1.5, -0.05, boatZ, 3.1, 0.9, 6.3, 0xe8e7df))
      data.accents.push(transform(x + 1.5, 0.44, boatZ + 0.5, 2.5, 0.15, 4.3, 0x697b81))
      data.glass.push(transform(x + 1.5, 0.98, boatZ + 0.9, 1.8, 1, 2.2, 0x35535e))
      data.accents.push(transform(x + 1.5, 1.55, boatZ + 0.9, 2.3, 0.14, 2.7, 0xf0eee4))
    }
    addPalm(data, moduleIndex * 31 + z, -11, z, quality === 'low' ? 5 : 7)
  }
  data.solids.push(transform(-21, 2.2, center, 12, 4.4, 15, 0xe0e2d9))
  addStorefrontFacade(data, { side: -1, facadeX: -14.8, z: center, width: 10, seed: moduleIndex, frameColor: 0x497d80, neon: false })
  addStreetFurniture(data, range, quality, moduleIndex, 'coastal')
}

function addBrickell(data: ModuleData, moduleIndex: number, range: Range, quality: CruiseQuality) {
  addSidewalks(data, range, true, quality !== 'low')
  addOuterTerrain(data, range, 12.6, 0x969d9b)
  const length = range[1] - range[0]
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < 2; index += 1) {
      const z = range[0] + (index + 0.5) * length / 2
      const seed = moduleIndex * 53 + index + side
      const height = 46 + random(seed) * 27
      const x = side * (index === 0 ? 23 : 20)
      const depth = length / 2 - 7
      data.concrete.push(transform(x, 0.18, z, 20, 0.4, depth + 5, 0xd1d3ce))
      data.solids.push(transform(x, 2.6, z, 16, 5.2, depth, 0xbbc7c6))
      data.glass.push(transform(x, height / 2 + 5.2, z, 12, height, depth - 3, side < 0 ? 0x638f99 : 0x7896a0))
      for (let floor = 9; floor < height + 5; floor += quality === 'low' ? 7 : 3.5) {
        data.accents.push(transform(x, floor, z, 12.2, 0.14, depth - 2.8, 0xafbfc1))
      }
      for (const offset of [-5.8, 0, 5.8]) data.accents.push(transform(x + offset, height / 2 + 5.2, z, 0.15, height, depth - 2.7, 0xb8c7ca))
      addStorefrontFacade(data, { side, facadeX: x - side * 8.1, z, width: depth * 0.7, seed, frameColor: 0xaebdba, neon: false })
      data.concrete.push(transform(side * 14, 0.45, z + depth / 2, 2, 0.9, 3, 0xa7afaa))
      addPalm(data, seed, side * 14, z + depth / 2, quality === 'low' ? 5 : 7, 0.8)
    }
  }
  addLamp(data, -8.9, 16, 1)
  addLamp(data, 8.9, -16, -1)
}

function addIndustrial(data: ModuleData, moduleIndex: number, quality: CruiseQuality) {
  addHighway(data, moduleIndex, FULL)
  addOuterTerrain(data, FULL, 13.6, 0x8c9382)
  const terminal = CRUISE_ROUTE[moduleIndex].id === 'airport-terminal'
  data.asphalt.push(transform(-31, -0.015, 0, 30, 0.12, 64, 0x717572))
  data.solids.push(transform(-42, terminal ? 5 : 4, 0, 20, terminal ? 10 : 8, 51, 0xb5bfc0))
  if (terminal) {
    data.glass.push(transform(-31.8, 5, 0, 0.2, 7, 49, 0x648a93))
    data.accents.push(transform(-26, 5.2, 0, 12, 0.35, 54, 0xd9dfda))
    for (let z = -24; z <= 24; z += 12) data.accents.push(transform(-21, 2.6, z, 0.35, 5.2, 0.35, 0x7e8986))
  } else {
    for (let z = -20; z <= 20; z += 10) {
      data.accents.push(transform(-31.8, 2, z, 0.15, 3.7, 5, 0x606d71))
      data.concrete.push(transform(-29, 0.6, z, 5.5, 1.2, 6, 0xa7aaa2))
      data.solids.push(transform(-25, 1.8, z, 6, 2.8, 2.7, 0xe0e1d7))
      data.glass.push(transform(-21.3, 1.5, z, 1.4, 2.2, 2.5, 0x416771))
    }
  }
  data.asphalt.push(transform(46, -0.015, 0, 21, 0.12, 64, 0x535c5b))
  for (let z = -28; z < 32; z += 10) {
    data.accents.push(transform(46, 0.055, z, 0.35, 0.02, 5, 0xe9ece6))
    for (const x of [36, 56]) data.lights.push(transform(x, 0.15, z, 0.22, 0.18, 0.22, 0x75b7ff))
  }
  for (let z = -30; z < 32; z += 6) {
    data.accents.push(transform(21, 1.4, z, 0.08, 2.8, 0.08, 0xa3afaa))
  }
  for (const y of [0.6, 1.5, 2.6]) data.accents.push(transform(21, y, 0, 0.06, 0.06, 64, 0xa3afaa))
  if (quality !== 'low') {
    data.solids.push(transform(67, 9, -8, 4, 18, 4, 0xd5d8cf))
    data.glass.push(transform(67, 18.5, -8, 8, 3, 8, 0x527c8b))
    data.accents.push(transform(67, 20.2, -8, 9, 0.4, 9, 0xd5d8cf))
  }
}

function addMidtown(data: ModuleData, moduleIndex: number, range: Range, quality: CruiseQuality) {
  addSidewalks(data, range, true, quality !== 'low')
  addOuterTerrain(data, range, 12.6, 0x929c89)
  const length = range[1] - range[0]
  const center = (range[0] + range[1]) / 2
  for (const side of [-1, 1] as const) {
    for (let index = 0; index < 3; index += 1) {
      const seed = moduleIndex * 71 + index * 13 + side
      const z = range[0] + (index + 0.5) * length / 3
      const height = 4.4 + random(seed) * 3.2
      const depth = length / 3 - 3
      const x = side * (index === 1 ? 21 : 18)
      const body = HOUSE_COLORS[(moduleIndex + index) % HOUSE_COLORS.length]
      data.solids.push(transform(x, height / 2, z, 10, height, depth, body))
      addCommercialFacade(data, { side, facadeX: x - side * 5.2, centerZ: z, depth, height, columns: 3, seed, quality, frameColor: 0x547f78, variant: 'deco' })
      addStorefrontFacade(data, { side, facadeX: x - side * 5.3, z, width: depth * 0.8, seed, frameColor: ACCENT_COLORS[index], neon: false })
      addRoofDetails(data, { side, centerX: x, width: 10, centerZ: z, depth, height, seed, parapetColor: body, quality })
    }
  }
  const centerMimo = (range[0] + range[1]) / 2
  for (const side of [-1, 1]) {
    data.asphalt.push(transform(side * 27, .025, centerMimo, 12, .08, length, 0x676a63))
    const roof = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * .13)
    const roofHeight = 4.4 + random(moduleIndex * 71 + 13 + side) * 3.2
    data.accents.push(transform(side * 21, roofHeight + .1, centerMimo, 11.2, .18, 17, 0x79a59a, roof))
    data.solids.push(transform(side * 31, 2.6, centerMimo + 13, 2.3, 5.2, 1.1, 0xd9b482))
    data.lights.push(transform(side * 31, 4.3, centerMimo + 13.6, 1.8, 1.8, .1, 0x64c2b6))
  }
  addStreetFurniture(data, range, quality, moduleIndex, 'downtown')
  addPalm(data, moduleIndex, -10.7, center, quality === 'low' ? 5 : 7, 0.8)
  addLamp(data, 8.9, center + length * 0.28, -1)
}

function addFamily(data: ModuleData, family: CruiseWorldFamily, moduleIndex: number, range: Range, quality: CruiseQuality, taper?: 'toward-back' | 'toward-front') {
  switch (family) {
    case 'coastal': addCoastal(data, moduleIndex, range, quality); break
    case 'downtown': addDowntown(data, moduleIndex, range, quality); break
    case 'causeway': addCauseway(data, moduleIndex, range, quality); break
    case 'highway': addHighway(data, moduleIndex, range, taper); break
    case 'residential': addMidtown(data, moduleIndex, range, quality); break
  }
}

function createModuleData(route: CruiseRouteModule, moduleIndex: number, quality: CruiseQuality, authoredCoastal = false, authoredPalms = false): ModuleData {
  const data: ModuleData = {
    authoredCoastal,
    authoredPalms,
    solids: [], accents: [], glass: [], lights: [], asphalt: [], concrete: [], curbs: [], signs: [], water: [], trunks: [], fronds: [],
  }
  switch (route.kind) {
    case 'beach': addBeach(data, moduleIndex, FULL, quality); break
    case 'waterfront': addWaterfront(data, moduleIndex, FULL, quality); break
    case 'brickell': addBrickell(data, moduleIndex, FULL, quality); break
    case 'industrial': addIndustrial(data, moduleIndex, quality); break
    case 'midtown': addMidtown(data, moduleIndex, FULL, quality); break
    case 'family-transition':
      addFamily(data, route.family, moduleIndex, FRONT, quality, route.family === 'highway' ? 'toward-front' : undefined)
      addFamily(data, route.transitionTo ?? route.family, moduleIndex, BACK, quality, route.transitionTo === 'highway' ? 'toward-back' : undefined)
      break
    case 'coastal':
      addCoastal(data, moduleIndex, FULL, quality)
      break
    case 'downtown':
      addDowntown(data, moduleIndex, FULL, quality)
      break
    case 'neon':
      addDowntown(data, moduleIndex, FULL, quality, true)
      break
    case 'causeway':
      addCauseway(data, moduleIndex, FULL, quality)
      break
    case 'highway':
      addHighway(data, moduleIndex, FULL)
      break
    case 'residential':
      addResidential(data, moduleIndex, FULL, quality)
      break
    case 'coastal-to-downtown':
      addCoastal(data, moduleIndex, FRONT, quality)
      addDowntown(data, moduleIndex, BACK, quality)
      break
    case 'downtown-to-causeway':
      addDowntown(data, moduleIndex, FRONT, quality)
      addCauseway(data, moduleIndex, BACK, quality)
      break
    case 'causeway-to-highway':
      addCauseway(data, moduleIndex, FRONT, quality)
      addHighway(data, moduleIndex, BACK, 'toward-back')
      break
    case 'highway-to-downtown':
      addHighway(data, moduleIndex, FRONT, 'toward-front')
      addDowntown(data, moduleIndex, BACK, quality, true)
      break
    case 'downtown-to-residential':
      addDowntown(data, moduleIndex, FRONT, quality, true)
      addResidential(data, moduleIndex, BACK, quality)
      break
    case 'residential-to-coastal':
      addResidential(data, moduleIndex, FRONT, quality)
      addCoastal(data, moduleIndex, BACK, quality)
      break
  }
  for (const range of [FRONT, BACK]) {
    const family = range === FRONT ? route.family : route.transitionTo ?? route.family
    if (family === 'highway') continue
    const center = (range[0] + range[1]) / 2
    for (const side of [-1, 1]) data.accents.push(transform(side * 6.6, 0.055, center, 0.12, 0.025, range[1] - range[0], 0xeee5cf))
  }
  // Reserve sponsor parcels across neighbouring modules before curving the frontage.
  const lots = CRUISE_PLACES.map(place => ({
    station: CRUISE_ROUTE.findIndex(module => module.id === place.anchor.moduleId) * MODULE_LENGTH - place.anchor.localZ,
    x: place.anchor.x,
  }))
  for (const key of ['solids', 'accents', 'glass', 'lights', 'trunks', 'fronds'] as const) {
    data[key] = data[key].filter(item => !lots.some(lot => {
      const station = moduleIndex * MODULE_LENGTH - item.position.z
      const delta = Math.abs(((station - lot.station + WORLD_LENGTH / 2) % WORLD_LENGTH + WORLD_LENGTH) % WORLD_LENGTH - WORLD_LENGTH / 2)
      return item.position.x < -12 && item.position.y > .35 && Math.abs(item.position.x - lot.x) < 18 && delta < 21
    }))
  }
  // Rigid buildings turn at their station; long ground slabs/rails use 8m ribbons.
  for (const key of ['solids', 'accents', 'glass', 'lights', 'asphalt', 'concrete', 'curbs', 'signs', 'water', 'trunks', 'fronds'] as const) {
    data[key] = data[key].flatMap(item => {
      const ribbon = ['asphalt', 'concrete', 'curbs', 'water', 'accents'].includes(key)
        && item.scale.z > 8 && item.scale.y < 1.2 && item.quaternion.equals(IDENTITY)
      const pieces = ribbon ? Math.ceil(item.scale.z / 8) : 1
      return Array.from({ length: pieces }, (_, index) => {
        const span = item.scale.z / pieces
        const localZ = item.position.z + (index + .5) * span - item.scale.z / 2
        const pose = routeRelativePose(moduleIndex * MODULE_LENGTH, localZ, item.position.x)
        const turned = new THREE.Quaternion().setFromAxisAngle(UP, pose.yaw).multiply(item.quaternion)
        const result = { ...item, position: new THREE.Vector3(pose.x, item.position.y, pose.z), quaternion: turned, scale: item.scale.clone() }
        if (ribbon) result.scale.z = span + .09
        return result
      })
    })
  }
  return data
}

function applyTransforms(mesh: THREE.InstancedMesh, transforms: Transform[]) {
  const matrix = new THREE.Matrix4()
  for (let index = 0; index < transforms.length; index += 1) {
    const item = transforms[index]
    matrix.compose(item.position, item.quaternion, item.scale)
    mesh.setMatrixAt(index, matrix)
    if (item.color) mesh.setColorAt(index, item.color)
  }
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

function Instances({
  geometry,
  material,
  transforms,
  castShadow = false,
  receiveShadow = false,
  occluder = false,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  transforms: Transform[]
  castShadow?: boolean
  receiveShadow?: boolean
  occluder?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || transforms.length === 0) return
    applyTransforms(mesh, transforms)
    return () => {
      mesh.dispose()
    }
  }, [transforms])
  if (transforms.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, transforms.length]} castShadow={castShadow} receiveShadow={receiveShadow} userData={{ cruiseOccluder: occluder }} />
}

/** Fixed buffers are resampled in the car tangent frame; no 64m road corners. */
function RoadRibbon({ assets, runtime, left, right, y, marking = false }: {
  assets: WorldAssets; runtime: MutableRefObject<CruiseRuntime>; left: number; right: number; y: number; marking?: boolean
}) {
  const geometry = useMemo(() => {
    const samples = Math.ceil(WORLD_LENGTH / 8) + 1
    const mesh = new THREE.BufferGeometry()
    const position = new Float32Array(samples * 6), normal = new Float32Array(samples * 6), uv = new Float32Array(samples * 4)
    const indices: number[] = []
    for (let i = 0; i < samples; i++) {
      normal[i * 6 + 1] = normal[i * 6 + 4] = 1
      uv.set([0, 1 - i / (samples - 1), 1, 1 - i / (samples - 1)], i * 4)
      if (i < samples - 1) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2) }
    }
    mesh.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage))
    mesh.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
    mesh.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); mesh.setIndex(indices)
    return mesh
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(() => {
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    const samples = position.count / 2
    for (let i = 0; i < samples; i++) {
      const z = WORLD_MAX_Z - i / (samples - 1) * WORLD_LENGTH
      const a = routeRelativePose(runtime.current.distance, z, left), b = routeRelativePose(runtime.current.distance, z, right)
      position.setXYZ(i * 2, a.x, y, a.z); position.setXYZ(i * 2 + 1, b.x, y, b.z)
    }
    position.needsUpdate = true
  })
  return <mesh geometry={geometry} material={marking ? assets.roadMark : assets.roadAsphalt} frustumCulled={false} receiveShadow />
}

function ContinuousRoad({ assets, runtime }: { assets: WorldAssets; runtime: MutableRefObject<CruiseRuntime> }) {
  return <group>
    <RoadRibbon assets={assets} runtime={runtime} left={-7.1} right={7.1} y={ASPHALT_Y + .06} />
    {[-.13, .13].map(x => <RoadRibbon key={x} assets={assets} runtime={runtime} left={x - .055} right={x + .055} y={.061} marking />)}
  </group>
}

function RouteModule({
  assets,
  route,
  index,
  quality,
  authoredCoastal,
  authoredPalms,
  groupRef,
}: {
  assets: WorldAssets
  route: CruiseRouteModule
  index: number
  quality: CruiseQuality
  authoredCoastal: boolean
  authoredPalms: boolean
  groupRef: (group: THREE.Group | null) => void
}) {
  const data = useMemo(() => createModuleData(route, index, quality, authoredCoastal, authoredPalms), [route, index, quality, authoredCoastal, authoredPalms])
  return (
    <group ref={groupRef}>
      <Instances geometry={assets.box} material={assets.water} transforms={data.water} receiveShadow />
      <Instances geometry={assets.box} material={assets.asphalt} transforms={data.asphalt} receiveShadow />
      <Instances geometry={assets.box} material={assets.concrete} transforms={data.concrete} receiveShadow />
      <Instances geometry={assets.curb} material={assets.concrete} transforms={data.curbs} receiveShadow />
      <Instances geometry={assets.box} material={assets.sign} transforms={data.signs} />
      <Instances geometry={assets.box} material={assets.solid} transforms={data.solids} castShadow receiveShadow occluder />
      <Instances geometry={assets.box} material={assets.accent} transforms={data.accents} castShadow={quality === 'high'} receiveShadow />
      <Instances geometry={assets.box} material={assets.glass} transforms={data.glass} occluder />
      <Instances geometry={assets.box} material={assets.light} transforms={data.lights} />
      <Instances geometry={assets.cylinder} material={assets.trunk} transforms={data.trunks} castShadow={quality === 'high'} receiveShadow />
      <Instances geometry={assets.frond} material={assets.leaf} transforms={data.fronds} castShadow={quality === 'high'} />
    </group>
  )
}

export default function CruiseWorld({ runtime, quality, timeOfDay, weather, music }: CruiseWorldProps) {
  const assets = useMemo(createAssets, [])
  useEffect(() => {
    if (!music) return
    const cleanup = [installMiamiMaterial(assets.roadAsphalt,music,'road'),
      ...[assets.concrete,assets.accent,assets.sign,assets.trunk,assets.light].map(m=>installMiamiMaterial(m,music,'fixture')),
      ...[assets.solid,assets.glass].map(m=>installMiamiMaterial(m,music,'facade'))]
    return () => cleanup.forEach(dispose=>dispose())
  }, [assets,music])
  const [authoredCoastal, setAuthoredCoastal] = useState(false)
  const [authoredPalms, setAuthoredPalms] = useState(false)
  useLayoutEffect(() => { setAuthoredCoastal(false) }, [quality])
  const hotels = useMemo(() => CRUISE_ROUTE.flatMap((route, module): CoastalPlacement[] => {
    // Reuse the authored deco hotels in spaced coastal clusters, clear of our record shop.
    if (route.id === 'coastal-approach') return []
    const range = route.kind === 'coastal' ? FULL : route.kind === 'coastal-to-downtown' ? FRONT
      : route.kind === 'residential-to-coastal' ? BACK : null
    if (!range) return []
    const length = range[1] - range[0]
    const count = length > 40 && quality === 'high' ? 3 : 2
    return Array.from({ length: count }, (_, index) => ({
      module, z: range[0] + (index + 0.5) * length / count,
      variant: (module + index) % 2,
      scale: Math.min(1.4, (length / count - 1.6) / ((module + index) % 2 ? 16 : 12)),
    }))
  }), [quality])
  const look = useMemo(() => {
    const source = WORLD_LOOK[timeOfDay]
    const rainScale = weather === 'rain' ? 0.72 : 1
    return {
      road: new THREE.Color(source.road).multiplyScalar(rainScale),
      roadTint: new THREE.Color(0xd0d5d5).multiplyScalar(rainScale),
      solid: new THREE.Color(source.solid).multiplyScalar(rainScale),
      accent: new THREE.Color(source.accent).multiplyScalar(rainScale),
      concrete: new THREE.Color(source.concrete).multiplyScalar(rainScale),
      water: new THREE.Color(source.water).multiplyScalar(weather === 'rain' ? 0.8 : 1),
      light: new THREE.Color(source.light),
      roadRoughness: weather === 'rain' ? 0.28 : 0.96,
      roadMetalness: weather === 'rain' ? 0.14 : 0,
      glassEmissive: timeOfDay === 'night' ? 2.8 : timeOfDay === 'sunset' ? 0.08 : 0,
      lightStrength: timeOfDay === 'night' ? 1 : timeOfDay === 'sunset' ? 0.72 : 0.28,
    }
  }, [timeOfDay, weather])
  const moduleRefs = useRef<Array<THREE.Group | null>>(Array.from({ length: MODULE_COUNT }, () => null))

  useEffect(() => loadMeasuredRoad(([color, normal, roughness]) => {
    assets.roadColor = color
    assets.roadNormal = normal
    assets.roadRoughness = roughness
    assets.roadAsphalt.map = color
    assets.roadAsphalt.normalMap = normal
    assets.roadAsphalt.roughnessMap = roughness
    assets.roadAsphalt.needsUpdate = true
  }), [assets])

  useEffect(() => () => {
    assets.geometries.forEach((geometry) => geometry.dispose())
    assets.materials.forEach((material) => material.dispose())
    assets.textures.forEach((texture) => texture.dispose())
  }, [assets])

  useFrame((_, delta) => {
    const distance = runtime.current.distance

    assets.roadTravel.value = distance
    const blend = 1 - Math.exp(-Math.min(delta, 0.05) * 2.4)
    assets.roadAsphalt.color.lerp(look.roadTint, blend)
    assets.asphalt.color.lerp(look.road, blend)
    assets.solid.color.lerp(look.solid, blend)
    assets.accent.color.lerp(look.accent, blend)
    assets.concrete.color.lerp(look.concrete, blend)
    assets.water.color.lerp(look.water, blend)
    assets.light.color.lerp(look.light, blend)
    assets.roadAsphalt.roughness = THREE.MathUtils.lerp(assets.roadAsphalt.roughness, look.roadRoughness, blend)
    assets.roadAsphalt.metalness = THREE.MathUtils.lerp(assets.roadAsphalt.metalness, look.roadMetalness, blend)
    assets.asphalt.roughness = THREE.MathUtils.lerp(assets.asphalt.roughness, look.roadRoughness, blend)
    assets.asphalt.metalness = THREE.MathUtils.lerp(assets.asphalt.metalness, look.roadMetalness, blend)
    assets.glass.emissiveIntensity = THREE.MathUtils.lerp(assets.glass.emissiveIntensity, look.glassEmissive, blend)
    assets.light.opacity = THREE.MathUtils.lerp(assets.light.opacity, look.lightStrength, blend)
    // The road is stationary geometry; all surface channels travel together.
    const roadOffset = (distance / (WORLD_LENGTH / assets.roadColor.repeat.y)) % 1
    assets.roadColor.offset.y = roadOffset
    assets.roadNormal.offset.y = roadOffset
    assets.roadRoughness.offset.y = roadOffset
    assets.waterTexture.offset.y = (distance / 90) % 1
    for (let index = 0; index < MODULE_COUNT; index += 1) {
      const segment = moduleRefs.current[index]
      if (segment) {
        const localZ = moduleZ(index, distance), pose = routeRelativePose(distance, localZ)
        segment.position.set(pose.x, 0, pose.z); segment.rotation.y = pose.yaw
        segment.visible = localZ < 110 && localZ > (quality === 'low' ? -250 : quality === 'medium' ? -330 : -440)
      }
    }
  })

  return (
    <group dispose={null}>
      <ContinuousRoad assets={assets} runtime={runtime} />
      <AuthoredCoastal music={music} key={quality} quality={quality} timeOfDay={timeOfDay} placements={hotels} runtime={runtime} onReady={setAuthoredCoastal} />
      <AuthoredPalms music={music} quality={quality} runtime={runtime} onReady={setAuthoredPalms} />
      {MODULES.map(({ route, index }) => (
        <RouteModule
          key={`${quality}-${route.id}`}
          assets={assets}
          route={route}
          index={index}
          quality={quality}
          authoredCoastal={authoredCoastal}
          authoredPalms={authoredPalms}
          groupRef={(group) => {
            moduleRefs.current[index] = group
            if (group) {
              const pose = routeRelativePose(runtime.current.distance, moduleZ(index, runtime.current.distance))
              group.position.set(pose.x, 0, pose.z); group.rotation.y = pose.yaw
            }
          }}
        />
      ))}
    </group>
  )
}
