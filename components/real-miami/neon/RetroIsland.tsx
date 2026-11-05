'use client'
import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import type { NightState } from '../nightdrive/state'
import { retrowaveRoadSample, retrowaveSkywayMix, roadRandom } from '../nightdrive/road'

const CYCLE = 3200, ISLAND_AT = 2025
const transform = new T.Object3D()
const lit = (color: string, intensity = 1) => new T.MeshBasicMaterial({ color: new T.Color(color).multiplyScalar(intensity), toneMapped: false })

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#15213d'; ctx.fillRect(0, 0, 1024, 256)
  ctx.strokeStyle = '#ffd68d'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, 1000, 232)
  ctx.font = 'bold 112px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe6ae'; ctx.fillText('BUENA ONDA', 512, 153)
  ctx.font = '30px Arial, sans-serif'; ctx.letterSpacing = '10px'; ctx.fillStyle = '#8ff5ff'; ctx.fillText('ISLAND CLUB', 512, 211)
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace
  return texture
}

function buildIsland(tier: 'high' | 'medium' | 'low') {
  const island = new T.Group()
  const water = new T.Mesh(new T.PlaneGeometry(1800, 1800), new T.MeshBasicMaterial({ color: '#183c6b', fog: true }))
  water.rotation.x = -Math.PI / 2; water.frustumCulled = false
  const sand = new T.MeshStandardMaterial({ color: '#e9a75e', roughness: .88, emissive: '#4e2b30', emissiveIntensity: .14 })
  const shore = new T.Mesh(new T.CylinderGeometry(110, 126, 5, tier === 'low' ? 24 : 48), sand); shore.position.y = 1.5; island.add(shore)
  const sandTop = new T.Mesh(new T.CylinderGeometry(97, 105, 2.2, tier === 'low' ? 24 : 48), new T.MeshStandardMaterial({ color: '#edbb73', roughness: .92 }))
  sandTop.position.y = 4.5; island.add(sandTop)
  const shoreGlow = new T.Mesh(new T.TorusGeometry(107, .55, 5, tier === 'low' ? 48 : 80), lit('#ffce89', 1.3)); shoreGlow.rotation.x = Math.PI / 2; shoreGlow.position.y = 4; island.add(shoreGlow)

  const club = new T.Group(); club.position.set(-55, 5.7, -12); island.add(club)
  const ivory = new T.MeshStandardMaterial({ color: '#fff0ce', metalness: .24, roughness: .32, emissive: '#c67b72', emissiveIntensity: .13 })
  const navy = new T.MeshStandardMaterial({ color: '#1d2848', metalness: .56, roughness: .29, emissive: '#32577e', emissiveIntensity: .25 })
  const glass = new T.MeshStandardMaterial({ color: '#79dff0', metalness: .58, roughness: .18, emissive: '#37b9d9', emissiveIntensity: .45 })
  const base = new T.Mesh(new T.CylinderGeometry(32, 36, 6, 12), navy); base.position.y = 3; club.add(base)
  for (const [x,height,radius] of [[0,38,11],[-23,26,8],[23,26,8]] as const) {
    const tower = new T.Mesh(new T.CylinderGeometry(radius * .83, radius, height, 10), ivory); tower.position.set(x, 6 + height / 2, -4); club.add(tower)
    for (let level = 0; level < (height > 30 ? 5 : 3); level++) {
      const crown = new T.Mesh(new T.TorusGeometry(radius * .89, .34, 5, 32), lit(level % 2 ? '#7de9ff' : '#ffd88f', 1.25))
      crown.rotation.x = Math.PI / 2; crown.position.set(x, 12 + level * 6, -4); club.add(crown)
    }
    const roof = new T.Mesh(new T.CylinderGeometry(radius * .95, radius * .95, 1.5, 10), navy); roof.position.set(x, 7 + height, -4); club.add(roof)
    for (let row = 0; row < 3; row++) {
      const pane = new T.Mesh(new T.BoxGeometry(radius * 1.12, 3.1, .25), glass)
      pane.position.set(x, 13 + row * 7, -4 + radius * .87); club.add(pane)
    }
  }
  const podium = new T.Mesh(new T.BoxGeometry(56, 3, 23), ivory); podium.position.set(0, 7, 23); club.add(podium)
  const canopy = new T.Mesh(new T.BoxGeometry(58, 1.2, 25), lit('#ffb7bc', 1.1)); canopy.position.set(0, 15, 23); club.add(canopy)
  for (const x of [-24,-16,-8,0,8,16,24]) {
    const column = new T.Mesh(new T.CylinderGeometry(.7, .7, 8, 6), ivory); column.position.set(x, 11, 33); club.add(column)
  }
  const signMap = signTexture(), sign = new T.Mesh(new T.PlaneGeometry(33, 8.25), new T.MeshBasicMaterial({ map: signMap, toneMapped: false, side: T.DoubleSide }))
  sign.position.set(0, 21, 36); club.add(sign)
  for (const [x,color] of [[-23,'#ffc690'],[0,'#8fe9ff'],[23,'#ff9ecf']] as const) {
    const beam = new T.Mesh(new T.ConeGeometry(11, 78, 12, 1, true), new T.MeshBasicMaterial({ color, transparent: true, opacity: .075, depthWrite: false, side: T.DoubleSide, fog: false }))
    beam.rotation.z = Math.PI; beam.position.set(x, 78, -5); club.add(beam)
  }

  // Repeated low-poly palms silhouette the lit club without per-tree draw calls.
  const palms = tier === 'low' ? 12 : 20
  const trunkGeometry = new T.CylinderGeometry(.36, .62, 1, 5), trunkMaterial = new T.MeshStandardMaterial({ color: '#302536', roughness: 1 })
  const trunks = new T.InstancedMesh(trunkGeometry, trunkMaterial, palms)
  const leafShape = new T.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(3.2, 1.2, 8, -2.2); leafShape.lineTo(5.4, -.85); leafShape.lineTo(4.8, -.5); leafShape.lineTo(3.5, -.65); leafShape.lineTo(2.6, .25); leafShape.closePath()
  const leafGeometry = new T.ShapeGeometry(leafShape), leafMaterial = new T.MeshBasicMaterial({ color: '#172838', side: T.DoubleSide })
  const leaves = new T.InstancedMesh(leafGeometry, leafMaterial, palms * 6)
  for (let i = 0; i < palms; i++) {
    const a = i / palms * Math.PI * 2 + roadRandom(i, 81) * .2, radius = 65 + roadRandom(i, 83) * 15
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius, height = 12 + roadRandom(i, 89) * 7
    transform.position.set(x, 5.8 + height / 2, z); transform.rotation.set(0, 0, (roadRandom(i, 91) - .5) * .13); transform.scale.set(1, height, 1); transform.updateMatrix(); trunks.setMatrixAt(i, transform.matrix)
    for (let frond = 0; frond < 6; frond++) {
      transform.position.set(x, 5.8 + height, z); transform.rotation.set(0, frond * Math.PI / 3 + roadRandom(i, 95), 0)
      transform.scale.setScalar(.8 + roadRandom(i + frond, 97) * .4); transform.updateMatrix(); leaves.setMatrixAt(i * 6 + frond, transform.matrix)
    }
  }
  trunks.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true
  trunks.computeBoundingSphere(); leaves.computeBoundingSphere(); island.add(trunks, leaves)

  const glintGeometry = new T.PlaneGeometry(1, 1), glintMaterial = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .58, depthWrite: false, side: T.DoubleSide })
  const glints = new T.InstancedMesh(glintGeometry, glintMaterial, tier === 'low' ? 90 : 180)
  glints.instanceColor = new T.InstancedBufferAttribute(new Float32Array(glints.count * 3).fill(1), 3)
  for (let i = 0; i < glints.count; i++) {
    const x = (roadRandom(i, 101) - .5) * 600, z = (roadRandom(i, 103) - .5) * 660
    transform.position.set(x, -2.7, z); transform.rotation.set(-Math.PI / 2, 0, 0); transform.scale.set(1 + roadRandom(i, 107) * 4, .15 + roadRandom(i, 109) * .25, 1); transform.updateMatrix(); glints.setMatrixAt(i, transform.matrix)
    glints.setColorAt(i, new T.Color(['#ffe4a8','#fff0d4','#71cced','#ffbfc8'][i % 4]))
  }
  glints.instanceMatrix.needsUpdate = true; glints.instanceColor!.needsUpdate = true; glints.computeBoundingSphere(); island.add(glints)
  return { island, water, signMap }
}

/** The tropical island is a world landmark, not an image plane or separate game scene. */
export default function RetroIsland({ state, tier }: { state: MutableRefObject<NightState>; tier: 'high' | 'medium' | 'low' }) {
  const world = useMemo(() => buildIsland(tier), [tier])
  useEffect(() => () => {
    const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>()
    for (const root of [world.island, world.water]) root.traverse(object => { if (object instanceof T.Mesh) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material) } })
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); world.signMap.dispose()
  }, [world])
  useFrame(() => {
    const s = state.current, chapter = Math.floor(s.distance / CYCLE) * CYCLE, atDistance = chapter + ISLAND_AT
    const visible = Math.abs(s.distance - atDistance) < 850 && retrowaveSkywayMix(s.distance) > .05
    world.island.visible = world.water.visible = visible
    if (!visible) return
    const origin = retrowaveRoadSample(s.distance, s.seed), at = retrowaveRoadSample(atDistance, s.seed)
    world.island.position.set(at.x - origin.x + Math.cos(at.yaw) * 100, -origin.y, at.z - origin.z - Math.sin(at.yaw) * 100)
    world.island.rotation.y = at.yaw
    world.water.position.set(0, -origin.y - 3, -200)
  })
  return <><primitive object={world.water} dispose={null}/><primitive object={world.island} dispose={null}/></>
}
