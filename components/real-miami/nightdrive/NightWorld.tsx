'use client'

import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { pulse } from '../master/pulse'
import { glowTex } from '../master/cockpit/textures'
import type { NightState } from './state'
import { CHUNK_COUNT, CHUNK_LENGTH, CHUNKS_BEHIND, ROAD_STEP, districtAt, roadRandom, roadSample } from './road'

const SEGMENTS = CHUNK_LENGTH / ROAD_STEP
const matrix = new THREE.Object3D()
const color = new THREE.Color()
type Strip = { mesh: THREE.Mesh; from: number; to: number; lift: number; water?: boolean }
type Chunk = {
  group: THREE.Group; index: number; seed: number; strips: Strip[]
  buildings: THREE.InstancedMesh; windows: THREE.InstancedMesh; poles: THREE.InstancedMesh
  lamps: THREE.InstancedMesh; marks: THREE.InstancedMesh; pools: THREE.InstancedMesh
  trunks: THREE.InstancedMesh; leaves: THREE.InstancedMesh
}

function instance(geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  return mesh
}

function setInstance(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number,
  sx: number, sy: number, sz: number, yaw = 0, tilt = 0) {
  matrix.position.set(x, y, z)
  matrix.rotation.set(tilt, yaw, 0)
  matrix.scale.set(sx, sy, sz)
  matrix.updateMatrix()
  mesh.setMatrixAt(index, matrix.matrix)
}

function strip(material: THREE.Material, from: number, to: number, lift = 0, water = false): Strip {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 6), 3))
  const uv = new Float32Array((SEGMENTS + 1) * 4)
  for (let i = 0; i <= SEGMENTS; i++) {
    uv.set([0, i * ROAD_STEP / 2.1, (to - from) / 2.1, i * ROAD_STEP / 2.1], i * 4)
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  const indices: number[] = []
  for (let i = 0; i < SEGMENTS; i++) {
    const v = i * 2
    indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
  }
  geometry.setIndex(indices)
  return { mesh: new THREE.Mesh(geometry, material), from, to, lift, water }
}

function createWorld(trafficScene: THREE.Group, asphaltSource: THREE.Texture) {
  const group = new THREE.Group()
  const box = new THREE.BoxGeometry(1, 1, 1)
  const cylinder = new THREE.CylinderGeometry(.11, .16, 1, 5)
  const leaf = new THREE.ConeGeometry(1, .2, 5)
  const circle = new THREE.CircleGeometry(1, 20)
  const poolMap = glowTex()
  const asphalt = asphaltSource.clone()
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping
  asphalt.colorSpace = THREE.SRGBColorSpace; asphalt.anisotropy = 4; asphalt.needsUpdate = true
  const materials = {
    road: new THREE.MeshStandardMaterial({ color: '#89949c', map: asphalt, roughness: .84 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: '#bcada0', roughness: 1 }),
    ground: new THREE.MeshStandardMaterial({ color: '#486952', roughness: 1 }),
    ocean: new THREE.MeshStandardMaterial({ color: '#23798a', roughness: .45, metalness: .15 }),
    buildings: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .82 }),
    windows: new THREE.MeshStandardMaterial({ color: '#ded0bd', emissive: '#ffffff', emissiveIntensity: .3 }),
    poles: new THREE.MeshStandardMaterial({ color: '#686e73', roughness: .7 }),
    marks: new THREE.MeshBasicMaterial({ color: '#d8c797' }),
    pools: new THREE.MeshBasicMaterial({ color: '#ffc77c', map: poolMap, transparent: true, opacity: .13, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    trunks: new THREE.MeshStandardMaterial({ color: '#847061', roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ color: '#346b58', roughness: 1 }),
    headlights: new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#fff1cc', toneMapped: false }),
  }
  // Instance colors tint emissive windows too; otherwise every colored window glows white.
  materials.windows.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif')
  }
  const chunks: Chunk[] = Array.from({ length: CHUNK_COUNT }, () => {
    const chunk: Chunk = {
      group: new THREE.Group(), index: NaN, seed: NaN,
      strips: [strip(materials.ground, -46, 260, -.07), strip(materials.ocean, -500, -46, 0, true),
        strip(materials.sidewalk, -8.5, 8.5, -.015), strip(materials.road, -4.8, 4.8, .01)],
      buildings: instance(box, materials.buildings, 10), windows: instance(box, materials.windows, 300),
      poles: instance(box, materials.poles, 8), lamps: instance(box, materials.windows, 8),
      marks: instance(box, materials.marks, 24), pools: instance(circle, materials.pools, 8),
      trunks: instance(cylinder, materials.trunks, 8), leaves: instance(leaf, materials.leaves, 40),
    }
    chunk.group.add(...chunk.strips.map(item => item.mesh), chunk.buildings, chunk.windows, chunk.poles,
      chunk.lamps, chunk.marks, chunk.pools, chunk.trunks, chunk.leaves)
    group.add(chunk.group)
    return chunk
  })
  // Reuse the same licensed classic as Miami; cached GLTF geometry/materials stay owned by useGLTF.
  const base = trafficScene.clone(true)
  const bounds = new THREE.Box3().setFromObject(base)
  const size = bounds.getSize(new THREE.Vector3())
  if (size.x > size.z) base.rotation.y = Math.PI / 2
  base.updateMatrixWorld(true)
  bounds.setFromObject(base)
  base.scale.setScalar(4.7 / Math.max(.01, bounds.getSize(size).z))
  base.updateMatrixWorld(true)
  let rearZ = 0
  base.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    if (originals.some(material => /rear/i.test(material.name))) {
      rearZ = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).z
    }
  })
  if (rearZ < 0) base.rotation.y += Math.PI
  base.updateMatrixWorld(true)
  bounds.setFromObject(base)
  const center = bounds.getCenter(new THREE.Vector3())
  base.position.x -= center.x; base.position.y -= bounds.min.y; base.position.z -= center.z
  const front = bounds.min.z - center.z
  const lampGeometry = new THREE.CircleGeometry(.11, 16)
  const trafficMaterials: THREE.Material[] = []
  const taillights: THREE.MeshStandardMaterial[] = []
  const traffic = ['#7fd3c8', '#d9485a'].map(tint => {
    const car = new THREE.Group()
    const body = base.clone(true)
    const changed = new Map<THREE.Material, THREE.Material>()
    body.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      const adjust = (original: THREE.Material): THREE.Material => {
        if (!(original instanceof THREE.MeshStandardMaterial) || !/paint|rear/i.test(original.name)) return original
        const existing = changed.get(original)
        if (existing) return existing
        const material = original.clone()
        if (/paint/i.test(original.name)) {
          material.color.set(tint); material.roughness = .3; material.metalness = .05
        } else {
          material.color.set('#c3142c'); material.emissive.set('#ff1f3d')
          taillights.push(material)
        }
        changed.set(original, material); trafficMaterials.push(material)
        return material
      }
      object.material = Array.isArray(object.material) ? object.material.map(adjust) : adjust(object.material)
      object.castShadow = false
    })
    car.add(body)
    for (const x of [-.6, .6]) {
      const lamp = new THREE.Mesh(lampGeometry, materials.headlights)
      lamp.position.set(x, .72, front - .01); lamp.rotation.y = Math.PI; car.add(lamp)
    }
    group.add(car)
    return car
  })
  return { group, chunks, traffic, materials, trafficMaterials, taillights,
    ownedTextures: [poolMap, asphalt],
    sharedGeometry: [box, cylinder, leaf, circle, lampGeometry] }
}

function fillChunk(chunk: Chunk, index: number, seed: number) {
  const start = index * CHUNK_LENGTH
  const anchor = roadSample(start, seed)
  const local = (s: number, lateral = 0) => {
    const p = roadSample(s, seed)
    return { x: p.x - anchor.x + Math.cos(p.yaw) * lateral, y: p.y - anchor.y,
      z: p.z - anchor.z - Math.sin(p.yaw) * lateral, yaw: p.yaw }
  }
  for (const item of chunk.strips) {
    const position = item.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const uv = item.mesh.geometry.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i <= SEGMENTS; i++) for (let edge = 0; edge < 2; edge++) {
      const p = local(start + i * ROAD_STEP, edge ? item.to : item.from)
      position.setXYZ(i * 2 + edge, p.x, item.water ? -2.2 - anchor.y : p.y + item.lift, p.z)
      uv.setY(i * 2 + edge, ((start % 2.1) + i * ROAD_STEP) / 2.1)
    }
    position.needsUpdate = true
    uv.needsUpdate = true
    item.mesh.geometry.computeVertexNormals()
    item.mesh.geometry.computeBoundingSphere()
  }
  let buildings = 0, windows = 0
  for (let i = 0; i < 5; i++) {
    const station = start + 10 + i * 18
    const mix = districtAt(station, seed).mix
    for (const side of [1, -1]) {
      if (side === -1 && mix < .35) continue
      const hash = index * 41 + i * 3 + side
      const width = 9 + roadRandom(hash, seed) * 5
      const height = 5 + roadRandom(hash + 1, seed) * (8 + mix * 22)
      const depth = 9 + roadRandom(hash + 2, seed) * 7
      const p = local(station, side * (10 + depth / 2))
      setInstance(chunk.buildings, buildings, p.x, p.y + height / 2, p.z, depth, height, width, p.yaw)
      color.setHSL(.055 + roadRandom(hash + 4, seed) * .08, .12 + mix * .12, .55 - mix * .27)
      chunk.buildings.setColorAt(buildings++, color)
      const face = local(station, side * (9.98))
      const rows = Math.min(9, Math.floor(height / 2.8))
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < 3; column++) {
          const along = (column - 1) * width * .27
          setInstance(chunk.windows, windows, face.x + Math.sin(face.yaw) * along,
            face.y + 1.8 + row * 2.8, face.z + Math.cos(face.yaw) * along,
            .04, 1, width * .13, face.yaw)
          color.set('#ffd6a6').multiplyScalar(roadRandom(hash * 97 + row * 3 + column, seed) > .25 ? .85 : .14)
          chunk.windows.setColorAt(windows++, color)
        }
      }
      if (mix > .6 && i % 3 === 0) {
        setInstance(chunk.windows, windows, face.x, face.y + height - .3, face.z,
          .05, .12, width * .82, face.yaw)
        color.set(i % 2 === 0 ? '#ed7cae' : '#75c9cb').multiplyScalar(.75)
        chunk.windows.setColorAt(windows++, color)
      }
    }
  }
  chunk.buildings.count = buildings; chunk.windows.count = windows
  let palm = 0, frond = 0
  for (let i = 0; i < 4; i++) {
    const station = start + 7 + i * 24
    for (const side of [-1, 1]) {
      const n = i * 2 + (side === 1 ? 1 : 0)
      const p = local(station, side * 6.8)
      setInstance(chunk.poles, n, p.x, p.y + 3.6, p.z, .11, 7.2, .11, p.yaw)
      setInstance(chunk.lamps, n, p.x, p.y + 7.23, p.z, .8, .12, .5, p.yaw)
      const pool = local(station, side * 3.2)
      setInstance(chunk.pools, n, pool.x, pool.y + .028, pool.z, 3.8, 7, 1, p.yaw, -Math.PI / 2)
      const tree = local(station + 8, side * (side === -1 ? 14 : 28))
      const height = 7 + roadRandom(index * 8 + n, seed) * 3
      setInstance(chunk.trunks, palm++, tree.x, tree.y + height / 2, tree.z, 1, height, 1)
      for (let f = 0; f < 5; f++) {
        const angle = f * Math.PI * 2 / 5
        setInstance(chunk.leaves, frond++, tree.x + Math.cos(angle) * 1.25, tree.y + height,
          tree.z + Math.sin(angle) * 1.25, 1.8, 2, .75, -angle)
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    const p = local(start + i * 4 + 1)
    setInstance(chunk.marks, i, p.x, p.y + .025, p.z, .12, .015, 1.8, p.yaw)
  }
  for (const mesh of [chunk.buildings, chunk.windows, chunk.poles, chunk.lamps,
    chunk.marks, chunk.pools, chunk.trunks, chunk.leaves]) {
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }
  chunk.index = index; chunk.seed = seed
}

export default function NightWorld({ state, night }: { state: MutableRefObject<NightState>; night: boolean }) {
  const trafficAsset = useGLTF('/real-miami/traffic/classic-traffic.glb', false, true)
  // Existing repository CC0 asset: clean-asphalt/provenance.json (Dimitrios Savva / Poly Haven).
  const asphaltSource = useTexture('/real-miami/materials/clean-asphalt/color.webp')
  const world = useMemo(() => createWorld(trafficAsset.scene, asphaltSource), [trafficAsset.scene, asphaltSource])
  useEffect(() => () => {
    for (const chunk of world.chunks) {
      for (const item of chunk.strips) item.mesh.geometry.dispose()
      for (const mesh of [chunk.buildings, chunk.windows, chunk.poles, chunk.lamps,
        chunk.marks, chunk.pools, chunk.trunks, chunk.leaves]) mesh.dispose()
    }
    world.sharedGeometry.forEach(geometry => geometry.dispose())
    Object.values(world.materials).forEach(material => material.dispose())
    world.trafficMaterials.forEach(material => material.dispose())
    world.ownedTextures.forEach(texture => texture.dispose())
  }, [world])
  useEffect(() => {
    world.materials.headlights.emissiveIntensity = night ? 6 : .25
    world.taillights.forEach(material => { material.emissiveIntensity = night ? 3 : .6 })
  }, [world, night])
  useFrame(() => {
    const current = state.current
    const origin = roadSample(current.distance, current.seed)
    const first = Math.floor(current.distance / CHUNK_LENGTH) - CHUNKS_BEHIND
    for (let index = first; index < first + CHUNK_COUNT; index++) {
      const slot = ((index % CHUNK_COUNT) + CHUNK_COUNT) % CHUNK_COUNT
      const chunk = world.chunks[slot]
      if (chunk.index !== index || chunk.seed !== current.seed) {
        const started = performance.now()
        fillChunk(chunk, index, current.seed)
        current.generationMs = performance.now() - started
        current.maxGenerationMs = Math.max(current.maxGenerationMs, current.generationMs)
        current.chunksGenerated++
      }
      const anchor = roadSample(index * CHUNK_LENGTH, current.seed)
      chunk.group.position.set(anchor.x - origin.x, anchor.y - origin.y, anchor.z - origin.z)
      chunk.pools.visible = night
    }
    // A static night glow is distinct from verified live audio modulation.
    world.materials.windows.emissiveIntensity = (night ? .3 : .08) + (pulse.source === 'live' ? pulse.energy * .08 : 0)
    world.materials.ocean.color.set(night ? '#163b51' : '#23798a')
    for (let index = 0; index < Math.min(2, current.traffic.length); index++) {
      const car = current.traffic[index]
      const p = roadSample(car.distance, current.seed)
      world.traffic[index].position.set(p.x - origin.x + Math.cos(p.yaw) * car.lateral,
        p.y - origin.y, p.z - origin.z - Math.sin(p.yaw) * car.lateral)
      world.traffic[index].rotation.y = p.yaw
    }
  })
  return <primitive object={world.group} dispose={null} />
}
