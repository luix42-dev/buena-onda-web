'use client'
import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { NightState } from '../nightdrive/state'
import { CHUNK_COUNT, CHUNK_LENGTH, CHUNKS_BEHIND, retrowaveIslandMix, retrowaveRoadSample, retrowaveSkywayMix } from '../nightdrive/road'
import { hideEmpty, ownGeometry } from './instancing'

const STEP = 8, SEGMENTS = CHUNK_LENGTH / STEP, EDGE = 6.35
const scratch = new T.Object3D(), forward = new T.Vector3(0, 0, 1), delta = new T.Vector3()
type SkyChunk = { group: T.Group; index: number; seed: number; rails: T.InstancedMesh; lanes: T.InstancedMesh; keys: T.InstancedMesh; blackKeys: T.InstancedMesh; posts: T.InstancedMesh; piers: T.InstancedMesh; portals: T.InstancedMesh; echoes: T.InstancedMesh }

function mesh(geometry: T.BufferGeometry, material: T.Material, count: number) {
  const item = new T.InstancedMesh(ownGeometry(geometry), material, count)
  item.instanceMatrix.setUsage(T.DynamicDrawUsage); item.count = 0
  return item
}
function point(s: number, lateral: number, up: number, seed: number, anchor: ReturnType<typeof retrowaveRoadSample>) {
  const p = retrowaveRoadSample(s, seed)
  return new T.Vector3(p.x - anchor.x + Math.cos(p.yaw) * lateral, p.y - anchor.y + up, p.z - anchor.z - Math.sin(p.yaw) * lateral)
}
function beam(target: T.InstancedMesh, index: number, a: T.Vector3, b: T.Vector3, width: number, height: number) {
  delta.subVectors(b, a); scratch.position.copy(a).add(b).multiplyScalar(.5)
  scratch.quaternion.setFromUnitVectors(forward, delta.clone().normalize())
  scratch.scale.set(width, height, delta.length()); scratch.updateMatrix(); target.setMatrixAt(index, scratch.matrix)
}
function box(target: T.InstancedMesh, index: number, at: T.Vector3, width: number, height: number, depth: number, yaw = 0) {
  scratch.position.copy(at); scratch.rotation.set(0, yaw, 0); scratch.scale.set(width, height, depth); scratch.updateMatrix(); target.setMatrixAt(index, scratch.matrix)
}
function fill(chunk: SkyChunk, index: number, seed: number) {
  const start = index * CHUNK_LENGTH, anchor = retrowaveRoadSample(start, seed)
  const sky = retrowaveSkywayMix(start + CHUNK_LENGTH / 2) > .5
  chunk.group.visible = sky
  if (!sky) { chunk.index = index; chunk.seed = seed; return }
  let rails = 0, lanes = 0, keys = 0, blackKeys = 0, posts = 0, piers = 0, portals = 0
  for (let i = 0; i < SEGMENTS; i++) for (const side of [-1, 1]) {
    const s = start + i * STEP
    for (const up of [.95, -.48]) beam(chunk.rails, rails++, point(s, side * EDGE, up, seed, anchor), point(s + STEP, side * EDGE, up, seed, anchor), up > 0 ? .19 : .32, up > 0 ? .15 : .23)
    for (let band = 0; band < 3; band++) {
      const lateral = side * (5.45 + band * .3)
      beam(chunk.lanes, lanes, point(s, lateral, .045, seed, anchor), point(s + STEP, lateral, .045, seed, anchor), .1, .025)
      chunk.lanes.setColorAt(lanes++, new T.Color(['#66e9ff', '#ff5dbd', '#ffd67b'][band]))
    }
    const p = point(s, side * EDGE, .28, seed, anchor)
    box(chunk.posts, posts++, p, .2, 1.45, .2)
  }
  for (let i = 0; i < CHUNK_LENGTH / 4; i++) {
    const at = start + i * 4 + 1
    if (retrowaveIslandMix(at) < .985) continue
    const p = retrowaveRoadSample(at, seed)
    box(chunk.keys, keys++, point(at, 0, .035, seed, anchor), 11.2, .025, 2.7, p.yaw)
    if (![2, 6].includes(i % 7)) box(chunk.blackKeys, blackKeys++, point(at + 1.7, i % 2 ? -2.45 : 2.45, .063, seed, anchor), 4.6, .026, 1.45, p.yaw)
  }
  // Thin illuminated supports connect the high road to the old city below.
  for (const at of [start + 24, start + 72]) {
    const p = retrowaveRoadSample(at, seed)
    const relative = point(at, 0, 0, seed, anchor)
    const height = Math.max(2, p.y + 1)
    box(chunk.piers, piers++, new T.Vector3(relative.x, relative.y - height / 2 - .2, relative.z), 2.4, height, 2.4, p.yaw)
  }
  // Paired hoops read like impossible racing loops, while the drivable deck stays upright.
  if (index % 3 === 0) {
    const at = start + CHUNK_LENGTH / 2, p = retrowaveRoadSample(at, seed), center = point(at, 0, 12, seed, anchor)
    scratch.position.copy(center); scratch.rotation.set(0, p.yaw, Math.sin(at / 170) * .18); scratch.scale.setScalar(1); scratch.updateMatrix()
    chunk.portals.setMatrixAt(portals, scratch.matrix); chunk.echoes.setMatrixAt(portals++, scratch.matrix)
  }
  chunk.rails.count = rails; chunk.lanes.count = lanes; chunk.keys.count = keys; chunk.blackKeys.count = blackKeys; chunk.posts.count = posts; chunk.piers.count = piers; chunk.portals.count = chunk.echoes.count = portals
  for (const item of [chunk.rails, chunk.lanes, chunk.keys, chunk.blackKeys, chunk.posts, chunk.piers, chunk.portals, chunk.echoes]) { item.instanceMatrix.needsUpdate = true; if (item.instanceColor) item.instanceColor.needsUpdate = true; item.computeBoundingSphere() }
  hideEmpty(chunk.rails, chunk.lanes, chunk.keys, chunk.blackKeys, chunk.posts, chunk.piers, chunk.portals, chunk.echoes)
  chunk.index = index; chunk.seed = seed
}

/** Original procedural bridge chapter, inspired by the construction of banked kart tracks. */
export default function RetroSkyway({ state, tier }: { state: MutableRefObject<NightState>; tier: 'high' | 'medium' | 'low' }) {
  const world = useMemo(() => {
    const boxGeometry = new T.BoxGeometry(1, 1, 1), hoop = new T.TorusGeometry(16, .28, 5, tier === 'low' ? 32 : 56), outer = new T.TorusGeometry(19, .14, 4, tier === 'low' ? 32 : 56)
    const materials = {
      rails: new T.MeshBasicMaterial({ color: '#ff5ebc', toneMapped: false }),
      lanes: new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      keys: new T.MeshBasicMaterial({ color: '#cfc2b4' }),
      blackKeys: new T.MeshBasicMaterial({ color: '#101027' }),
      posts: new T.MeshBasicMaterial({ color: '#68e9ff', toneMapped: false }),
      piers: new T.MeshStandardMaterial({ color: '#241d38', metalness: .62, roughness: .35, emissive: '#341058', emissiveIntensity: .4 }),
      portals: new T.MeshBasicMaterial({ color: '#ff6bcb', toneMapped: false }),
      echoes: new T.MeshBasicMaterial({ color: '#72eeff', toneMapped: false }),
    }
    const group = new T.Group()
    const chunks: SkyChunk[] = Array.from({ length: CHUNK_COUNT }, () => {
      const lanes = mesh(boxGeometry, materials.lanes, SEGMENTS * 6)
      lanes.instanceColor = new T.InstancedBufferAttribute(new Float32Array(SEGMENTS * 6 * 3).fill(1), 3)
      const chunk: SkyChunk = { group: new T.Group(), index: NaN, seed: NaN,
        rails: mesh(boxGeometry, materials.rails, SEGMENTS * 4), lanes, keys: mesh(boxGeometry, materials.keys, CHUNK_LENGTH / 4), blackKeys: mesh(boxGeometry, materials.blackKeys, CHUNK_LENGTH / 4), posts: mesh(boxGeometry, materials.posts, SEGMENTS * 2), piers: mesh(boxGeometry, materials.piers, 2),
        portals: mesh(hoop, materials.portals, 1), echoes: mesh(outer, materials.echoes, 1) }
      chunk.group.add(chunk.rails, chunk.lanes, chunk.keys, chunk.blackKeys, chunk.posts, chunk.piers, chunk.portals, chunk.echoes); group.add(chunk.group)
      return chunk
    })
    return { group, chunks, geometries: [boxGeometry, hoop, outer], materials }
  }, [tier])
  useEffect(() => () => { for (const chunk of world.chunks) for (const item of [chunk.rails, chunk.lanes, chunk.keys, chunk.blackKeys, chunk.posts, chunk.piers, chunk.portals, chunk.echoes]) { item.geometry.dispose(); item.dispose() } world.geometries.forEach(item => item.dispose()); Object.values(world.materials).forEach(item => item.dispose()) }, [world])
  useFrame(() => {
    const s = state.current, origin = retrowaveRoadSample(s.distance, s.seed), first = Math.floor(s.distance / CHUNK_LENGTH) - CHUNKS_BEHIND
    for (let index = first; index < first + CHUNK_COUNT; index++) {
      const chunk = world.chunks[((index % CHUNK_COUNT) + CHUNK_COUNT) % CHUNK_COUNT]
      if (chunk.index !== index || chunk.seed !== s.seed) fill(chunk, index, s.seed)
      const anchor = retrowaveRoadSample(index * CHUNK_LENGTH, s.seed)
      chunk.group.position.set(anchor.x - origin.x, anchor.y - origin.y, anchor.z - origin.z)
    }
  })
  return <primitive object={world.group} dispose={null}/>
}
