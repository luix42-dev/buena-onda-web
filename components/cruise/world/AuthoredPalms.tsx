'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

import type { MusicAudio } from '@/lib/cruise/music-audio'
import { installMiamiMaterial } from '../music/miamiMaterials'
import { routeRelativePose } from '@/lib/cruise/routePath'
import { MODULE_LENGTH, moduleZ } from '@/lib/cruise/constants'
import { CRUISE_ROUTE } from '@/lib/cruise/routes'
import type { CruiseQuality, CruiseRuntime } from '@/lib/cruise/types'

const PALM_ASSETS = [
  '/cruise/environment/palms/yughues-palm.glb',
] as const

const FULL = [-MODULE_LENGTH * 0.5, MODULE_LENGTH * 0.5] as const
const BACK = [-MODULE_LENGTH * 0.5, 0] as const
const FRONT = [0, MODULE_LENGTH * 0.5] as const

type Part = {
  geometry: THREE.BufferGeometry
  material: THREE.Material | THREE.Material[]
  matrix: THREE.Matrix4
}

type PalmModel = {
  parts: Part[]
  geometries: Set<THREE.BufferGeometry>
  materials: Set<THREE.Material>
  textures: Set<THREE.Texture>
}

type PalmPlacement = {
  module: number
  x: number
  z: number
  scale: number
  width: number
  rotation: number
  lean: number
  variant: number
}

function random(seed: number) {
  const value = Math.sin(seed * 91.345 + 17.123) * 47453.5453
  return value - Math.floor(value)
}

function disposeModel(model: PalmModel) {
  model.geometries.forEach(value => value.dispose())
  model.materials.forEach(value => value.dispose())
  model.textures.forEach(value => value.dispose())
}

function extractModel(scene: THREE.Object3D): PalmModel {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const parts: Part[] = []

  scene.updateMatrixWorld(true)
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of sourceMaterials) {
      materials.add(material)
      for (const value of Object.values(material)) {
        if (!(value instanceof THREE.Texture)) continue
        value.anisotropy = 4
        textures.add(value)
      }
    }
    parts.push({ geometry: object.geometry, material: object.material, matrix: object.matrixWorld.clone() })
  })

  return { parts, geometries, materials, textures }
}

function coastalRange(kind: (typeof CRUISE_ROUTE)[number]['kind']) {
  if (kind === 'coastal') return FULL
  if (kind === 'coastal-to-downtown') return FRONT
  if (kind === 'residential-to-coastal') return BACK
  return null
}

function createPlacements(quality: CruiseQuality): PalmPlacement[][] {
  const byVariant = PALM_ASSETS.map(() => [] as PalmPlacement[])
  const count = quality === 'low' ? 2 : quality === 'medium' ? 3 : 4

  CRUISE_ROUTE.forEach((route, module) => {
    const range = coastalRange(route.kind)
    if (!range) return
    const length = range[1] - range[0]
    for (let index = 0; index < count; index += 1) {
      const seed = module * 97 + index * 19
      const variant = (module * 2 + index) % PALM_ASSETS.length
      byVariant[variant].push({
        module,
        x: 11.8 + (index % 2) * 2.2,
        z: range[0] + (index + 0.55) * length / count,
        scale: 0.65 + random(seed + 23) * 0.18,
        width: 1.05 + random(seed + 59) * 0.25,
        rotation: random(seed + 31) * Math.PI * 2,
        lean: (random(seed + 47) - 0.5) * 0.1,
        variant,
      })
    }
  })

  return byVariant
}

function PalmPart({
  part,
  placements,
  runtime, quality,
}: {
  part: Part
  placements: PalmPlacement[]
  runtime: MutableRefObject<CruiseRuntime>
  quality: CruiseQuality
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), matrix: new THREE.Matrix4() }), [])

  useEffect(() => {
    const current = mesh.current
    current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    return () => { current?.dispose() }
  }, [placements.length])

  useFrame(() => {
    const current = mesh.current
    if (!current) return
    let visibleCount = 0
    for (const placement of placements) {
      const z = moduleZ(placement.module, runtime.current.distance) + placement.z
      if (z < -230 || z > 65) continue
      const pose = routeRelativePose(runtime.current.distance, z, placement.x)
      scratch.object.position.set(pose.x, .1, pose.z)
      scratch.object.rotation.set(0, placement.rotation + pose.yaw, placement.lean)
      scratch.object.scale.set(placement.width, placement.scale, placement.width)
      scratch.object.updateMatrix()
      scratch.matrix.multiplyMatrices(scratch.object.matrix, part.matrix)
      current.setMatrixAt(visibleCount++, scratch.matrix)
    }
    current.count = visibleCount
    current.visible = visibleCount > 0
    current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[part.geometry, part.material, placements.length]}
      frustumCulled={false}
      castShadow={quality === 'high'}
      receiveShadow
    />
  )
}

export default function AuthoredPalms({
  runtime,
  quality,
  onReady, music,
}: {
  music?: MusicAudio
  runtime: MutableRefObject<CruiseRuntime>
  quality: CruiseQuality
  onReady: (ready: boolean) => void
}) {
  const [models, setModels] = useState<PalmModel[]>([])
  useEffect(() => {
    if (!music) return
    const cleanup = models.flatMap(model => Array.from(model.materials, material => installMiamiMaterial(material, music, 'fixture')))
    return () => cleanup.forEach(dispose => dispose())
  }, [models, music])
  const placements = useMemo(() => createPlacements(quality), [quality])
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    let active = true
    let ownedModels: PalmModel[] = []
    onReadyRef.current(false)

    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    Promise.allSettled(PALM_ASSETS.map(url => loader.loadAsync(url))).then(results => {
      const loaded = results.flatMap(result => result.status === 'fulfilled' ? [extractModel(result.value.scene)] : [])
      const complete = results.every(result => result.status === 'fulfilled')
        && loaded.length === PALM_ASSETS.length
        && loaded.every(model => model.parts.length > 0)

      if (!active || !complete) {
        loaded.forEach(disposeModel)
        if (active) onReadyRef.current(false)
        return
      }

      ownedModels = loaded
      setModels(loaded)
      onReadyRef.current(true)
    })

    return () => {
      active = false
      ownedModels.forEach(disposeModel)
    }
  }, [])

  return (
    <group dispose={null}>
      {models.flatMap((model, variant) => model.parts.map((part, index) => (
        <PalmPart
          key={`${variant}-${index}-${placements[variant].length}`}
          part={part}
          placements={placements[variant]}
          runtime={runtime}
          quality={quality}
        />
      )))}
    </group>
  )
}
