'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import type { CruiseQuality, CruiseTimeOfDay } from '@/lib/cruise/types'

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; matrix: THREE.Matrix4 }
type Tower = { parts: Part[]; height: number }
type Placement = { x: number; z: number; height: number; rotation: number; variant: number }

// Western mainland skyline leaves the eastern ocean horizon unobstructed.
const PLACEMENTS: Placement[] = [
  { x: -56, z: -205, height: 29, rotation: 0.2, variant: 0 },
  { x: -83, z: -231, height: 43, rotation: -0.15, variant: 1 },
  { x: -116, z: -254, height: 33, rotation: 0.3, variant: 1 },
  { x: -37, z: -286, height: 22, rotation: 0.4, variant: 0 },
  { x: -148, z: -306, height: 36, rotation: 0.1, variant: 1 },
  { x: -106, z: -322, height: 24, rotation: 0.25, variant: 0 },
]

function TowerPart({ part, placements, height }: { part: Part; placements: Placement[]; height: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const current = mesh.current
    if (!current) return
    const transform = new THREE.Object3D()
    const matrix = new THREE.Matrix4()
    placements.forEach((placement, index) => {
      transform.position.set(placement.x, 0, placement.z)
      transform.rotation.set(0, placement.rotation, 0)
      transform.scale.setScalar(placement.height / height)
      transform.updateMatrix()
      current.setMatrixAt(index, matrix.multiplyMatrices(transform.matrix, part.matrix))
    })
    current.instanceMatrix.needsUpdate = true
    current.computeBoundingSphere()
    return () => { current.dispose() }
  }, [part, placements, height])
  return <instancedMesh ref={mesh} args={[part.geometry, part.material, placements.length]} />
}

export default function AuthoredSkyline({ quality, timeOfDay, onReady }: {
  quality: CruiseQuality; timeOfDay: CruiseTimeOfDay; onReady: (ready: boolean) => void
}) {
  const [towers, setTowers] = useState<Tower[]>([])
  const placements = useMemo(() => {
    const visible = PLACEMENTS.slice(0, quality === 'low' ? 3 : quality === 'medium' ? 5 : 6)
    return [0, 1].map(variant => visible.filter(item => item.variant === variant))
  }, [quality])
  useEffect(() => {
    let active = true
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const textures = new Set<THREE.Texture>()
    const dispose = () => {
      geometries.forEach(value => value.dispose())
      materials.forEach(value => value.dispose())
      textures.forEach(value => value.dispose())
    }
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    void Promise.allSettled(['skyline-terraced', 'skyline-glass'].map(name =>
      loader.loadAsync(`/cruise/environment/skyline/${name}.glb`))).then(results => {
      const loaded: Tower[] = []
      results.forEach(result => {
        if (result.status !== 'fulfilled') return
        const scene = result.value.scene
        scene.updateMatrixWorld(true)
        const parts: Part[] = []
        const bounds = new THREE.Box3().setFromObject(scene)
        scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return
          geometries.add(object.geometry)
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(material)
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) textures.add(value)
            }
          }
          parts.push({ geometry: object.geometry, material: object.material, matrix: object.matrixWorld.clone() })
        })
        loaded.push({ parts, height: bounds.max.y - bounds.min.y })
      })
      if (!active || loaded.length !== 2 || loaded.some(tower => !tower.parts.length || tower.height <= 0)) {
        dispose()
        return
      }
      setTowers(loaded)
      onReady(true)
    })
    return () => { active = false; dispose() }
  }, [onReady])
  useEffect(() => {
    for (const tower of towers) for (const part of tower.parts) {
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue
        if (material.name === 'Silver-blue architectural glass') {
          material.emissive.set('#ffd3a0')
          material.emissiveIntensity = timeOfDay === 'night' ? 0.28 : timeOfDay === 'sunset' ? 0.025 : 0
        } else if (material.name === 'Cool reflective architectural glass') {
          material.emissive.set('#8fa9bd')
          material.emissiveIntensity = timeOfDay === 'night' ? 0.025 : 0
        }
      }
    }
  }, [towers, timeOfDay])
  return <group dispose={null}>{towers.flatMap((tower, variant) => tower.parts.map((part, index) =>
    <TowerPart key={`${variant}-${index}-${quality}`} part={part} height={tower.height} placements={placements[variant]} />))}</group>
}
