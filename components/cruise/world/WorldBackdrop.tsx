'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { routeRelativePose } from '@/lib/cruise/routePath'
import { WORLD_LENGTH } from '@/lib/cruise/constants'
import type { CruiseQuality, CruiseRuntime, CruiseTimeOfDay, CruiseWeather } from '@/lib/cruise/types'
import AuthoredSkyline from './AuthoredSkyline'

type WorldBackdropProps = {
  runtime: MutableRefObject<CruiseRuntime>
  quality: CruiseQuality
  timeOfDay: CruiseTimeOfDay
  weather: CruiseWeather
}

type Instance = {
  position: readonly [number, number, number]
  scale: readonly [number, number, number]
  color: number
}

type BackdropData = {
  far: Instance[]
  middle: Instance[]
  near: Instance[]
  horizon: Instance[]
}

type BackdropAssets = {
  box: THREE.BoxGeometry
  far: THREE.MeshBasicMaterial
  middle: THREE.MeshStandardMaterial
  near: THREE.MeshStandardMaterial
  horizon: THREE.MeshBasicMaterial
  materials: THREE.Material[]
  textures: THREE.Texture[]
}

const DENSITY: Record<CruiseQuality, readonly [number, number, number]> = {
  low: [18, 14, 8],
  medium: [28, 22, 14],
  high: [38, 30, 20],
}

function random(seed: number) {
  const value = Math.sin(seed * 73.217 + 19.731) * 43758.5453
  return value - Math.floor(value)
}

function buildingBand({
  count,
  seed,
  xMin,
  xMax,
  z,
  minHeight,
  maxHeight,
  minWidth,
  maxWidth,
  depth,
  colors,
}: {
  count: number
  seed: number
  xMin: number
  xMax: number
  z: number
  minHeight: number
  maxHeight: number
  minWidth: number
  maxWidth: number
  depth: number
  colors: readonly number[]
}): Instance[] {
  const spacing = (xMax - xMin) / count
  return Array.from({ length: count }, (_, index) => {
    const width = minWidth + random(seed + index * 7) * (maxWidth - minWidth)
    const height = minHeight + Math.pow(random(seed + index * 11 + 1), 1.7) * (maxHeight - minHeight)
    const x = xMin + (index + 0.5) * spacing + (random(seed + index * 13 + 2) - 0.5) * spacing * 0.6
    const instanceZ = z + (random(seed + index * 17 + 3) - 0.5) * depth * 0.85

    return {
      position: [x, height * 0.5, instanceZ],
      scale: [Math.min(width, spacing * 1.15), height, depth],
      color: colors[index % colors.length],
    }
  })
}

function addTower(
  instances: Instance[],
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: number,
  detail: number,
) {
  instances.push({ position: [x, height * 0.5, z], scale: [width, height, depth], color })
  if (detail < 1) return

  const crownHeight = Math.max(3, height * 0.1)
  instances.push({
    position: [x, height + crownHeight * 0.5, z],
    scale: [width * 0.68, crownHeight, depth * 0.72],
    color,
  })
  if (detail < 2) return

  instances.push({
    position: [x, height + crownHeight + 3.5, z],
    scale: [Math.max(0.34, width * 0.045), 7, Math.max(0.34, depth * 0.045)],
    color,
  })
}

function createBackdropData(quality: CruiseQuality): BackdropData {
  const [farCount, middleCount, nearCount] = DENSITY[quality]
  const far = buildingBand({
    count: farCount,
    seed: 101,
    xMin: -175,
    xMax: 180,
    z: -286,
    minHeight: 5,
    maxHeight: 14,
    minWidth: 5,
    maxWidth: 13,
    depth: 11,
    colors: [0x97a2a3, 0xa0a6a5, 0x8d9c9f],
  })
  const middle = buildingBand({
    count: middleCount,
    seed: 307,
    xMin: -148,
    xMax: 154,
    z: -252,
    minHeight: 7,
    maxHeight: 23,
    minWidth: 5,
    maxWidth: 12,
    depth: 10,
    colors: [0x73878a, 0x7e8e8e, 0x697f83],
  })
  const near = buildingBand({
    count: nearCount,
    seed: 509,
    xMin: -112,
    xMax: 122,
    z: -218,
    minHeight: 8,
    maxHeight: 31,
    minWidth: 6,
    maxWidth: 13,
    depth: 9,
    colors: [0x52696d, 0x607377, 0x496267],
  })

  const detail = quality === 'low' ? 0 : quality === 'medium' ? 1 : 2
  addTower(near, 27, -221, 12, 47, 10, 0x485f64, detail)
  addTower(near, 47, -216, 8, 36, 8, 0x5a6f72, detail)
  addTower(near, 63, -224, 14, 58, 11, 0x425a60, Math.max(1, detail))
  addTower(near, -38, -225, 10, 39, 9, 0x566c70, detail)
  if (quality !== 'low') addTower(near, 83, -219, 9, 43, 8, 0x52696d, detail)

  return {
    // Mainland stays west; the eastern horizon belongs to the open ocean.
    far: far.filter(item => item.position[0] < -24),
    middle: middle.filter(item => item.position[0] < -30),
    near: near.filter(item => item.position[0] < -28),
    horizon: [
      { position: [-118, -0.65, -302], scale: [200, 1.5, 18], color: 0x91a0a1 },
      { position: [-92, -0.25, -261], scale: [145, 0.8, 12], color: 0x788c8e },
    ],
  }
}

function createAssets(): BackdropAssets {
  const box = new THREE.BoxGeometry(1, 1, 1)
  // Original distance facade atlas: window recesses, floor edges and varied
  // occupied rooms. Near skyline still uses its authored Blender geometry.
  const canvas = document.createElement('canvas'), rough = document.createElement('canvas')
  canvas.width = rough.width = 256; canvas.height = rough.height = 768
  const ctx = canvas.getContext('2d')!, r = rough.getContext('2d')!
  ctx.fillStyle = '#bcc5c4'; ctx.fillRect(0, 0, 256, 768)
  r.fillStyle = '#d8d8d8'; r.fillRect(0, 0, 256, 768)
  for (let floor = 0; floor < 16; floor++) {
    const y = floor * 48
    ctx.fillStyle = '#6c7e82'; ctx.fillRect(0, y, 256, 3)
    ctx.fillStyle = '#d2d7d3'; ctx.fillRect(0, y + 3, 256, 2)
    for (let bay = 0; bay < 5; bay++) {
      const x = bay * 50 + 8, occupied = random(floor * 19 + bay * 7) > .78
      ctx.fillStyle = '#34474d'; ctx.fillRect(x, y + 11, 39, 31)
      ctx.fillStyle = occupied ? '#aaa38c' : ['#627d87', '#768991', '#536c78'][(floor + bay) % 3]
      ctx.fillRect(x + 2, y + 13, 35, 27)
      ctx.fillStyle = '#b3c0c1'; ctx.fillRect(x + 18, y + 12, 2, 29)
      ctx.fillStyle = '#41565b'; ctx.fillRect(x + 2, y + 36, 35, 4)
      r.fillStyle = '#555555'; r.fillRect(x + 2, y + 13, 35, 27)
    }
  }
  const facade = new THREE.CanvasTexture(canvas); facade.colorSpace = THREE.SRGBColorSpace
  const roughness = new THREE.CanvasTexture(rough)
  facade.anisotropy = roughness.anisotropy = 4
  const far = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })
  const middle = new THREE.MeshStandardMaterial({ vertexColors: true, fog: true, map: facade, roughnessMap: roughness, roughness: .8, metalness: .12, envMapIntensity: .6 })
  const near = middle.clone()
  const horizon = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })
  return { box, far, middle, near, horizon, materials: [far, middle, near, horizon], textures: [facade, roughness] }
}

function applyInstances(mesh: THREE.InstancedMesh, instances: Instance[]) {
  const matrix = new THREE.Matrix4()
  const color = new THREE.Color()
  for (let index = 0; index < instances.length; index += 1) {
    const instance = instances[index]
    matrix.makeScale(...instance.scale)
    matrix.setPosition(...instance.position)
    mesh.setMatrixAt(index, matrix)
    mesh.setColorAt(index, color.setHex(instance.color))
  }
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

export default function WorldBackdrop({ runtime, quality, timeOfDay, weather }: WorldBackdropProps) {
  const [authoredReady, setAuthoredReady] = useState(false)
  const assets = useMemo(createAssets, [])
  const data = useMemo(() => createBackdropData(quality), [quality])
  const targetColor = useMemo(() => {
    const color = new THREE.Color(timeOfDay === 'day' ? 0xf4e8d2 : timeOfDay === 'sunset' ? 0xe8cbc0 : 0x8295a4)
    return color.multiplyScalar(weather === 'rain' ? 0.7 : 1)
  }, [timeOfDay, weather])
  const horizonGroup = useRef<THREE.Group>(null)
  const farGroup = useRef<THREE.Group>(null)
  const middleGroup = useRef<THREE.Group>(null)
  const nearGroup = useRef<THREE.Group>(null)
  const horizonMesh = useRef<THREE.InstancedMesh>(null)
  const farMesh = useRef<THREE.InstancedMesh>(null)
  const middleMesh = useRef<THREE.InstancedMesh>(null)
  const nearMesh = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    if (!horizonMesh.current || !farMesh.current || !middleMesh.current || !nearMesh.current) return
    applyInstances(horizonMesh.current, data.horizon)
    applyInstances(farMesh.current, data.far)
    applyInstances(middleMesh.current, data.middle)
    applyInstances(nearMesh.current, data.near)
    const meshes = [horizonMesh.current, farMesh.current, middleMesh.current, nearMesh.current]
    return () => meshes.forEach((mesh) => mesh.dispose())
  }, [data])

  useEffect(
    () => () => {
      assets.box.dispose()
      assets.materials.forEach((material) => material.dispose())
      assets.textures.forEach(texture => texture.dispose())
    },
    [assets],
  )

  useFrame((_, delta) => {
    const phase = (runtime.current.distance / WORLD_LENGTH) * Math.PI * 2
    const blend = 1 - Math.exp(-Math.min(delta, 0.05) * 2.1)
    for (const material of assets.materials) {
      if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshStandardMaterial) material.color.lerp(targetColor, blend)
    }
    const approach = (1 - Math.cos(phase)) * .5
    // The distant mainland uses the same tangent frame as the passing frontage.
    // Rotate about the band's own longitudinal anchor, keeping all towers on land.
    const placeBand = (group: THREE.Group | null, z: number, parallaxX: number, parallaxZ = 0) => {
      if (!group) return
      const pose = routeRelativePose(runtime.current.distance, z)
      group.rotation.y = pose.yaw
      group.position.set(pose.x - z * Math.sin(pose.yaw) + parallaxX, 0,
        pose.z - z * Math.cos(pose.yaw) + parallaxZ)
    }
    placeBand(horizonGroup.current, -282, Math.sin(phase) * .7)
    placeBand(farGroup.current, -286, Math.sin(phase) * 2)
    placeBand(middleGroup.current, -252, Math.sin(phase) * 5, -12 + approach * 18)
    placeBand(nearGroup.current, -218, Math.sin(phase) * 10, -25 + approach * 40)
  })

  return (
    <group dispose={null}>
      <group ref={horizonGroup}>
        <instancedMesh
          key={`${quality}-horizon`}
          ref={horizonMesh}
          args={[assets.box, assets.horizon, data.horizon.length]}
        />
      </group>
      <group ref={farGroup}>
        <instancedMesh key={`${quality}-far`} ref={farMesh} args={[assets.box, assets.far, data.far.length]} />
      </group>
      <group ref={middleGroup}>
        <instancedMesh
          key={`${quality}-middle`}
          ref={middleMesh}
          args={[assets.box, assets.middle, data.middle.length]}
        />
      </group>
      <group ref={nearGroup}>
        <instancedMesh visible={!authoredReady} key={`${quality}-near`} ref={nearMesh} args={[assets.box, assets.near, data.near.length]} />
        <AuthoredSkyline quality={quality} timeOfDay={timeOfDay} onReady={setAuthoredReady} />
      </group>
    </group>
  )
}
