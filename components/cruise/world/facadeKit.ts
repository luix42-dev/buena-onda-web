import * as THREE from 'three'

import type { CruiseQuality } from '@/lib/cruise/types'

export type FacadeTransform = {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  scale: THREE.Vector3
  color?: THREE.Color
}

export type FacadeBatches = {
  solids: FacadeTransform[]
  accents: FacadeTransform[]
  glass: FacadeTransform[]
  lights: FacadeTransform[]
}

type Side = -1 | 1

const IDENTITY = new THREE.Quaternion()
const DARK_GLASS = [0x17313a, 0x203d45, 0x29464d, 0x1c3540]
const ROOF_DARK = 0x394243

function random(seed: number) {
  const value = Math.sin(seed * 91.345 + 17.123) * 47453.5453
  return value - Math.floor(value)
}

export function facadeTransform(
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color?: number,
): FacadeTransform {
  return {
    position: new THREE.Vector3(x, y, z),
    quaternion: IDENTITY.clone(),
    scale: new THREE.Vector3(sx, sy, sz),
    color: color === undefined ? undefined : new THREE.Color(color),
  }
}

function addReveal(
  batches: FacadeBatches,
  side: Side,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  frameColor: number,
  glassColor: number,
) {
  const frameX = x - side * 0.04
  const glassX = x + side * 0.13
  const rail = 0.14
  batches.glass.push(facadeTransform(glassX, y, z, 0.1, height - rail * 2, width - rail * 2, glassColor))
  batches.accents.push(
    facadeTransform(frameX, y, z - width * 0.5, 0.24, height, rail, frameColor),
    facadeTransform(frameX, y, z + width * 0.5, 0.24, height, rail, frameColor),
    facadeTransform(frameX, y - height * 0.5, z, 0.25, rail, width, frameColor),
    facadeTransform(frameX, y + height * 0.5, z, 0.25, rail, width, frameColor),
  )
}

export function addCommercialFacade(
  batches: FacadeBatches,
  options: {
    side: Side
    facadeX: number
    centerZ: number
    depth: number
    height: number
    columns: number
    seed: number
    quality: CruiseQuality
    frameColor: number
    variant: 'deco' | 'balcony' | 'tower'
  },
) {
  const { side, facadeX, centerZ, depth, height, columns, seed, quality, frameColor, variant } = options
  const floors = Math.max(2, Math.min(11, Math.floor((height - 2.2) / 3.15)))
  const bottom = 3.25
  const top = Math.max(bottom + 2.2, height - 1.15)
  const facadeHeight = top - bottom
  const story = facadeHeight / floors
  const span = depth * 0.8
  const bay = span / columns
  const zMin = centerZ - span * 0.5
  const glassX = facadeX + side * 0.14
  const frameX = facadeX - side * 0.045

  for (let floor = 0; floor < floors; floor += 1) {
    const y = bottom + (floor + 0.5) * story
    const paneHeight = Math.max(1.1, story - 0.62)
    for (let column = 0; column < columns; column += 1) {
      const z = zMin + (column + 0.5) * bay
      const glassColor = DARK_GLASS[Math.floor(random(seed + floor * 19 + column * 7) * DARK_GLASS.length)]
      batches.glass.push(facadeTransform(glassX, y, z, 0.1, paneHeight, Math.max(0.45, bay - 0.32), glassColor))
      if (random(seed + floor * 31 + column * 11) > 0.76) {
        batches.lights.push(facadeTransform(glassX - side * 0.018, y - paneHeight * 0.28, z, 0.018, 0.08, Math.max(0.3, bay - 0.55), 0xe6a765))
      }
    }
  }

  // One continuous frame grid makes each pane sit inside a real reveal.
  for (let column = 0; column <= columns; column += 1) {
    batches.accents.push(facadeTransform(frameX, bottom + facadeHeight * 0.5, zMin + column * bay, 0.27, facadeHeight + 0.3, 0.15, frameColor))
  }
  for (let floor = 0; floor <= floors; floor += 1) {
    batches.accents.push(facadeTransform(frameX, bottom + floor * story, centerZ, 0.28, 0.2, span + 0.18, frameColor))
  }

  if (variant === 'deco') {
    const finCount = quality === 'low' ? 2 : 3
    for (let index = 0; index < finCount; index += 1) {
      const z = centerZ + (index - (finCount - 1) * 0.5) * span * 0.34
      batches.accents.push(facadeTransform(facadeX - side * 0.26, height * 0.58, z, 0.58, height * 0.78, 0.2, frameColor))
    }
    batches.accents.push(facadeTransform(facadeX - side * 0.2, height - 0.55, centerZ, 0.46, 0.55, span * 0.72, frameColor))
  }

  if (variant === 'balcony') {
    const balconyLevels = quality === 'low' ? 2 : Math.min(4, Math.max(2, Math.floor(floors / 2)))
    for (let level = 0; level < balconyLevels; level += 1) {
      const floor = Math.min(floors - 1, 1 + level * 2)
      const y = bottom + (floor + 0.05) * story
      const frontX = facadeX - side * 0.78
      batches.accents.push(
        facadeTransform(facadeX - side * 0.42, y, centerZ, 0.95, 0.16, span * 0.9, frameColor),
        facadeTransform(frontX, y + 0.68, centerZ, 0.12, 0.1, span * 0.88, ROOF_DARK),
      )
      const posts = quality === 'low' ? 3 : 5
      for (let post = 0; post < posts; post += 1) {
        const z = centerZ - span * 0.44 + post * span * 0.88 / (posts - 1)
        batches.accents.push(facadeTransform(frontX, y + 0.38, z, 0.11, 0.72, 0.11, ROOF_DARK))
      }
    }
  }
}

export function addStorefrontFacade(
  batches: FacadeBatches,
  options: {
    side: Side
    facadeX: number
    z: number
    width: number
    seed: number
    frameColor: number
    neon: boolean
  },
) {
  const { side, facadeX, z, width, seed, frameColor, neon } = options
  const recessX = facadeX + side * 0.2
  const outerX = facadeX - side * 0.07
  const canopyX = facadeX - side * 0.48
  const displayWidth = Math.max(1.25, width * 0.3)
  const doorZ = z + width * 0.25

  batches.glass.push(
    facadeTransform(recessX, 1.62, z - width * 0.2, 0.1, 2.35, displayWidth, DARK_GLASS[seed % DARK_GLASS.length]),
    facadeTransform(recessX, 1.62, doorZ, 0.1, 2.35, Math.max(0.88, width * 0.18), 0x142a32),
  )
  batches.accents.push(
    facadeTransform(outerX, 0.42, z, 0.3, 0.68, width * 0.88, 0x41494a),
    facadeTransform(outerX, 2.95, z, 0.32, 0.22, width * 0.92, frameColor),
    facadeTransform(outerX, 1.68, z - width * 0.42, 0.3, 2.72, 0.18, frameColor),
    facadeTransform(outerX, 1.68, z + width * 0.42, 0.3, 2.72, 0.18, frameColor),
    facadeTransform(outerX, 1.68, z + width * 0.08, 0.3, 2.72, 0.16, frameColor),
    facadeTransform(canopyX, 3.18, z, 1.05, 0.18, width * 0.78, frameColor),
    facadeTransform(canopyX - side * 0.47, 2.78, z, 0.1, 0.62, width * 0.78, frameColor),
    facadeTransform(recessX - side * 0.02, 1.62, doorZ, 0.12, 0.1, Math.max(0.64, width * 0.13), 0xaeb2aa),
  )
  if (neon) {
    batches.lights.push(facadeTransform(canopyX - side * 0.55, 3.04, z, 0.05, 0.1, width * 0.58, 0x5de5dc))
  }
}

export function addRoofDetails(
  batches: FacadeBatches,
  options: {
    side: Side
    centerX: number
    width: number
    centerZ: number
    depth: number
    height: number
    seed: number
    parapetColor: number
    quality: CruiseQuality
  },
) {
  const { side, centerX, width, centerZ, depth, height, seed, parapetColor, quality } = options
  const roofY = height + 0.48
  batches.solids.push(
    facadeTransform(centerX - side * width * 0.5, roofY, centerZ, 0.28, 0.96, depth, parapetColor),
    facadeTransform(centerX + side * width * 0.5, roofY, centerZ, 0.28, 0.96, depth, parapetColor),
    facadeTransform(centerX, roofY, centerZ - depth * 0.5, width, 0.96, 0.28, parapetColor),
    facadeTransform(centerX, roofY, centerZ + depth * 0.5, width, 0.96, 0.28, parapetColor),
  )
  const equipment = quality === 'low' ? 1 : 2
  for (let index = 0; index < equipment; index += 1) {
    const equipmentWidth = 1.35 + random(seed + index) * 1.2
    const x = centerX + (random(seed + 5 + index) - 0.5) * width * 0.38
    const z = centerZ + (random(seed + 9 + index) - 0.5) * depth * 0.42
    batches.accents.push(
      facadeTransform(x, height + 1.0, z, equipmentWidth, 1.0, 1.35, ROOF_DARK),
      facadeTransform(x, height + 1.54, z, equipmentWidth * 0.72, 0.08, 1.0, 0x697071),
    )
  }
  if (quality !== 'low' && height > 16) {
    batches.accents.push(facadeTransform(centerX, height + 3.1, centerZ, 0.1, 4.6, 0.1, ROOF_DARK))
  }
}

export function addResidentialFacade(
  batches: FacadeBatches,
  options: {
    side: Side
    facadeX: number
    centerZ: number
    depth: number
    height: number
    seed: number
    frameColor: number
  },
) {
  const { side, facadeX, centerZ, depth, height, seed, frameColor } = options
  const span = depth * 0.72
  const windowWidth = Math.max(1.25, span * 0.2)
  const windowY = Math.min(height - 1.15, 2.3)
  addReveal(batches, side, facadeX, windowY, centerZ - span * 0.27, windowWidth, 1.45, frameColor, DARK_GLASS[seed % DARK_GLASS.length])
  addReveal(batches, side, facadeX, windowY, centerZ + span * 0.02, windowWidth, 1.45, frameColor, DARK_GLASS[(seed + 1) % DARK_GLASS.length])

  const doorZ = centerZ + span * 0.34
  batches.glass.push(facadeTransform(facadeX + side * 0.2, 1.45, doorZ, 0.1, 2.35, Math.max(0.78, span * 0.14), 0x14282e))
  batches.accents.push(
    facadeTransform(facadeX - side * 0.05, 1.55, doorZ - span * 0.09, 0.28, 2.7, 0.16, frameColor),
    facadeTransform(facadeX - side * 0.05, 1.55, doorZ + span * 0.09, 0.28, 2.7, 0.16, frameColor),
    facadeTransform(facadeX - side * 0.05, 2.9, doorZ, 0.28, 0.18, span * 0.18, frameColor),
    facadeTransform(facadeX - side * 0.42, 3.03, doorZ, 0.9, 0.16, span * 0.24, frameColor),
  )
}
