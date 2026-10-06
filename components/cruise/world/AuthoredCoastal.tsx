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
import { moduleZ } from '@/lib/cruise/constants'
import type { CruiseQuality, CruiseRuntime, CruiseTimeOfDay } from '@/lib/cruise/types'

export type CoastalPlacement = { module: number; z: number; scale: number; variant: number }
type Part = { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; matrix: THREE.Matrix4; variant: number }

function HotelPart({ part, placements, runtime, quality }: {
  part: Part; placements: CoastalPlacement[]; runtime: MutableRefObject<CruiseRuntime>; quality: CruiseQuality
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const scratch = useMemo(() => ({ object: new THREE.Object3D(), matrix: new THREE.Matrix4() }), [])
  useEffect(() => {
    const current = mesh.current
    current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    return () => { current?.dispose() }
  }, [])
  useFrame(() => {
    const current = mesh.current
    if (!current) return
    let count = 0
    for (const placement of placements) {
      const z = moduleZ(placement.module, runtime.current.distance) + placement.z
      if (z < -230 || z > 65) continue
      // Export front is +Z; face the +X road from its western sidewalk.
      const pose = routeRelativePose(runtime.current.distance, z, -20.8)
      scratch.object.position.set(pose.x, .1, pose.z)
      scratch.object.rotation.set(0, Math.PI / 2 + pose.yaw, 0)
      scratch.object.scale.setScalar(placement.scale)
      scratch.object.updateMatrix()
      scratch.matrix.multiplyMatrices(scratch.object.matrix, part.matrix)
      current.setMatrixAt(count++, scratch.matrix)
    }
    current.count = count
    current.visible = count > 0
    current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[part.geometry, part.material, placements.length]}
    frustumCulled={false} userData={{ cruiseOccluder: true }} castShadow={quality === 'high'} receiveShadow />
}

export default function AuthoredCoastal({ placements, runtime, quality, timeOfDay, onReady, music }: {
  music?: MusicAudio
  placements: CoastalPlacement[]; runtime: MutableRefObject<CruiseRuntime>; quality: CruiseQuality; timeOfDay: CruiseTimeOfDay; onReady: (ready: boolean) => void
}) {
  const [parts, setParts] = useState<Part[]>([])
  useEffect(() => {
    if (!music) return
    const materials = new Set<THREE.Material>()
    for(const part of parts) for(const m of Array.isArray(part.material)?part.material:[part.material]) materials.add(m)
    const cleanup=Array.from(materials,m=>installMiamiMaterial(m,music,'facade'))
    return ()=>cleanup.forEach(dispose=>dispose())
  },[parts,music])
  const byVariant = useMemo(() => [0, 1].map(variant => placements.filter(item => item.variant === variant)), [placements])
  useEffect(() => {
    const visited = new Set<THREE.Material>()
    for (const part of parts) {
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
        if (visited.has(material) || !(material instanceof THREE.MeshStandardMaterial)) continue
        visited.add(material)
        if (material.name === 'MI_Glass' || material.name === 'Storefront dark glass') {
          material.envMapIntensity = 1.5
          material.depthWrite = false
        } else if (material.name === 'Storefront interior light') {
          material.emissiveIntensity = timeOfDay === 'night' ? 1 : timeOfDay === 'sunset' ? 0.5 : 0.2
        } else if (material.name.startsWith('MI_FakeInterior')) {
          // Exported room cards need shaded daytime interiors and their own night light.
          material.color.set('#56616d')
          if (!material.emissiveMap) { material.emissiveMap = material.map; material.needsUpdate = true }
          material.emissive.set('#f8c48c')
          material.emissiveIntensity = timeOfDay === 'night' ? 0.5 : 0.015
        }
      }
    }
  }, [parts, timeOfDay])
  useEffect(() => {
    let active = true
    let dispose = () => {}
    const suffix = quality === 'high' ? '' : '-low'
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
    void Promise.allSettled(['ocean-hotel', 'coastal-apartments'].map(name =>
      loader.loadAsync(`/cruise/environment/coastal/${name}${suffix}.glb`))).then(results => {
      const materials = new Set<THREE.Material>()
      const geometries = new Set<THREE.BufferGeometry>()
      const textures = new Set<THREE.Texture>()
      const loaded: Part[] = []
      results.forEach((result, variant) => {
      if (result.status !== 'fulfilled') return
      result.value.scene.updateMatrixWorld(true)
      result.value.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        geometries.add(object.geometry)
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material)
          // Source vertex-color data is not part of the authored coastal albedo.
          material.vertexColors = false
          if (material instanceof THREE.MeshStandardMaterial && material.name === 'MI_Trim_MetalConcrete') {
            material.color.set('#8499a0')
            material.onBeforeCompile = shader => {
              shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
                float coastalLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(coastalLuma), 0.85);
              `)
            }
            material.customProgramCacheKey = () => 'coastal-metal-desaturate-v1'
          }
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) {
              textures.add(value)
              value.anisotropy = 4
            }
          }
        }
        loaded.push({ geometry: object.geometry, material: object.material, matrix: object.matrixWorld.clone(), variant })
      })
      })
      dispose = () => {
        geometries.forEach(value => value.dispose())
        materials.forEach(value => value.dispose())
        textures.forEach(value => value.dispose())
      }
      if (!active || !loaded.length || results.some(result => result.status !== 'fulfilled')) {
        dispose()
        if (active) onReady(false)
        return
      }
      setParts(loaded)
      onReady(true)
    })
    return () => { active = false; dispose() }
  }, [onReady, quality])
  return <group dispose={null}>{parts.map((part, index) => <HotelPart key={index} part={part} placements={byVariant[part.variant]} runtime={runtime} quality={quality} />)}</group>
}
