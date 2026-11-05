'use client'

import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as T from 'three'
import type { MiamiRoute } from './MiamiWorld'
import type { NightState } from '../nightdrive/state'
import { applyOceanDriveFacade, streetNight } from './paintedPlaster'
import manifest from '../../../public/real-miami/ocean-drive/manifest.json'
import hybridManifest from '../../../public/real-miami/ocean-drive/manifest-hybrid.json'
import districtManifest from '../../../public/real-miami/ocean-drive/manifest-district.json'
import districtLowManifest from '../../../public/real-miami/ocean-drive/manifest-district-low.json'
import { cruiseCityVariant } from '@/lib/cruise-os/city-variant'
import { cruiseLookEnabled } from '@/lib/cruise-os/look'

// The GLB contains only baked MIT hotel geometry, adapted to mapped frontages.
// Upstream renderer, sky, controls, people and vehicle assets are not imported.
export const oceanDriveEdges = new Set(manifest.coveredEdges)
export const hybridOceanDriveEdges = new Set(hybridManifest.coveredEdges)
export const districtOceanDriveEdges = new Set(districtManifest.coveredEdges)
export const districtOceanDriveBuildings = new Set(districtManifest.facades.map(f => String(f.id)))
export function hybridOceanDriveEnabled() {
  if (typeof window === 'undefined') return false
  const value = new URLSearchParams(window.location.search).get('city')
  return ['hybrid', 'district'].includes(cruiseLookEnabled() ? cruiseCityVariant(value) : value || '')
}
export function districtOceanDriveEnabled() {
  return typeof window !== 'undefined' && cruiseLookEnabled() && cruiseCityVariant(new URLSearchParams(window.location.search).get('city')) === 'district'
}
export function oceanDriveEnabled(look: boolean) {
  return look && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('oceanDrive') !== 'off'
}

function signTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024
  const c = canvas.getContext('2d')!
  c.clearRect(0, 0, 1024, 1024); c.fillStyle = '#e8ffe7'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.font = '600 84px sans-serif'
  Array.from('BUENAONDA').forEach((letter, i) => c.fillText(letter, 64, 56 + i * 112))
  c.font = '600 104px sans-serif'; c.fillText('BUENA ONDA', 614, 512, 770)
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4
  return texture
}

export default function OceanDriveFacades({ state, route, blend, night, plaster, windows }: {
  state: MutableRefObject<NightState>; route: MiamiRoute; blend?: MutableRefObject<number>; night: boolean
  plaster: T.MeshStandardMaterial; windows: T.MeshStandardMaterial
}) {
  const district = districtOceanDriveEnabled(), hybrid = hybridOceanDriveEnabled()
  const lowDistrict = district && (new URLSearchParams(location.search).get('quality') === 'low' || (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 700))
  const activeManifest = lowDistrict ? districtLowManifest : district ? districtManifest : hybrid ? hybridManifest : manifest
  const asset = useGLTF(lowDistrict ? '/real-miami/ocean-drive/district-buildings-low.glb' : district ? '/real-miami/ocean-drive/district-buildings.glb' : hybrid ? '/real-miami/ocean-drive/facades-hybrid.glb' : '/real-miami/ocean-drive/facades.glb', false, true)
  const world = useMemo(() => {
    const group = asset.scene.clone(true), signs = signTexture(), paint = plaster.clone()
    paint.color.set('white'); applyOceanDriveFacade(paint, streetNight)
    const materials: Record<string, T.MeshStandardMaterial> = {
      paint,
      metal: new T.MeshStandardMaterial({ vertexColors: true, roughness: .44, metalness: .2 }),
      fabric: new T.MeshStandardMaterial({ vertexColors: true, roughness: .92, side: T.DoubleSide }),
      glass: windows, // Existing room texture and day/night lighting remain owned by MiamiWorld.
      signs: new T.MeshStandardMaterial({ map: signs, emissiveMap: signs, emissive: '#b1eccc', emissiveIntensity: .5, alphaTest: .4, roughness: .6, side: T.DoubleSide }),
    }
    group.traverse(o => {
      if (!(o instanceof T.Mesh)) return
      const key = o.name.replace(/^OceanDrive_/, '')
      o.material = materials[key] || paint; o.castShadow = false; o.receiveShadow = true
    })
    const cells: { group: T.Object3D; x: number; z: number }[] = []
    group.traverse(g => {
      if (g.name.startsWith('OceanDriveCell_') && Number.isFinite(g.userData.x) && Number.isFinite(g.userData.z)) cells.push({ group: g, x: g.userData.x, z: g.userData.z })
    })
    return { group, cells, materials, signs, lastTelemetry: 0 }
  }, [asset.scene, plaster, windows])
  useEffect(() => () => {
    Object.entries(world.materials).forEach(([key, m]) => { if (key !== 'glass') m.dispose() })
    world.signs.dispose() // Cached GLTF geometries remain owned by useGLTF.
    delete document.documentElement.dataset.oceanDrive
  }, [world])
  useFrame(() => {
    const p = route.sample(state.current.distance), darkness = blend ? blend.current : night ? 1 : 0
    world.group.position.set(-p.x, -p.y, -p.z)
    const active = new Set(world.cells.filter(c => Math.hypot(c.x - p.x, c.z - p.z) < 290).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, 3))
    for (const cell of world.cells) {
      cell.group.visible = active.has(cell)
    }
    // Retain pastel detail at night under the existing street wash, without adding lights.
    world.materials.paint.color.set('#ffffff').lerp(new T.Color('#a4abbf'), darkness)
    world.materials.signs.emissiveIntensity = .08 + darkness * (district ? .42 : .65)
    if (performance.now() - world.lastTelemetry > 900) {
      document.documentElement.dataset.oceanDrive = JSON.stringify({ loaded: true, facades: activeManifest.facades.length, cells: world.cells.length, activeCells: active.size, maxExtraDrawCalls: 15, assetBytes: activeManifest.bytes, source: activeManifest.source, variant: district ? 'district' : hybrid ? 'hybrid' : 'legacy', detail: lowDistrict ? 'low' : 'full' })
      world.lastTelemetry = performance.now()
    }
  })
  return <primitive object={world.group} dispose={null} />
}
