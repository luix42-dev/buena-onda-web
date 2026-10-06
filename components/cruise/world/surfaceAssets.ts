import * as THREE from 'three'
import { WORLD_LENGTH } from '@/lib/cruise/constants'

export type SurfaceAssets = {
  roadColor: THREE.DataTexture
  roadNormal: THREE.DataTexture
  roadRoughness: THREE.DataTexture
  concreteColor: THREE.DataTexture
  concreteNormal: THREE.DataTexture
  windowAtlas: THREE.DataTexture
  textures: THREE.Texture[]
}

const ROAD_SIZE = 512
const DETAIL_SIZE = 256

function hash(x: number, y: number, seed: number) {
  let value = Math.imul(x + seed * 1013, 374761393) + Math.imul(y - seed * 733, 668265263)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}

function smooth(value: number) {
  return value * value * (3 - 2 * value)
}

function periodicNoise(u: number, v: number, frequency: number, seed: number) {
  const px = u * frequency
  const py = v * frequency
  const x0 = Math.floor(px)
  const y0 = Math.floor(py)
  const x1 = (x0 + 1) % frequency
  const y1 = (y0 + 1) % frequency
  const tx = smooth(px - x0)
  const ty = smooth(py - y0)
  const a = THREE.MathUtils.lerp(hash(x0 % frequency, y0 % frequency, seed), hash(x1, y0 % frequency, seed), tx)
  const b = THREE.MathUtils.lerp(hash(x0 % frequency, y1, seed), hash(x1, y1, seed), tx)
  return THREE.MathUtils.lerp(a, b, ty)
}

function fractalNoise(u: number, v: number, seed: number) {
  return periodicNoise(u, v, 4, seed) * 0.5
    + periodicNoise(u, v, 16, seed + 1) * 0.29
    + periodicNoise(u, v, 64, seed + 2) * 0.15
    + periodicNoise(u, v, 128, seed + 3) * 0.06
}

function wrappedDelta(value: number, center: number) {
  const delta = Math.abs(value - center)
  return Math.min(delta, 1 - delta)
}

function repairMask(u: number, v: number) {
  const patches = [
    [0.18, 0.23, 0.2, 0.13, 0.08],
    [0.7, 0.62, 0.31, 0.18, -0.12],
    [0.43, 0.88, 0.15, 0.11, 0.16],
  ] as const
  let mask = 0
  for (let index = 0; index < patches.length; index += 1) {
    const [cx, cy, radiusX, radiusY, skew] = patches[index]
    const dx = wrappedDelta(u, cx)
    const dy = wrappedDelta(v, cy)
    const irregularity = (periodicNoise(u, v, 16, 71 + index) - 0.5) * 0.24
    const distance = Math.sqrt((dx / radiusX) ** 2 + ((dy + dx * skew) / radiusY) ** 2)
    mask = Math.max(mask, 1 - THREE.MathUtils.smoothstep(distance + irregularity, 0.72, 1.06))
  }
  return mask
}

function configureTexture(
  texture: THREE.DataTexture,
  name: string,
  colorSpace: THREE.ColorSpace,
  repeatX: number,
  repeatY: number,
) {
  texture.name = name
  texture.colorSpace = colorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function normalPixels(heights: Float32Array, size: number, strength: number) {
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = heights[y * size + (x + size - 1) % size]
      const right = heights[y * size + (x + 1) % size]
      const down = heights[((y + size - 1) % size) * size + x]
      const up = heights[((y + 1) % size) * size + x]
      const nx = (left - right) * strength
      const ny = (down - up) * strength
      const inverseLength = 1 / Math.sqrt(nx * nx + ny * ny + 1)
      const offset = (y * size + x) * 4
      pixels[offset] = Math.round((nx * inverseLength * 0.5 + 0.5) * 255)
      pixels[offset + 1] = Math.round((ny * inverseLength * 0.5 + 0.5) * 255)
      pixels[offset + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255)
      pixels[offset + 3] = 255
    }
  }
  return pixels
}

function createRoadTextures() {
  const color = new Uint8Array(ROAD_SIZE * ROAD_SIZE * 4)
  const roughness = new Uint8Array(ROAD_SIZE * ROAD_SIZE * 4)
  const heights = new Float32Array(ROAD_SIZE * ROAD_SIZE)

  for (let y = 0; y < ROAD_SIZE; y += 1) {
    for (let x = 0; x < ROAD_SIZE; x += 1) {
      const u = x / ROAD_SIZE
      const v = y / ROAD_SIZE
      const index = y * ROAD_SIZE + x
      const offset = index * 4
      const aggregate = fractalNoise(u, v, 19)
      const pinGrain = hash(x, y, 47)
      const patch = repairMask(u, v)
      const wheelWear = Math.max(0, Math.cos((u * 3 - 0.5) * Math.PI * 2)) ** 12
      const aggregateFleck = pinGrain > 0.975 ? 15 : pinGrain < 0.018 ? -12 : 0
      const base = 66 + aggregate * 25 + aggregateFleck
      const patchTone = -7 * patch + periodicNoise(u, v, 32, 109) * patch * 5

      color[offset] = THREE.MathUtils.clamp(Math.round(base + patchTone + 2), 38, 112)
      color[offset + 1] = THREE.MathUtils.clamp(Math.round(base + patchTone + 3), 40, 114)
      color[offset + 2] = THREE.MathUtils.clamp(Math.round(base + patchTone + 2), 39, 111)
      color[offset + 3] = 255

      const rough = THREE.MathUtils.clamp(Math.round(218 + aggregate * 27 - patch * 18 - wheelWear * 7), 170, 248)
      roughness[offset] = rough
      roughness[offset + 1] = rough
      roughness[offset + 2] = rough
      roughness[offset + 3] = 255
      heights[index] = aggregate * 0.7 + pinGrain * 0.13 - patch * 0.1
    }
  }

  const roadColor = configureTexture(
    new THREE.DataTexture(color, ROAD_SIZE, ROAD_SIZE, THREE.RGBAFormat),
    'road-albedo-512',
    THREE.SRGBColorSpace,
    3,
    200,
  )
  const roadNormal = configureTexture(
    new THREE.DataTexture(normalPixels(heights, ROAD_SIZE, 2.8), ROAD_SIZE, ROAD_SIZE, THREE.RGBAFormat),
    'road-normal-512',
    THREE.NoColorSpace,
    3,
    200,
  )
  const roadRoughness = configureTexture(
    new THREE.DataTexture(roughness, ROAD_SIZE, ROAD_SIZE, THREE.RGBAFormat),
    'road-roughness-512',
    THREE.NoColorSpace,
    3,
    200,
  )

  for (const texture of [roadColor, roadNormal, roadRoughness]) {
    texture.userData.physicalTileMeters = { width: 14.2 / 3, length: WORLD_LENGTH / 200 }
  }
  return { roadColor, roadNormal, roadRoughness }
}

function concreteHeight(u: number, v: number) {
  const panels = 4
  const panelU = u * panels
  const panelV = v * panels
  const edge = Math.min(panelU - Math.floor(panelU), 1 - (panelU - Math.floor(panelU)), panelV - Math.floor(panelV), 1 - (panelV - Math.floor(panelV)))
  const joint = 1 - THREE.MathUtils.smoothstep(edge, 0.018, 0.055)
  const bevel = THREE.MathUtils.smoothstep(edge, 0.045, 0.085)
  return bevel - joint * 0.3 + fractalNoise(u, v, 211) * 0.07
}

function createConcreteTextures() {
  const color = new Uint8Array(DETAIL_SIZE * DETAIL_SIZE * 4)
  const heights = new Float32Array(DETAIL_SIZE * DETAIL_SIZE)
  for (let y = 0; y < DETAIL_SIZE; y += 1) {
    for (let x = 0; x < DETAIL_SIZE; x += 1) {
      const u = x / DETAIL_SIZE
      const v = y / DETAIL_SIZE
      const index = y * DETAIL_SIZE + x
      const offset = index * 4
      const panelU = u * 4
      const panelV = v * 4
      const edge = Math.min(panelU - Math.floor(panelU), 1 - (panelU - Math.floor(panelU)), panelV - Math.floor(panelV), 1 - (panelV - Math.floor(panelV)))
      const joint = 1 - THREE.MathUtils.smoothstep(edge, 0.018, 0.06)
      const pores = hash(x, y, 227)
      const body = 178 + fractalNoise(u, v, 233) * 25 + (pores < 0.012 ? -22 : 0)
      color[offset] = THREE.MathUtils.clamp(Math.round(body - joint * 54 + 5), 86, 215)
      color[offset + 1] = THREE.MathUtils.clamp(Math.round(body - joint * 54 + 2), 84, 212)
      color[offset + 2] = THREE.MathUtils.clamp(Math.round(body - joint * 54 - 4), 80, 205)
      color[offset + 3] = 255
      heights[index] = concreteHeight(u, v) + (pores < 0.012 ? -0.2 : 0)
    }
  }
  return {
    concreteColor: configureTexture(
      new THREE.DataTexture(color, DETAIL_SIZE, DETAIL_SIZE, THREE.RGBAFormat),
      'concrete-panel-albedo-256',
      THREE.SRGBColorSpace,
      1,
      12,
    ),
    concreteNormal: configureTexture(
      new THREE.DataTexture(normalPixels(heights, DETAIL_SIZE, 2.2), DETAIL_SIZE, DETAIL_SIZE, THREE.RGBAFormat),
      'concrete-panel-normal-256',
      THREE.NoColorSpace,
      1,
      12,
    ),
  }
}

function createWindowAtlas() {
  const pixels = new Uint8Array(DETAIL_SIZE * DETAIL_SIZE * 4)
  const cells = 4
  const cellSize = DETAIL_SIZE / cells
  for (let y = 0; y < DETAIL_SIZE; y += 1) {
    for (let x = 0; x < DETAIL_SIZE; x += 1) {
      const column = Math.floor(x / cellSize)
      const row = Math.floor(y / cellSize)
      const localX = x % cellSize
      const localY = y % cellSize
      const frame = localX < 3 || localY < 3 || localX >= cellSize - 3 || localY >= cellSize - 3
      const cellSeed = row * cells + column
      const lit = hash(column, row, 307) > 0.62
      const shade = periodicNoise(x / DETAIL_SIZE, y / DETAIL_SIZE, 16, 313)
      const glint = Math.max(0, 1 - Math.abs(localX / cellSize - 0.68) * 13) * (0.25 + localY / cellSize * 0.28)
      const blind = lit && localY > cellSize * 0.2 && localY < cellSize * 0.86 && localY % 9 < 2 ? 8 : 0
      const interior = lit ? 20 + hash(cellSeed, 0, 331) * 18 : 0
      const base = frame ? 21 : 25 + shade * 18 + interior
      const offset = (y * DETAIL_SIZE + x) * 4
      pixels[offset] = Math.round(base + (lit ? 12 : 0) + glint * 21 + blind)
      pixels[offset + 1] = Math.round(base + (lit ? 7 : 8) + glint * 27 + blind)
      pixels[offset + 2] = Math.round(base + (lit ? 0 : 13) + glint * 31 + blind)
      pixels[offset + 3] = 255
    }
  }
  return configureTexture(
    new THREE.DataTexture(pixels, DETAIL_SIZE, DETAIL_SIZE, THREE.RGBAFormat),
    'window-dark-glass-atlas-256',
    THREE.SRGBColorSpace,
    1,
    1,
  )
}

export function createSurfaceAssets(): SurfaceAssets {
  const road = createRoadTextures()
  const concrete = createConcreteTextures()
  const windowAtlas = createWindowAtlas()
  const textures: THREE.Texture[] = [
    road.roadColor,
    road.roadNormal,
    road.roadRoughness,
    concrete.concreteColor,
    concrete.concreteNormal,
    windowAtlas,
  ]
  return { ...road, ...concrete, windowAtlas, textures }
}
