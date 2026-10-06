'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, Group, Material, MathUtils, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three'
import { HERO_X } from '@/lib/cruise/constants'
import { getVehicle } from '@/lib/cruise/vehicles'
import type { HeroCarProps } from './HeroCar'
import DriverCockpit from './DriverCockpit'
import { useCockpit } from './CockpitContext'
import { routeCurvature } from '@/lib/cruise/routePath'

const vehicle = getVehicle('classic-coupe')

export default function ClassicCar({ runtime, quality, camera, timeOfDay, weather, onReady, parked = false }: HeroCarProps) {
  const cockpit = useCockpit()
  const lights = cockpit ? cockpit.lights : timeOfDay === 'night' || weather === 'rain'
  const lampTarget = useMemo(() => { const target = new Object3D(); target.position.set(0, 0, -22); return target }, [])
  // Drei registers MeshoptDecoder; deliberately no preload for this larger asset.
  const { scene } = useGLTF(vehicle.model)
  const angle = useRef(0)
  const spin = useMemo(() => new Quaternion(), [])
  const model = useMemo(() => {
    const body = scene.clone(true)
    const owned = new Map<Material, Material>()
    const glass: MeshStandardMaterial[] = []
    body.traverse(object => {
      if (!(object instanceof Mesh)) return
      const remap = (source: Material) => {
        const existing = owned.get(source)
        if (existing) return existing
        const glazing = /glass/i.test(source.name) || (source instanceof MeshPhysicalMaterial && source.transmission > 0)
        const material = glazing ? new MeshStandardMaterial({
          name: source.name, color: '#60777c', metalness: 0.05, roughness: 0.18,
          transparent: true, opacity: 0.28, depthWrite: false, side: DoubleSide,
        }) : source.clone()
        if (glazing) glass.push(material as MeshStandardMaterial)
        // Tune owned clones only: keep the cached GLTF reusable in the garage.
        // The source cabin used near-black albedo and polished chrome, which
        // crushed the instruments and produced noisy reflections in driver view.
        if (material instanceof MeshStandardMaterial && !glazing) {
          if (/^(Chrome|Steel)/.test(material.name)) {
            material.roughness = 0.34
            material.metalness = 0.82
            material.envMapIntensity = 0.72
          } else if (/^Dash/.test(material.name)) {
            material.color.set('#464843')
            material.roughness = 0.92
            material.envMapIntensity = 0.4
            if (material instanceof MeshPhysicalMaterial) material.clearcoat = 0.06
          } else if (/^Cabin/.test(material.name)) {
            material.color.set('#685a4d')
            material.roughness = 0.86
          } else if (/^Leather/.test(material.name)) {
            material.color.set('#94735a')
            material.roughness = 0.72
            if (material instanceof MeshPhysicalMaterial) material.clearcoat = 0.06
          } else if (/^InnerBody/.test(material.name)) {
            material.color.set('#3c4644')
            material.roughness = 0.88
          }
        }
        owned.set(source, material)
        return material
      }
      object.material = Array.isArray(object.material) ? object.material.map(remap) : remap(object.material)
    })
    const wheels = vehicle.wheels.flatMap(definition => {
      const node = body.getObjectByName(definition.node)
      return node ? [{ node, base: node.quaternion.clone(), axis: new Vector3(...definition.axis) }] : []
    })
    const wheel = body.getObjectByName('STEERING_WHEEL')
    const steering = new Group(); steering.position.set(-.3024, .92539, -.408)
    body.add(steering); body.updateMatrixWorld(true)
    if (wheel) steering.attach(wheel)
    return { body, owned, glass, wheels, steering }
  }, [scene])

  useEffect(() => { onReady?.() }, [model, onReady])

  useEffect(() => {
    model.body.traverse(object => {
      if (!(object instanceof Mesh)) return
      object.castShadow = quality !== 'low'
      object.receiveShadow = quality !== 'low'
    })
    model.glass.forEach(material => { material.opacity = camera === 'driver' ? 0.06 : 0.28 })
  }, [camera, model, quality])

  // Geometry and textures belong to useGLTF's cache; only dispose cloned materials.
  useEffect(() => () => { model.owned.forEach(material => material.dispose()) }, [model])
  useFrame((_, delta) => {
    model.steering.rotation.z = -MathUtils.clamp(routeCurvature(runtime.current.distance)*18,-.28,.28)
    angle.current = MathUtils.euclideanModulo(angle.current + (parked ? 0 : Math.max(0, runtime.current.speed)) * Math.min(delta, 0.05) / vehicle.wheels[0].radius, Math.PI * 2)
    model.wheels.forEach(({ node, base, axis }) => {
      spin.setFromAxisAngle(axis, -angle.current)
      node.quaternion.copy(base).multiply(spin)
    })
  })
  return <group name="HeroCar" position={[HERO_X, vehicle.groundOffset, 0]} rotation={[...vehicle.rotation]} scale={vehicle.scale}>
    <primitive object={model.body} dispose={null} />
    <DriverCockpit camera={camera} vehicleId="classic-coupe" />
    <group>
      <primitive object={lampTarget} />
      <spotLight position={[0, .7, -2.38]} target={lampTarget} intensity={lights ? (timeOfDay === 'night' ? 6 : 3) : 0} color="#ffe2ad" distance={38} decay={1.6} angle={.42} penumbra={.78} />
      {lights && [-.70, .70].flatMap(x => [.60, .82].map(y => <mesh key={`${x}-${y}`} position={[x, y, -2.36]} rotation={[0, Math.PI, 0]}><circleGeometry args={[.075, 16]} /><meshBasicMaterial color="#ffe2ad" toneMapped={false} /></mesh>))}
    </group>
  </group>
}
