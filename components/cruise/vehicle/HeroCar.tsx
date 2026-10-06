'use client'

import { RoundedBox, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type MutableRefObject, useEffect, useMemo, useRef } from 'react'
import {
  Color,
  BufferGeometry,
  DoubleSide,
  Group,
  Material,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { HERO_X } from '@/lib/cruise/constants'
import { getVehicle } from '@/lib/cruise/vehicles'
import ClassicCar from './ClassicCar'
import RetroJeep from './RetroJeep'
import DriverCockpit from './DriverCockpit'
import { useCockpit } from './CockpitContext'
import { routeCurvature } from '@/lib/cruise/routePath'
import type {
  CruiseCamera,
  CruiseDirectorShot,
  CruiseQuality,
  CruiseRuntime,
  CruiseTimeOfDay,
  CruiseWeather,
  CruiseVehicleId,
} from '@/lib/cruise/types'
import { cockpitTextures } from './cockpitTextures'

const COASTAL = getVehicle('coastal-coupe')
const MODEL_URL = COASTAL.model
const CAR_SCALE = COASTAL.scale
const GROUND_OFFSET = COASTAL.groundOffset
const WHEEL_RADIUS = COASTAL.wheels[0].radius
const TAU = Math.PI * 2
const LOCAL_WHEEL_AXIS = new Vector3(0, 0, 1)
const WHEEL_NAMES = ['FL_WHEEL', 'FR_WHEEL', 'RL_WHEEL', 'RR_WHEEL'] as const

export const HERO_CAR_CAMERA_POSES = {
  chase: {
    position: [HERO_X, 2.05, 6.1],
    target: [HERO_X, 0.62, -4.2],
  },
  hood: {
    position: [HERO_X, 1.04, -0.74],
    target: [HERO_X, 0.87, -9],
  },
  driver: {
    position: [HERO_X - 0.36, 1.04, 0.11],
    target: [HERO_X - 0.36, 0.9, -9],
  },
  side: {
    position: [HERO_X - 5.6, 1.42, 0.45],
    target: [HERO_X, 0.78, -1.4],
  },
  lowRear: {
    position: [HERO_X + 0.5, 0.62, 5.25],
    target: [HERO_X, 0.5, -3.8],
  },
} as const satisfies Record<CruiseCamera, {
  position: readonly [number, number, number]
  target: readonly [number, number, number]
}>

export interface HeroCarProps {
  paint?: string
  parked?: boolean
  vehicleId?: CruiseVehicleId
  onReady?: () => void
  runtime: MutableRefObject<CruiseRuntime>
  quality: CruiseQuality
  camera: CruiseCamera | CruiseDirectorShot
  timeOfDay: CruiseTimeOfDay
  weather: CruiseWeather
}

interface CarMaterials {
  paint: MeshPhysicalMaterial
  glass: MeshPhysicalMaterial
  plastic: MeshStandardMaterial
  rubber: MeshStandardMaterial
  metal: MeshStandardMaterial
  rims: MeshStandardMaterial
  lights: MeshStandardMaterial
}

interface PreparedModel {
  geometries: BufferGeometry[]
  taillights: MeshStandardMaterial[]
  body: Object3D
  wheelAssembly: Group
  wheels: Group[]
  wheelBaseQuaternions: Quaternion[]
}

function makeMaterials(): CarMaterials {
  return {
    paint: new MeshPhysicalMaterial({
      color: new Color('#aebbbd'),
      metalness: 0.72,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.065,
      envMapIntensity: 1.5,
    }),
    glass: new MeshPhysicalMaterial({
      color: new Color('#18303b'),
      metalness: 0,
      roughness: 0.105,
      transmission: 0,
      thickness: 0.08,
      ior: 1.47,
      reflectivity: 0.72,
      clearcoat: 0.45,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: DoubleSide,
      envMapIntensity: 1.4,
    }),
    plastic: new MeshStandardMaterial({
      color: new Color('#111718'),
      metalness: 0.04,
      roughness: 0.62,
      envMapIntensity: 0.72,
    }),
    rubber: new MeshStandardMaterial({
      color: new Color('#ffffff'),
      metalness: 0.015,
      roughness: 0.86,
      envMapIntensity: 0.38,
    }),
    metal: new MeshStandardMaterial({
      color: new Color('#c2c5c2'),
      metalness: 0.94,
      roughness: 0.28,
      envMapIntensity: 1.25,
    }),
    rims: new MeshStandardMaterial({
      color: new Color('#d2d5d1'),
      metalness: 0.96,
      roughness: 0.17,
      envMapIntensity: 1.55,
    }),
    lights: new MeshStandardMaterial({
      color: new Color('#fff1c9'),
      emissive: new Color('#ffd9a0'),
      emissiveIntensity: 1.35,
      metalness: 0,
      roughness: 0.18,
    }),
  }
}

function materialFor(
  sourceMaterial: Material | undefined,
  objectName: string,
  materials: CarMaterials,
) {
  switch (sourceMaterial?.name) {
    case 'Body_paint':
      return materials.paint
    case 'Glass':
      return materials.glass
    case 'Black_matte':
      return materials.plastic
    case 'Rims':
      return materials.rims
    case 'Emission.001':
      return materials.lights
    case 'Miscs':
      if (WHEEL_NAMES.some(name => objectName.includes(name))) {
        if (sourceMaterial instanceof MeshStandardMaterial) {
          materials.rubber.map = sourceMaterial.map
          materials.rubber.needsUpdate = true
        }
        return materials.rubber
      }
      if (objectName.includes('Exhaust')) {
        if (sourceMaterial instanceof MeshStandardMaterial) {
          materials.metal.map = sourceMaterial.map
          materials.metal.needsUpdate = true
        }
        return materials.metal
      }
      return sourceMaterial
    default:
      return sourceMaterial ?? materials.plastic
  }
}

function prepareModel(source: Object3D, materials: CarMaterials): PreparedModel {
  const body = source.clone(true)
  const geometries: BufferGeometry[] = []
  const taillights: MeshStandardMaterial[] = []
  const wheelAssembly = new Group()
  wheelAssembly.name = 'HeroCarWheelAssembly'

  body.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    // Preserve panel creases while removing low-angle faceting on painted bodywork.
    // Never mutate the cached GLTF geometry shared with other model instances.
    if (sourceMaterials.every(material => material.name === 'Body_paint')) {
      const clone = object.geometry.clone()
      const smoothed = toCreasedNormals(clone, Math.PI / 6)
      if (smoothed !== clone) clone.dispose()
      object.geometry = smoothed
      geometries.push(smoothed)
    }
    const mappedMaterials = sourceMaterials.map(sourceMaterial => {
      if (sourceMaterial.name === 'Miscs' && object.name.includes('Rear_bumper') && sourceMaterial instanceof MeshStandardMaterial) {
        const lens = sourceMaterial.clone()
        lens.emissive.set(0xff2206)
        lens.emissiveMap = sourceMaterial.map
        lens.emissiveIntensity = 0.5
        // The licensed atlas already isolates red lens pixels. Emission is masked
        // to those pixels, leaving plates, trim and reverse lights unlit.
        lens.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
            #include <emissivemap_fragment>
            float redLens = smoothstep(0.025, 0.09, diffuseColor.r)
              * smoothstep(12.0, 20.0, diffuseColor.r / max(0.008, max(diffuseColor.g, diffuseColor.b)));
            totalEmissiveRadiance *= redLens;
          `)
        }
        lens.customProgramCacheKey = () => 'cruise-red-lens-v1'
        taillights.push(lens)
        return lens
      }
      return materialFor(sourceMaterial, object.name, materials)
    })
    object.material = Array.isArray(object.material) ? mappedMaterials : mappedMaterials[0]
    if (sourceMaterials.some(material => material.name === 'Glass')) object.renderOrder = 2
  })

  const wheels = WHEEL_NAMES.flatMap((name) => {
    const wheel = body.getObjectByName(name)
    if (!(wheel instanceof Group)) return []
    wheel.removeFromParent()
    wheelAssembly.add(wheel)
    return [wheel]
  })

  return {
    geometries,
    taillights,
    body,
    wheelAssembly,
    wheels,
    wheelBaseQuaternions: wheels.map((wheel) => wheel.quaternion.clone()),
  }
}

function Cockpit({ textures, runtime }: { textures: ReturnType<typeof cockpitTextures>; runtime: MutableRefObject<CruiseRuntime> }) {
  const wheel = useRef<Group>(null)
  useFrame(() => { if (wheel.current) wheel.current.rotation.z = MathUtils.clamp(routeCurvature(runtime.current.distance)*18,-.28,.28) })
  const leather = '#927759'
  const leatherDark = '#705943'
  const dash = '#343d3a'
  const trim = '#b8ae97'

  return (
    <group name="BuenaOndaCockpit">
      <RoundedBox args={[1.36, 0.17, 0.3]} position={[0, 0.79, 0.43]} radius={0.045} smoothness={2}>
        <meshStandardMaterial color={dash} roughness={0.9} metalness={0.025} />
      </RoundedBox>
      <mesh position={[0, 0.852, 0.274]}>
        <boxGeometry args={[1.18, 0.008, 0.008]} />
        <meshStandardMaterial color={trim} roughness={0.48} metalness={0.45} />
      </mesh>
      <group position={[-0.47, 0.796, 0.272]}>
        <RoundedBox args={[0.19, 0.057, 0.017]} radius={0.009} smoothness={2}>
          <meshStandardMaterial color="#171e1d" roughness={0.92} />
        </RoundedBox>
        {[-0.017, 0, 0.017].map(y => <mesh key={y} position={[0, y, -0.01]}>
          <boxGeometry args={[0.164, 0.004, 0.014]} />
          <meshStandardMaterial color="#657069" roughness={0.7} />
        </mesh>)}
      </group>
      <RoundedBox args={[0.23, 0.11, 0.18]} position={[0.36, 0.89, 0.31]} radius={0.035} smoothness={2}>
        <meshStandardMaterial color="#111414" roughness={0.7} />
      </RoundedBox>

      {[-0.36, 0.36].map((x) => (
        <group key={x} position-x={x}>
          <RoundedBox args={[0.46, 0.14, 0.5]} position={[0, 0.42, -0.13]} radius={0.055} smoothness={2}>
            <meshStandardMaterial color={leather} roughness={0.58} />
          </RoundedBox>
          <RoundedBox
            args={[0.45, 0.59, 0.13]}
            position={[0, 0.69, -0.37]}
            rotation={[-0.11, 0, 0]}
            radius={0.055}
            smoothness={2}
          >
            <meshStandardMaterial color={leather} roughness={0.6} />
          </RoundedBox>
          <RoundedBox args={[0.31, 0.18, 0.12]} position={[0, 1, -0.41]} radius={0.045} smoothness={2}>
            <meshStandardMaterial color={leatherDark} roughness={0.62} />
          </RoundedBox>
        </group>
      ))}

      <RoundedBox args={[0.2, 0.16, 0.65]} position={[0, 0.48, 0.03]} radius={0.035} smoothness={2}>
        <meshStandardMaterial color={dash} roughness={0.62} />
      </RoundedBox>
      <group position={[0.36, 0.8, 0.2]} rotation={[-0.28, 0, 0]}><group ref={wheel} name="BuenaOndaSteeringWheel">
      <mesh>
        <torusGeometry args={[0.145, 0.022, 10, 32]} />
        <meshStandardMaterial color="#111414" roughness={0.48} metalness={0.16} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.035, 16]} />
        <meshStandardMaterial color={trim} roughness={0.42} metalness={0.58} />
      </mesh>

      <mesh>
        <boxGeometry args={[0.255, 0.023, 0.018]} />
        <meshStandardMaterial color={dash} roughness={0.5} />
      </mesh>
      </group></group>
      <RoundedBox args={[1.45, 0.12, 1.3]} position={[0, 0.32, -0.08]} radius={0.025} smoothness={1}>
        <meshStandardMaterial color={dash} roughness={0.95} />
      </RoundedBox>
      <RoundedBox args={[1.4, 0.48, 0.12]} position={[0, 0.53, 0.51]} radius={0.025} smoothness={1}>
        <meshStandardMaterial color={dash} roughness={0.85} />
      </RoundedBox>
      {[-0.72, 0.72].map(x => <RoundedBox key={x} args={[0.08, 0.38, 1]} position={[x, 0.62, -0.03]} radius={0.025} smoothness={1}>
        <meshStandardMaterial color={leatherDark} roughness={0.7} />
      </RoundedBox>)}
      <mesh position={[0.36, 0.82, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.025, 0.29, 12]} />
        <meshStandardMaterial color="#242829" roughness={0.38} metalness={0.45} />
      </mesh>

      {
        <group>
          <mesh position={[0.36, 0.89, 0.213]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.21, 0.095]} />
            <meshBasicMaterial map={textures.gauges} toneMapped={false} />
          </mesh>
          <mesh position={[0.03, 0.81, 0.267]}>
            <boxGeometry args={[0.12, 0.055, 0.015]} />
            <meshStandardMaterial color="#141e1e" roughness={0.5} />
          </mesh>
          <mesh position={[0.03, 0.81, 0.257]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.112, 0.045]} />
            <meshBasicMaterial map={textures.radio} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.58, 0.05]} rotation={[0.12, 0, 0]}>
            <boxGeometry args={[0.09, 0.075, 0.18]} />
            <meshStandardMaterial color={trim} roughness={0.28} metalness={0.65} />
          </mesh>
        </group>
      }
    </group>
  )
}

export default function HeroCar(props: HeroCarProps) {
  if (props.vehicleId === 'island-trail') return <RetroJeep {...props}/>
  return props.vehicleId === 'classic-coupe' ? <ClassicCar {...props} /> : <CoastalCar {...props} />
}

function CoastalCar({ runtime, quality, camera, timeOfDay, weather, onReady, paint = '#aebbbd', parked = false }: HeroCarProps) {
  const cockpit = useCockpit()
  const { scene } = useGLTF(MODEL_URL)
  const bodyRef = useRef<Group>(null)
  const wheelAngle = useRef(0)
  const wheelRotation = useMemo(() => new Quaternion(), [])
  const materials = useMemo(makeMaterials, [])
  useEffect(() => { materials.paint.color.set(paint) }, [materials, paint])
  const headlightTarget = useMemo(() => {
    const target = new Object3D()
    target.position.set(0, 0.15, 18)
    return target
  }, [])
  const textures = useMemo(cockpitTextures, [])
  const model = useMemo(() => prepareModel(scene, materials), [materials, scene])

  useEffect(() => { onReady?.() }, [model, onReady])

  useEffect(() => {
    const castsShadow = quality !== 'low'
    model.body.traverse((object) => {
      if (!(object instanceof Mesh)) return
      object.castShadow = castsShadow
      object.receiveShadow = castsShadow
    })
    model.wheelAssembly.traverse((object) => {
      if (!(object instanceof Mesh)) return
      object.castShadow = castsShadow
      object.receiveShadow = castsShadow
    })

    materials.paint.envMapIntensity = (quality === 'high' ? 1.58 : 1.2) + (timeOfDay === 'night' ? 0.38 : 0)
    materials.paint.roughness = weather === 'rain' ? 0.12 : 0.18
    materials.paint.clearcoatRoughness = weather === 'rain' ? 0.035 : 0.065
    materials.glass.opacity = camera === 'driver' ? 0.07 : 0.48
    materials.glass.envMapIntensity = timeOfDay === 'night' ? 1.7 : 1.4
    materials.lights.emissiveIntensity = timeOfDay === 'night' ? 3.2 : weather === 'rain' ? 2.2 : 0.7
    const glazing = model.body.getObjectByName('Rear_bumper_4')
    if (glazing) glazing.visible = camera !== 'driver'
  }, [camera, materials, model, quality, timeOfDay, weather])

  useEffect(() => () => {
    Object.values(materials).forEach((material) => material.dispose())
    Object.values(textures).forEach(texture => texture.dispose())
  }, [materials, textures])

  useEffect(() => () => {
    model.geometries.forEach(geometry => geometry.dispose())
    model.taillights.forEach(material => material.dispose())
  }, [model])

  useFrame((_, delta) => {
    const time = runtime.current.time
    const speed = parked ? 0 : Math.max(0, runtime.current.speed)
    wheelAngle.current = MathUtils.euclideanModulo(
      wheelAngle.current + (speed * Math.min(delta, 0.05)) / WHEEL_RADIUS,
      TAU,
    )

    for (let index = 0; index < model.wheels.length; index++) {
      const wheel = model.wheels[index]
      const sideSign = WHEEL_NAMES[index].includes('L_') ? 1 : -1
      wheelRotation.setFromAxisAngle(LOCAL_WHEEL_AXIS, wheelAngle.current * sideSign)
      wheel.quaternion.copy(model.wheelBaseQuaternions[index]).multiply(wheelRotation)
    }

    if (bodyRef.current) {
      const speedWeight = MathUtils.clamp(speed / 18, 0, 1)
      bodyRef.current.position.y = GROUND_OFFSET
        + Math.sin(time * 5.4) * 0.004 * speedWeight
        + Math.sin(time * 11.7) * 0.0015 * speedWeight
      bodyRef.current.rotation.z = Math.sin(time * 3.1) * 0.0015 * speedWeight
    }
    const braking = time % 19 > 16.8
    const lampTarget = braking ? 4.8 : timeOfDay === 'night' ? 3.2 : weather === 'rain' ? 2.2 : 0.7
    for (const lens of model.taillights) lens.emissiveIntensity = MathUtils.lerp(lens.emissiveIntensity, lampTarget * 2, 0.08)
    materials.lights.emissiveIntensity = MathUtils.lerp(materials.lights.emissiveIntensity, cockpit ? (cockpit.lights ? 3.2 : 0) : lampTarget, 0.08)
  })

  const headlightsOn = cockpit ? cockpit.lights : timeOfDay === 'night' || weather === 'rain'

  return (
    <group
      name="HeroCar"
      position={[HERO_X, 0, 0]}
      rotation={[...COASTAL.rotation]}
      scale={CAR_SCALE}
    >
      <group ref={bodyRef} position-y={GROUND_OFFSET}>
        <primitive object={model.body} dispose={null} />
        <Cockpit textures={textures} runtime={runtime} />
        {camera === 'driver' && <group name="WindshieldFrame">
          {[-1, 1].map(side => <RoundedBox key={side} args={[.033, .59, .042]} radius={.009} smoothness={2} position={[side * .675, 1.075, .45]} rotation={[-.65, 0, side * -.17]}><meshStandardMaterial color="#46504b" roughness={.86} /></RoundedBox>)}
          <RoundedBox args={[1.37, .035, .042]} radius={.009} smoothness={2} position={[0, 1.315, .28]}><meshStandardMaterial color="#46504b" roughness={.86} /></RoundedBox>
        </group>}
        <DriverCockpit camera={camera} />
      </group>
      <primitive object={model.wheelAssembly} position-y={GROUND_OFFSET} dispose={null} />
      <group>
        <primitive object={headlightTarget} />
        <spotLight position={[0, 0.64, 2.12]} target={headlightTarget} color="#ffe2ad"
          intensity={headlightsOn ? (timeOfDay === 'night' ? 6 : 3) : 0} distance={38} decay={1.6} angle={0.42} penumbra={0.78} />
      </group>
      {/* Road surface is at world Y=0.04; the old contact layer was buried below it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.044 / CAR_SCALE, 0]}>
        <planeGeometry args={[2.3, 4.7]} />
        <meshBasicMaterial map={textures.shadow} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}
