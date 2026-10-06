'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

type Part = { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }
function TrafficPart({ part, transforms, colors }: { part: Part; transforms: THREE.Matrix4[]; colors: THREE.Color[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const mesh = ref.current
    mesh?.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    if (mesh && part.material.name === 'Traffic paint') colors.forEach((color, index) => mesh.setColorAt(index, color))
    return () => { mesh?.dispose() }
  }, [colors, part])
  useFrame(() => {
    if (!ref.current) return
    let count = 0
    transforms.forEach((matrix, index) => {
      if (Math.abs(matrix.elements[0]) + Math.abs(matrix.elements[2]) < .001) return
      ref.current!.setMatrixAt(count, matrix)
      if (part.material.name === 'Traffic paint') ref.current!.setColorAt(count, colors[index])
      count++
    })
    ref.current.count = count
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[part.geometry, part.material, transforms.length]} frustumCulled={false} castShadow receiveShadow />
}

export default function AuthoredTraffic({ transforms, colors, night, onReady }: { transforms: THREE.Matrix4[]; colors: THREE.Color[]; night: boolean; onReady: (ready: boolean) => void }) {
  const [parts, setParts] = useState<Part[]>([])
  const loader = useMemo(() => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), [])
  useEffect(() => { parts.forEach(({ material }) => {
    if (material.name === 'Traffic rear lens') { material.emissive.set('#f12913'); material.emissiveIntensity = night ? 1.2 : .1 }
  }) }, [parts, night])
  useEffect(() => {
    let active = true
    const owned: Part[] = []
    void loader.loadAsync('/cruise/traffic/classic-traffic.glb').then(gltf => {
      gltf.scene.updateMatrixWorld(true)
      gltf.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        // Meshopt can share position buffers across material primitives.
        // Clone before baking a transform so each buffer is transformed once.
        const geometry = object.geometry.clone()
        geometry.applyMatrix4(object.matrixWorld)
        object.geometry.dispose()
        const material = object.material as THREE.MeshStandardMaterial
        material.vertexColors = false
        owned.push({ geometry, material })
      })
      if (!active) { owned.forEach(part => { part.geometry.dispose(); part.material.dispose() }); return }
      setParts(owned); onReady(owned.length > 0)
    }).catch(() => { if (active) onReady(false) })
    return () => { active = false; owned.forEach(part => { part.geometry.dispose(); part.material.dispose() }); onReady(false) }
  }, [loader, onReady])
  return <group name="AuthoredTrafficLOD" dispose={null}>{parts.map((part, index) => <TrafficPart key={index} part={part} transforms={transforms} colors={colors} />)}</group>
}
