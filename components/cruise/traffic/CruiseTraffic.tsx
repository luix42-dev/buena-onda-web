'use client'

import { useFrame } from '@react-three/fiber'
import { type MutableRefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import AuthoredTraffic from './AuthoredTraffic'

import {
  HERO_X,
  MODULE_LENGTH,
  QUALITY,
  WORLD_LENGTH,
  WORLD_MIN_Z,
  moduleZ,
  routeIndexAtDistance,
} from '@/lib/cruise/constants'
import { CRUISE_ROUTE, routeFamilyAtOffset, supportsOuterTrafficLane } from '@/lib/cruise/routes'
import type {
  CruiseQuality,
  CruiseRuntime,
  CruiseTimeOfDay,
  CruiseWeather,
} from '@/lib/cruise/types'

export interface CruiseTrafficProps {
  runtime: MutableRefObject<CruiseRuntime>
  quality: CruiseQuality
  timeOfDay: CruiseTimeOfDay
  weather: CruiseWeather
}

type TrafficKind = 'same-direction' | 'passing' | 'oncoming' | 'parked'

type VehicleAppearance = {
  width: number
  length: number
  bodyHeight: number
  cabinWidth: number
  cabinLength: number
  cabinHeight: number
  rideHeight: number
}

type TrafficVehicle = {
  kind: TrafficKind
  appearance: VehicleAppearance
  color: THREE.Color
  phase: number
  speed: number
  anchorZ: number
  amplitude: number
  frequency: number
  moduleIndex: number
  localZ: number
  side: -1 | 1
}

type TrafficAssets = {
  bodyGeometry: THREE.BufferGeometry
  cabinGeometry: THREE.BufferGeometry
  roofGeometry: THREE.BufferGeometry
  box: THREE.BoxGeometry
  wheel: THREE.CylinderGeometry
  rim: THREE.CylinderGeometry
  body: THREE.MeshPhysicalMaterial
  bodyLow: THREE.MeshStandardMaterial
  glass: THREE.MeshStandardMaterial
  tire: THREE.MeshStandardMaterial
  wheelMetal: THREE.MeshStandardMaterial
  bumper: THREE.MeshStandardMaterial
  headlights: THREE.MeshBasicMaterial
  taillights: THREE.MeshBasicMaterial
  geometries: THREE.BufferGeometry[]
  materials: THREE.Material[]
}

const APPEARANCES: readonly VehicleAppearance[] = [
  {
    width: 1.78,
    length: 4.35,
    bodyHeight: 0.52,
    cabinWidth: 1.48,
    cabinLength: 2.14,
    cabinHeight: 0.54,
    rideHeight: 0.22,
  },
  {
    width: 1.68,
    length: 3.68,
    bodyHeight: 0.5,
    cabinWidth: 1.42,
    cabinLength: 1.9,
    cabinHeight: 0.61,
    rideHeight: 0.22,
  },
  {
    width: 1.9,
    length: 4.48,
    bodyHeight: 0.66,
    cabinWidth: 1.61,
    cabinLength: 2.42,
    cabinHeight: 0.7,
    rideHeight: 0.28,
  },
]

const BODY_COLORS = [
  0xd2d5d2,
  0x273b49,
  0xa93e37,
  0xe0c7a0,
  0x31564e,
  0x222526,
  0x7b858b,
  0xc9aa3c,
] as const

const SAME_DIRECTION_Z = [-52, -106, -178, -268, -386, -526, -690, -875] as const
const PARKING_MODULES = [1, 4, 5, 14, 15, 17, 18, 2] as const
const PARKING_LOCAL_Z = [-16, 13, -20, 18, -9, 16, -13, 21] as const
const PASSING_BACK_Z = 76
const PASSING_FRONT_Z = -338
const PASSING_SPAN = PASSING_BACK_Z - PASSING_FRONT_Z
const WHEEL_RADIUS = 0.31
const HIDDEN_SCALE = 0.0001
const AXLE_ROTATION = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 0, 1),
  -Math.PI * 0.5,
)
const HEADLIGHT_DAY = new THREE.Color(0xaaa69a)
const HEADLIGHT_SUNSET = new THREE.Color(0xffd7a0)
const HEADLIGHT_NIGHT = new THREE.Color(0xfff2ce)
const TAILLIGHT_DAY = new THREE.Color(0x651912)
const TAILLIGHT_NIGHT = new THREE.Color(0xff3d2e)
const TAIL_DIM = new THREE.Color(0x60231f)
const TAIL_BRAKE = new THREE.Color(0xffc0ad)

function random(seed: number) {
  const value = Math.sin(seed * 83.173 + 21.417) * 43758.5453
  return value - Math.floor(value)
}

function modulo(value: number, length: number) {
  return ((value % length) + length) % length
}

function wrapWorldZ(value: number) {
  return modulo(value - WORLD_MIN_Z, WORLD_LENGTH) + WORLD_MIN_Z
}

type LoftRing = {
  z: number
  halfWidth: number
  bottom: number
  top: number
}

function createLoftGeometry(rings: readonly LoftRing[]) {
  const positions: number[] = []
  const indices: number[] = []

  rings.forEach(({ z, halfWidth, bottom, top }) => {
    positions.push(
      -halfWidth, top, z,
      halfWidth, top, z,
      -halfWidth, bottom, z,
      halfWidth, bottom, z,
    )
  })

  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    const current = ring * 4
    const next = current + 4
    indices.push(
      current, next, current + 1,
      current + 1, next, next + 1,
      current + 2, current + 3, next + 2,
      current + 3, next + 3, next + 2,
      current, current + 2, next,
      current + 2, next + 2, next,
      current + 1, next + 1, current + 3,
      current + 3, next + 1, next + 3,
    )
  }

  const last = (rings.length - 1) * 4
  indices.push(
    0, 1, 2,
    1, 3, 2,
    last, last + 2, last + 1,
    last + 1, last + 2, last + 3,
  )

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function createAssets(): TrafficAssets {
  const bodyGeometry = createLoftGeometry([
    { z: -0.5, halfWidth: 0.36, bottom: -0.2, top: 0.04 },
    { z: -0.43, halfWidth: 0.48, bottom: -0.47, top: 0.34 },
    { z: -0.22, halfWidth: 0.5, bottom: -0.5, top: 0.5 },
    { z: 0.2, halfWidth: 0.5, bottom: -0.5, top: 0.5 },
    { z: 0.43, halfWidth: 0.47, bottom: -0.46, top: 0.3 },
    { z: 0.5, halfWidth: 0.35, bottom: -0.18, top: 0.02 },
  ])
  const cabinGeometry = createLoftGeometry([
    { z: -0.5, halfWidth: 0.49, bottom: -0.5, top: -0.42 },
    { z: -0.3, halfWidth: 0.39, bottom: -0.48, top: 0.5 },
    { z: 0.29, halfWidth: 0.4, bottom: -0.48, top: 0.5 },
    { z: 0.5, halfWidth: 0.48, bottom: -0.5, top: -0.4 },
  ])
  const roofGeometry = createLoftGeometry([
    { z: -0.5, halfWidth: 0.39, bottom: -0.35, top: 0.12 },
    { z: -0.38, halfWidth: 0.5, bottom: -0.5, top: 0.42 },
    { z: 0.38, halfWidth: 0.5, bottom: -0.5, top: 0.42 },
    { z: 0.5, halfWidth: 0.39, bottom: -0.35, top: 0.12 },
  ])
  const box = new THREE.BoxGeometry(1, 1, 1)
  const wheel = new THREE.CylinderGeometry(1, 1, 1, 12, 1)
  const rim = new THREE.CylinderGeometry(1, 1, 1, 12, 1)
  const body = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.46,
    roughness: 0.34,
    clearcoat: 0.78,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.05,
  })
  const bodyLow = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.36,
    roughness: 0.4,
    envMapIntensity: 0.88,
  })
  const glass = new THREE.MeshStandardMaterial({
    color: 0x294752,
    metalness: 0.04,
    roughness: 0.13,
    envMapIntensity: 1.28,
  })
  const tire = new THREE.MeshStandardMaterial({
    color: 0x101314,
    metalness: 0.015,
    roughness: 0.9,
  })
  const wheelMetal = new THREE.MeshStandardMaterial({
    color: 0xbcc3c2,
    metalness: 0.88,
    roughness: 0.24,
    envMapIntensity: 1.2,
  })
  const bumper = new THREE.MeshStandardMaterial({
    color: 0x171c1d,
    metalness: 0.08,
    roughness: 0.58,
    envMapIntensity: 0.72,
  })
  const headlights = new THREE.MeshBasicMaterial({
    color: HEADLIGHT_DAY,
    toneMapped: false,
  })
  const taillights = new THREE.MeshBasicMaterial({
    color: TAILLIGHT_DAY,
    toneMapped: false,
  })

  return {
    bodyGeometry,
    cabinGeometry,
    roofGeometry,
    box,
    wheel,
    rim,
    body,
    bodyLow,
    glass,
    tire,
    wheelMetal,
    bumper,
    headlights,
    taillights,
    geometries: [bodyGeometry, cabinGeometry, roofGeometry, box, wheel, rim],
    materials: [body, bodyLow, glass, tire, wheelMetal, bumper, headlights, taillights],
  }
}

function createVehicles(count: number): TrafficVehicle[] {
  const passingCount = count >= 14 ? 2 : 1
  const oncomingCount = count >= 9 ? 2 : 1
  const parkedCount = count >= 14 ? 4 : count >= 9 ? 2 : 1
  const sameDirectionCount = count - passingCount - oncomingCount - parkedCount
  const vehicles: TrafficVehicle[] = []

  for (let index = 0; index < sameDirectionCount; index += 1) {
    const seed = 101 + index * 47
    vehicles.push({
      kind: 'same-direction',
      appearance: APPEARANCES[index % APPEARANCES.length],
      color: new THREE.Color(BODY_COLORS[index % BODY_COLORS.length]),
      phase: random(seed) * Math.PI * 2,
      speed: 10.9 + random(seed + 1) * 3.2,
      anchorZ: SAME_DIRECTION_Z[index % SAME_DIRECTION_Z.length] - Math.floor(index / SAME_DIRECTION_Z.length) * 86,
      amplitude: 5 + random(seed + 2) * 8,
      frequency: 0.075 + random(seed + 3) * 0.055,
      moduleIndex: 0,
      localZ: 0,
      side: 1,
    })
  }

  for (let index = 0; index < passingCount; index += 1) {
    const seed = 401 + index * 71
    vehicles.push({
      kind: 'passing',
      appearance: APPEARANCES[(index + 1) % APPEARANCES.length],
      color: new THREE.Color(BODY_COLORS[(index + 3) % BODY_COLORS.length]),
      phase: index / passingCount,
      speed: 17.2 + random(seed) * 1.5,
      anchorZ: 0,
      amplitude: 0,
      frequency: 0,
      moduleIndex: 0,
      localZ: 0,
      side: 1,
    })
  }

  for (let index = 0; index < oncomingCount; index += 1) {
    const seed = 701 + index * 89
    vehicles.push({
      kind: 'oncoming',
      appearance: APPEARANCES[(index + 2) % APPEARANCES.length],
      color: new THREE.Color(BODY_COLORS[(index + 5) % BODY_COLORS.length]),
      phase: random(seed) * WORLD_LENGTH,
      speed: 10.4 + random(seed + 1) * 2.6,
      anchorZ: 0,
      amplitude: 0,
      frequency: 0,
      moduleIndex: 0,
      localZ: 0,
      side: -1,
    })
  }

  for (let index = 0; index < parkedCount; index += 1) {
    const seed = 1001 + index * 97
    const side: -1 | 1 = index % 2 === 0 ? 1 : -1
    vehicles.push({
      kind: 'parked',
      appearance: APPEARANCES[index % APPEARANCES.length],
      color: new THREE.Color(BODY_COLORS[(index + 1) % BODY_COLORS.length]),
      phase: 0,
      speed: 0,
      anchorZ: 0,
      amplitude: 0,
      frequency: 0,
      moduleIndex: PARKING_MODULES[index % PARKING_MODULES.length],
      localZ: PARKING_LOCAL_Z[index % PARKING_LOCAL_Z.length],
      side,
    })
  }

  return vehicles
}

function routeLocalZ(routeIndex: number, distance: number, worldZ: number) {
  let value = worldZ - moduleZ(routeIndex, distance)
  if (value > WORLD_LENGTH * 0.5) value -= WORLD_LENGTH
  if (value < -WORLD_LENGTH * 0.5) value += WORLD_LENGTH
  return value
}

function supportsHighwayLane(routeIndex: number, localZ: number) {
  return supportsOuterTrafficLane(CRUISE_ROUTE[routeIndex], localZ)
}

function supportsOncoming(routeIndex: number, localZ: number) {
  const family = routeFamilyAtOffset(CRUISE_ROUTE[routeIndex], localZ)
  return family === 'causeway' || family === 'highway'
}

function setDynamicUsage(mesh: THREE.InstancedMesh | null) {
  if (!mesh) return
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
}

export default function CruiseTraffic({
  runtime,
  quality,
  timeOfDay,
  weather,
}: CruiseTrafficProps) {
  const vehicleCount = QUALITY[quality].trafficCount
  const vehicles = useMemo(() => createVehicles(vehicleCount), [vehicleCount])
  const [authoredReady, setAuthoredReady] = useState(false)
  const authoredTransforms = useMemo(() => vehicles.map(() => new THREE.Matrix4().makeScale(0, 0, 0)), [vehicles])
  const authoredColors = useMemo(() => vehicles.map(vehicle => vehicle.color), [vehicles])
  const assets = useMemo(createAssets, [])
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const roofRef = useRef<THREE.InstancedMesh>(null)
  const glassRef = useRef<THREE.InstancedMesh>(null)
  const wheelRef = useRef<THREE.InstancedMesh>(null)
  const rimRef = useRef<THREE.InstancedMesh>(null)
  const bumperRef = useRef<THREE.InstancedMesh>(null)
  const headlightRef = useRef<THREE.InstancedMesh>(null)
  const taillightRef = useRef<THREE.InstancedMesh>(null)
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const position = useMemo(() => new THREE.Vector3(), [])
  const scale = useMemo(() => new THREE.Vector3(), [])
  const yaw = useMemo(() => new THREE.Quaternion(), [])
  const wheelSpin = useMemo(() => new THREE.Quaternion(), [])
  const wheelRotation = useMemo(() => new THREE.Quaternion(), [])

  useEffect(() => {
    assets.body.roughness = weather === 'rain' ? 0.23 : 0.42
    assets.body.envMapIntensity = weather === 'rain' ? 1.28 : 0.9
    assets.bodyLow.roughness = weather === 'rain' ? 0.3 : 0.4
    assets.bodyLow.envMapIntensity = weather === 'rain' ? 1.02 : 0.88
    assets.glass.roughness = weather === 'rain' ? 0.11 : 0.19

    const headlightColor = timeOfDay === 'night'
      ? HEADLIGHT_NIGHT
      : timeOfDay === 'sunset'
        ? HEADLIGHT_SUNSET
        : HEADLIGHT_DAY
    assets.headlights.color.copy(headlightColor)
    assets.taillights.color.copy(timeOfDay === 'day' ? TAILLIGHT_DAY : TAILLIGHT_NIGHT)
  }, [assets, timeOfDay, weather])

  useEffect(() => () => {
    assets.geometries.forEach(geometry => geometry.dispose())
    assets.materials.forEach(material => material.dispose())
  }, [assets])

  const updateInstances = (distance: number, time: number) => {
    const bodyMesh = bodyRef.current
    const roofMesh = roofRef.current
    const glassMesh = glassRef.current
    const wheelMesh = wheelRef.current
    const rimMesh = rimRef.current
    const bumperMesh = bumperRef.current
    const headlightMesh = headlightRef.current
    const taillightMesh = taillightRef.current
    if (
      !bodyMesh || !roofMesh || !glassMesh || !wheelMesh
      || !headlightMesh || !taillightMesh
    ) return

    let wheelIndex = 0
    let bumperIndex = 0
    let headlightIndex = 0
    let taillightIndex = 0

    for (let index = 0; index < vehicles.length; index += 1) {
      const vehicle = vehicles[index]
      const appearance = vehicle.appearance
      let x = HERO_X
      let z = vehicle.anchorZ
      let facing = -1
      let visible = true

      if (vehicle.kind === 'same-direction') {
        z += Math.sin(time * vehicle.frequency + vehicle.phase) * vehicle.amplitude
      } else if (vehicle.kind === 'passing') {
        const progress = modulo(
          time * (vehicle.speed - runtime.current.speed) + vehicle.phase * PASSING_SPAN,
          PASSING_SPAN,
        )
        z = PASSING_BACK_Z - progress
        x = 10.05
        const routeIndex = routeIndexAtDistance(distance, z)
        visible = supportsHighwayLane(routeIndex, routeLocalZ(routeIndex, distance, z))
      } else if (vehicle.kind === 'oncoming') {
        z = wrapWorldZ(vehicle.phase + distance + time * vehicle.speed)
        x = -3.5
        facing = 1
        const routeIndex = routeIndexAtDistance(distance, z)
        visible = supportsOncoming(routeIndex, routeLocalZ(routeIndex, distance, z))
      } else {
        z = moduleZ(vehicle.moduleIndex, distance) + vehicle.localZ
        x = vehicle.side * 5.62
        facing = vehicle.side === 1 ? -1 : 1
      }

      const yawAngle = facing === -1 ? 0 : Math.PI
      yaw.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yawAngle)
      const authored = quality !== 'low' && authoredReady && visible && z > -145 && z < 40
      position.set(x, 0.07, z)
      const size = authored ? appearance.length / 5.179027 : 0
      scale.set(size, size, size)
      authoredTransforms[index].compose(position, yaw, scale)
      const visibilityScale = visible && !authored ? 1 : HIDDEN_SCALE

      position.set(x, appearance.rideHeight + appearance.bodyHeight * 0.5, z)
      scale.set(
        appearance.width * visibilityScale,
        appearance.bodyHeight * visibilityScale,
        appearance.length * visibilityScale,
      )
      matrix.compose(position, yaw, scale)
      bodyMesh.setMatrixAt(index, matrix)

      const roofY = appearance.rideHeight + appearance.bodyHeight + appearance.cabinHeight + 0.025
      position.set(x, roofY, z + facing * -0.08)
      scale.set(
        appearance.cabinWidth * visibilityScale,
        0.1 * visibilityScale,
        appearance.cabinLength * 0.88 * visibilityScale,
      )
      matrix.compose(position, yaw, scale)
      roofMesh.setMatrixAt(index, matrix)

      const cabinY = appearance.rideHeight + appearance.bodyHeight + appearance.cabinHeight * 0.5
      position.set(x, cabinY, z + facing * -0.08)
      scale.set(
        appearance.cabinWidth * visibilityScale,
        appearance.cabinHeight * visibilityScale,
        appearance.cabinLength * visibilityScale,
      )
      matrix.compose(position, yaw, scale)
      glassMesh.setMatrixAt(index, matrix)

      const wheelAngle = vehicle.kind === 'parked' ? 0 : time * vehicle.speed / WHEEL_RADIUS
      wheelSpin.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, wheelAngle)
      wheelRotation.copy(yaw).multiply(AXLE_ROTATION).multiply(wheelSpin)
      const axleX = appearance.width * 0.51
      const axleZ = appearance.length * 0.31
      const wheelY = appearance.rideHeight + WHEEL_RADIUS
      for (let axle = -1; axle <= 1; axle += 2) {
        for (let side = -1; side <= 1; side += 2) {
          position.set(x + side * axleX, wheelY, z + facing * axle * axleZ)
          scale.set(
            WHEEL_RADIUS * visibilityScale,
            0.18 * visibilityScale,
            WHEEL_RADIUS * visibilityScale,
          )
          matrix.compose(position, wheelRotation, scale)
          wheelMesh.setMatrixAt(wheelIndex, matrix)

          scale.set(
            WHEEL_RADIUS * 0.56 * visibilityScale,
            0.195 * visibilityScale,
            WHEEL_RADIUS * 0.56 * visibilityScale,
          )
          matrix.compose(position, wheelRotation, scale)
          rimMesh?.setMatrixAt(wheelIndex, matrix)
          wheelIndex += 1
        }
      }

      const lightX = appearance.width * 0.3
      const lightY = appearance.rideHeight + appearance.bodyHeight * 0.58
      const frontZ = z + facing * appearance.length * 0.505
      const rearZ = z - facing * appearance.length * 0.505
      const bumperY = appearance.rideHeight + appearance.bodyHeight * 0.2
      for (const bumperZ of [frontZ, rearZ]) {
        position.set(x, bumperY, bumperZ)
        scale.set(
          appearance.width * 0.82 * visibilityScale,
          0.13 * visibilityScale,
          0.09 * visibilityScale,
        )
        matrix.compose(position, yaw, scale)
        bumperMesh?.setMatrixAt(bumperIndex, matrix)
        bumperIndex += 1
      }

      for (let side = -1; side <= 1; side += 2) {
        position.set(x + side * lightX, lightY, frontZ)
        scale.set(0.34 * visibilityScale, 0.15 * visibilityScale, 0.07 * visibilityScale)
        matrix.compose(position, yaw, scale)
        headlightMesh.setMatrixAt(headlightIndex, matrix)
        headlightIndex += 1

        position.z = rearZ
        matrix.compose(position, yaw, scale)
        taillightMesh.setMatrixAt(taillightIndex, matrix)
        const braking = vehicle.kind === 'same-direction'
          && Math.cos(time * vehicle.frequency + vehicle.phase) > 0.86
        taillightMesh.setColorAt(taillightIndex, braking ? TAIL_BRAKE : TAIL_DIM)
        taillightIndex += 1
      }
    }

    bodyMesh.instanceMatrix.needsUpdate = true
    roofMesh.instanceMatrix.needsUpdate = true
    glassMesh.instanceMatrix.needsUpdate = true
    wheelMesh.instanceMatrix.needsUpdate = true
    if (rimMesh) rimMesh.instanceMatrix.needsUpdate = true
    if (bumperMesh) bumperMesh.instanceMatrix.needsUpdate = true
    headlightMesh.instanceMatrix.needsUpdate = true
    taillightMesh.instanceMatrix.needsUpdate = true
    if (taillightMesh.instanceColor) taillightMesh.instanceColor.needsUpdate = true
  }

  useLayoutEffect(() => {
    const bodyMesh = bodyRef.current
    const roofMesh = roofRef.current
    const meshes = [
      bodyMesh,
      roofMesh,
      glassRef.current,
      wheelRef.current,
      rimRef.current,
      bumperRef.current,
      headlightRef.current,
      taillightRef.current,
    ]
    meshes.forEach(setDynamicUsage)
    if (bodyMesh && roofMesh) {
      for (let index = 0; index < vehicles.length; index += 1) {
        bodyMesh.setColorAt(index, vehicles[index].color)
        roofMesh.setColorAt(index, vehicles[index].color)
      }
      if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true
      if (roofMesh.instanceColor) roofMesh.instanceColor.needsUpdate = true
    }
    return () => meshes.forEach(mesh => mesh?.dispose())
  }, [quality, vehicles])

  useFrame(() => {
    updateInstances(runtime.current.distance, runtime.current.time)
  })

  const castShadow = quality !== 'low'
  return (
    <group name="CruiseTraffic" dispose={null}>
      {quality !== 'low' && <AuthoredTraffic transforms={authoredTransforms} colors={authoredColors} night={timeOfDay === 'night' || weather === 'rain'} onReady={setAuthoredReady} />}
      <instancedMesh
        ref={bodyRef}
        args={[assets.bodyGeometry, quality === 'low' ? assets.bodyLow : assets.body, vehicleCount]}
        castShadow={castShadow}
        receiveShadow={castShadow}
        frustumCulled={false}
      />
      <instancedMesh
        ref={roofRef}
        args={[assets.roofGeometry, assets.body, vehicleCount]}
        castShadow={castShadow}
        receiveShadow={castShadow}
        frustumCulled={false}
      />
      <instancedMesh
        ref={glassRef}
        args={[assets.cabinGeometry, assets.glass, vehicleCount]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={wheelRef}
        args={[assets.wheel, assets.tire, vehicleCount * 4]}
        castShadow={castShadow}
        receiveShadow={castShadow}
        frustumCulled={false}
      />
      {quality !== 'low' && <>
        <instancedMesh
          ref={rimRef}
          args={[assets.rim, assets.wheelMetal, vehicleCount * 4]}
          castShadow={castShadow}
          receiveShadow={castShadow}
          frustumCulled={false}
        />
        <instancedMesh
          ref={bumperRef}
          args={[assets.box, assets.bumper, vehicleCount * 2]}
          castShadow={castShadow}
          receiveShadow={castShadow}
          frustumCulled={false}
        />
      </>}
      <instancedMesh
        ref={headlightRef}
        args={[assets.box, assets.headlights, vehicleCount * 2]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={taillightRef}
        args={[assets.box, assets.taillights, vehicleCount * 2]}
        frustumCulled={false}
      />
    </group>
  )
}
