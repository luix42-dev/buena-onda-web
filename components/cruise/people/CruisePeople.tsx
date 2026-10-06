'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import RiggedPeople from './RiggedPeople'

import { HERO_X, MODULE_COUNT, QUALITY, moduleZ } from '@/lib/cruise/constants'
import { CRUISE_ROUTE } from '@/lib/cruise/routes'
import type {
  CruiseQuality,
  CruiseRouteModule,
  CruiseRuntime,
  CruiseTimeOfDay,
  CruiseWeather,
} from '@/lib/cruise/types'

export type CruisePeopleProps = {
  runtime: MutableRefObject<CruiseRuntime>
  quality: CruiseQuality
  timeOfDay?: CruiseTimeOfDay
  weather?: CruiseWeather
}

type Walkway = 'coastal' | 'downtown' | 'residential'

type WalkableSection = {
  minZ: number
  maxZ: number
  walkway: Walkway
}

export type PersonPlacement = {
  moduleIndex: number
  x: number
  localZ: number
  width: number
  height: number
  variant: number
  phase: number
  motion: number
}

type PeopleAssets = {
  geometry: THREE.PlaneGeometry
  material: THREE.ShaderMaterial
  texture: THREE.DataTexture
}

const ATLAS_VARIANTS = 8
const ATLAS_CELL_WIDTH = 32
const ATLAS_HEIGHT = 64
const HERO_CLEAR_RADIUS = 15
const HERO_CLEAR_RADIUS_SQ = HERO_CLEAR_RADIUS * HERO_CLEAR_RADIUS
const GROUND_Y = 0.21

const VERTEX_SHADER = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>

  attribute float aVariant;
  attribute float aPhase;
  attribute float aMotion;

  uniform float uTime;

  varying vec2 vAtlasUv;

  void main() {
    vec4 worldCenter = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec4 mvPosition = viewMatrix * worldCenter;
    float width = length(instanceMatrix[0].xyz);
    float height = length(instanceMatrix[1].xyz);
    float stride = sin(uTime * 1.45 + aPhase) * aMotion;
    float sway = stride * 0.035;
    float bob = abs(cos(uTime * 1.45 + aPhase)) * aMotion * 0.018;

    // The plane origin is at the feet. Offsetting in view space makes every instance a billboard.
    mvPosition.xy += vec2(position.x * width + sway, position.y * height + bob);
    gl_Position = projectionMatrix * mvPosition;

    float insetU = mix(0.015625, 0.984375, uv.x);
    vAtlasUv = vec2((aVariant + insetU) / 8.0, uv.y);

    #include <fog_vertex>
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>

  uniform sampler2D uMap;
  uniform float uLight;

  varying vec2 vAtlasUv;

  void main() {
    vec4 person = texture2D(uMap, vAtlasUv);
    if (person.a < 0.28) discard;
    gl_FragColor = vec4(person.rgb * uLight, person.a);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

function random(seed: number) {
  const value = Math.sin(seed * 78.233 + 31.417) * 43758.5453
  return value - Math.floor(value)
}

function sectionsFor(route: CruiseRouteModule): readonly WalkableSection[] {
  switch (route.kind) {
    case 'coastal':
    case 'beach':
    case 'waterfront':
      return [{ minZ: -32, maxZ: 32, walkway: 'coastal' }]
    case 'downtown':
    case 'neon':
    case 'brickell':
      return [{ minZ: -32, maxZ: 32, walkway: 'downtown' }]
    case 'residential':
    case 'midtown':
      return [{ minZ: -32, maxZ: 32, walkway: 'residential' }]
    case 'coastal-to-downtown':
      return [
        { minZ: -32, maxZ: 0, walkway: 'downtown' },
        { minZ: 0, maxZ: 32, walkway: 'coastal' },
      ]
    case 'downtown-to-causeway':
      return [{ minZ: 0, maxZ: 32, walkway: 'downtown' }]
    case 'highway-to-downtown':
      return [{ minZ: -32, maxZ: 0, walkway: 'downtown' }]
    case 'downtown-to-residential':
      return [
        { minZ: -32, maxZ: 0, walkway: 'residential' },
        { minZ: 0, maxZ: 32, walkway: 'downtown' },
      ]
    case 'residential-to-coastal':
      return [
        { minZ: -32, maxZ: 0, walkway: 'coastal' },
        { minZ: 0, maxZ: 32, walkway: 'residential' },
      ]
    case 'causeway':
    case 'causeway-to-highway':
    case 'highway':
    case 'industrial':
      return []
    case 'family-transition': {
      const sections: WalkableSection[] = []
      const front = route.family
      const back = route.transitionTo ?? front
      if (front === 'coastal' || front === 'downtown' || front === 'residential') {
        sections.push({ minZ: 0, maxZ: 32, walkway: front })
      }
      if (back === 'coastal' || back === 'downtown' || back === 'residential') {
        sections.push({ minZ: -32, maxZ: 0, walkway: back })
      }
      return sections
    }
  }
}

function walkwayX(walkway: Walkway, side: -1 | 1, seed: number) {
  const offset = random(seed) * 0.36
  switch (walkway) {
    case 'coastal':
      return side * (side > 0 ? 9.15 + offset : 8.65 + offset)
    case 'downtown':
      return side * (8.05 + offset)
    case 'residential':
      return side * (8.15 + offset)
  }
}

function createPlacements(quality: CruiseQuality): PersonPlacement[] {
  const perModule = QUALITY[quality].pedestriansPerModule
  const placements: PersonPlacement[] = []

  CRUISE_ROUTE.forEach((route, moduleIndex) => {
    const sections = sectionsFor(route)
    if (sections.length === 0) return

    for (let index = 0; index < perModule; index += 1) {
      const section = sections[index % sections.length]
      const sectionMember = Math.floor(index / sections.length)
      const sectionCount = Math.ceil((perModule - (index % sections.length)) / sections.length)
      const cluster = Math.floor(sectionMember / 2)
      const clusterCount = Math.ceil(sectionCount / 2)
      const pairOffset = sectionMember % 2 === 0 ? -0.62 : 0.62
      const usableLength = section.maxZ - section.minZ - 8
      const seed = moduleIndex * 137 + index * 29 + 17
      const clusterZ = section.minZ + 4 + ((cluster + 0.5) / clusterCount) * usableLength
      const localZ = THREE.MathUtils.clamp(
        clusterZ + pairOffset + (random(seed + 1) - 0.5) * 0.55,
        section.minZ + 3,
        section.maxZ - 3,
      )
      const promenadeBias = route.id === 'coastal-promenade' && index < Math.ceil(perModule * 0.7)
      const side: -1 | 1 = promenadeBias || random(seed + 2) > 0.5 ? 1 : -1

      placements.push({
        moduleIndex,
        x: walkwayX(section.walkway, side, seed + 3),
        localZ,
        width: 0.58 + random(seed + 4) * 0.18,
        height: 1.52 + random(seed + 5) * 0.34,
        variant: Math.floor(random(seed + 6) * ATLAS_VARIANTS),
        phase: random(seed + 7) * Math.PI * 2,
        motion: random(seed + 8) > 0.48 ? 1 : 0.28,
      })
    }
  })

  return placements
}

function setPixel(
  pixels: Uint8Array,
  variant: number,
  x: number,
  y: number,
  color: readonly [number, number, number],
) {
  if (x < 0 || x >= ATLAS_CELL_WIDTH || y < 0 || y >= ATLAS_HEIGHT) return
  const atlasWidth = ATLAS_CELL_WIDTH * ATLAS_VARIANTS
  const offset = (y * atlasWidth + variant * ATLAS_CELL_WIDTH + x) * 4
  pixels[offset] = color[0]
  pixels[offset + 1] = color[1]
  pixels[offset + 2] = color[2]
  pixels[offset + 3] = 255
}

function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSq = dx * dx + dy * dy
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSq))
  return Math.hypot(x - (x1 + dx * t), y - (y1 + dy * t))
}

function createPeopleTexture() {
  const width = ATLAS_CELL_WIDTH * ATLAS_VARIANTS
  const pixels = new Uint8Array(width * ATLAS_HEIGHT * 4)
  const skin = [
    [91, 57, 42], [121, 78, 56], [157, 105, 75], [188, 135, 99],
    [213, 167, 127], [111, 68, 48], [176, 119, 82], [225, 181, 143],
  ] as const
  const tops = [
    [36, 82, 91], [177, 72, 65], [222, 170, 69], [54, 64, 72],
    [219, 216, 199], [48, 119, 100], [139, 73, 107], [54, 92, 142],
  ] as const
  const bottoms = [
    [35, 39, 42], [49, 67, 82], [211, 203, 180], [30, 34, 35],
    [98, 74, 60], [32, 53, 64], [42, 42, 47], [182, 133, 72],
  ] as const

  for (let variant = 0; variant < ATLAS_VARIANTS; variant += 1) {
    const centerX = 15.5 + (variant % 3 - 1) * 0.35
    const shoulder = variant % 2 === 0 ? 7.2 : 6.3
    const waist = variant % 2 === 0 ? 5.1 : 5.8
    const leftArmEnd = variant % 3 === 0 ? 10 : 8
    const rightArmEnd = variant % 4 === 0 ? 22 : 23

    for (let y = 0; y < ATLAS_HEIGHT; y += 1) {
      for (let x = 0; x < ATLAS_CELL_WIDTH; x += 1) {
        const px = x + 0.5
        const py = y + 0.5
        const legProgress = Math.max(0, Math.min(1, (py - 2) / 23))
        const leftLegX = centerX - 2.5 - legProgress * (variant % 2 === 0 ? 1.2 : 0.25)
        const rightLegX = centerX + 2.5 + legProgress * (variant % 2 === 0 ? 0.5 : 1.35)
        if (
          py >= 2 && py <= 26
          && (Math.abs(px - leftLegX) < 1.8 || Math.abs(px - rightLegX) < 1.8)
        ) setPixel(pixels, variant, x, y, bottoms[variant])

        const torsoProgress = Math.max(0, Math.min(1, (py - 24) / 23))
        const torsoHalfWidth = waist + (shoulder - waist) * torsoProgress
        if (py >= 23 && py <= 47 && Math.abs(px - centerX) <= torsoHalfWidth) {
          setPixel(pixels, variant, x, y, tops[variant])
        }

        if (
          distanceToSegment(px, py, centerX - shoulder + 1, 44, leftArmEnd, 26) < 2.05
          || distanceToSegment(px, py, centerX + shoulder - 1, 44, rightArmEnd, 27) < 2.05
        ) setPixel(pixels, variant, x, y, skin[variant])

        const headRadius = variant % 3 === 1 ? 5.5 : 5
        if (Math.hypot(px - centerX, py - 54) <= headRadius) {
          setPixel(pixels, variant, x, y, skin[variant])
        }

        const hairLine = variant % 2 === 0 ? 55 : 56.5
        if (py >= hairLine && Math.hypot(px - centerX, py - 54) <= headRadius + 0.2) {
          setPixel(pixels, variant, x, y, variant % 3 === 0 ? [29, 24, 22] : [62, 43, 31])
        }

        if (variant === 2 && px > centerX + 5 && px < centerX + 10 && py > 29 && py < 39) {
          setPixel(pixels, variant, x, y, [42, 73, 76])
        }
        if (variant === 6 && py > 59 && Math.abs(px - centerX) < 6.2) {
          setPixel(pixels, variant, x, y, [225, 190, 106])
        }
      }
    }
  }

  const texture = new THREE.DataTexture(pixels, width, ATLAS_HEIGHT, THREE.RGBAFormat)
  texture.name = 'CruisePeopleSilhouetteAtlas'
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function createAssets(placements: readonly PersonPlacement[]): PeopleAssets {
  const geometry = new THREE.PlaneGeometry(1, 1)
  geometry.translate(0, 0.5, 0)
  geometry.setAttribute(
    'aVariant',
    new THREE.InstancedBufferAttribute(new Float32Array(placements.map((person) => person.variant)), 1),
  )
  geometry.setAttribute(
    'aPhase',
    new THREE.InstancedBufferAttribute(new Float32Array(placements.map((person) => person.phase)), 1),
  )
  geometry.setAttribute(
    'aMotion',
    new THREE.InstancedBufferAttribute(new Float32Array(placements.map((person) => person.motion)), 1),
  )

  const texture = createPeopleTexture()
  const material = new THREE.ShaderMaterial({
    name: 'CruisePeopleBillboardMaterial',
    // merge() clones textures too; keep the sampled atlas owned by assets.texture
    // so repeated world mounts dispose the actual GPU texture, not an unused original.
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      uMap: { value: texture }, uTime: { value: 0 }, uLight: { value: 1 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    fog: true,
  })

  return { geometry, material, texture }
}

function lightLevel(timeOfDay: CruiseTimeOfDay, weather: CruiseWeather) {
  const base = timeOfDay === 'night' ? 0.74 : timeOfDay === 'sunset' ? 0.9 : 1
  return weather === 'rain' ? base * 0.87 : base
}

function updateInstances(
  mesh: THREE.InstancedMesh,
  placements: readonly PersonPlacement[],
  distance: number,
  cameraX: number,
  cameraZ: number,
  modulePositions: Float32Array,
  matrix: THREE.Matrix4,
  rigged: ReadonlySet<number>,
) {
  for (let index = 0; index < MODULE_COUNT; index += 1) {
    modulePositions[index] = moduleZ(index, distance)
  }

  for (let index = 0; index < placements.length; index += 1) {
    const person = placements[index]
    const worldZ = modulePositions[person.moduleIndex] + person.localZ
    const heroDx = person.x - HERO_X
    const cameraDx = person.x - cameraX
    const cameraDz = worldZ - cameraZ
    const hidden = rigged.has(index) || heroDx * heroDx + worldZ * worldZ < HERO_CLEAR_RADIUS_SQ
      || cameraDx * cameraDx + cameraDz * cameraDz < HERO_CLEAR_RADIUS_SQ
    const scale = hidden ? 0 : 1

    matrix.makeScale(person.width * scale, person.height * scale, scale)
    matrix.setPosition(person.x, GROUND_Y, worldZ)
    mesh.setMatrixAt(index, matrix)
  }

  mesh.instanceMatrix.needsUpdate = true
}

function PeoplePool({
  runtime,
  quality,
  timeOfDay,
  weather,
}: CruisePeopleProps) {
  const placements = useMemo(() => createPlacements(quality), [quality])
  const assets = useMemo(() => createAssets(placements), [placements])
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const modulePositions = useMemo(() => new Float32Array(MODULE_COUNT), [])
  const rigged = useRef(new Set<number>())

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    updateInstances(mesh, placements, runtime.current.distance, Number.POSITIVE_INFINITY, 0, modulePositions, matrix, rigged.current)
    return () => {
      mesh.dispose()
    }
  }, [matrix, modulePositions, placements, runtime])

  useEffect(() => {
    assets.material.uniforms.uLight.value = lightLevel(timeOfDay ?? 'sunset', weather ?? 'clear')
  }, [assets, timeOfDay, weather])

  useEffect(() => () => {
    assets.geometry.dispose()
    assets.material.dispose()
    assets.texture.dispose()
  }, [assets])

  useFrame(({ camera }) => {
    if (quality === 'low') document.documentElement.dataset.cruisePeople = JSON.stringify({ tier: quality, rigged: 0, pool: 0, impostors: placements.length })
    assets.material.uniforms.uTime.value = runtime.current.time
    const mesh = meshRef.current
    if (!mesh) return
    updateInstances(
      mesh,
      placements,
      runtime.current.distance,
      camera.position.x,
      camera.position.z,
      modulePositions,
      matrix,
      rigged.current,
    )
  })

  return (
    <group><instancedMesh
      ref={meshRef}
      args={[assets.geometry, assets.material, placements.length]}
      frustumCulled={false}
      renderOrder={2}
    />{quality !== 'low' && <RiggedPeople placements={placements} runtime={runtime} quality={quality} selected={rigged} />}</group>
  )
}

export default function CruisePeople(props: CruisePeopleProps) {
  return <PeoplePool {...props} quality={props.quality} />
}
