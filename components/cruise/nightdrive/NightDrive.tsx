'use client'
import { useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { CruiseRuntime } from '@/lib/cruise/types'
import { CONVERTIBLE_EYE } from '../master/ConvertibleCar'
import { convertibleFov } from '../master/DriveController'
import type { NightState, NightCamera } from './state'
import { stepNight } from './dynamics'
import { roadSample } from './road'

export default function NightDrive({ state, runtime, vehicle, cameraMode, onCamera, director }: {
  state: MutableRefObject<NightState>; runtime: MutableRefObject<CruiseRuntime>
  vehicle: MutableRefObject<Group | null>; cameraMode: NightCamera
  onCamera: (mode: NightCamera) => void; director: boolean
}) {
  const { camera } = useThree()
  const eye = useRef(new Vector3()), target = useRef(new Vector3()), look = useRef(new Vector3())
  const last = useRef(''), shotAt = useRef(0), shot = useRef(0)
  useFrame((_, delta) => {
    const s = state.current, dt = Math.min(delta, .1)
    stepNight(s, dt)
    runtime.current.distance = s.distance; runtime.current.time = s.elapsed
    runtime.current.speed = s.paused ? 0 : s.speed
    const road = roadSample(s.distance, s.seed), yaw = road.yaw
    const cx = s.lateral * Math.cos(yaw), cz = -s.lateral * Math.sin(yaw)
    if (vehicle.current) {
      vehicle.current.position.set(cx, 0, cz)
      // Road dy is height change per forward route unit (-world Z).
      vehicle.current.rotation.set(Math.atan(road.dy / Math.sqrt(1 + road.dx * road.dx)), yaw, 0, 'YXZ')
    }
    if (!director || s.reduced) shotAt.current = s.elapsed
    if (director && !s.reduced && s.elapsed - shotAt.current >= 22 && s.maneuver === 'follow') {
      const sequence: NightCamera[] = s.district === 'neon' ? ['la', 'driver', 'side', 'chase'] : ['la', 'driver', 'aerial', 'chase']
      onCamera(sequence[++shot.current % sequence.length]); shotAt.current = s.elapsed
    }
    const cam = camera as PerspectiveCamera, portrait = cam.aspect < 1, driver = cameraMode === 'driver'
    const fov = driver ? (portrait ? 84 : convertibleFov(cam.aspect)) : portrait ? (cameraMode === 'la' ? 66 : 74) : cameraMode === 'la' ? 60 : cameraMode === 'aerial' ? 50 : 65
    if (Math.abs(cam.fov - fov) > .01) { cam.fov = fov; cam.near = .04; cam.far = 650; cam.updateProjectionMatrix() }
    const p = eye.current, t = target.current
    if (driver) {
      if (portrait) { p.set(.06, 1.3, .32); t.set(.22, .42, -3.6) }
      else {
        p.set(...CONVERTIBLE_EYE)
        const pitch = 7 + 3.5 * MathUtils.clamp((cam.aspect - 1.78) / .38, 0, 1)
        t.set(p.x + .2, p.y - Math.tan(pitch * Math.PI / 180) * (p.z + 3.6), -3.6)
      }
    } else if (cameraMode === 'la') { p.set(.25, 4.2, portrait ? 6 : 6.5); t.set(0, portrait ? .3 : .6, portrait ? -8 : -9) }
    else if (cameraMode === 'side') { p.set(3.4, 1.25, -.6); t.set(0, .95, -2.6) }
    else if (cameraMode === 'low') { p.set(.95, .48, 4.4); t.set(-.1, 1, -7) }
    else if (cameraMode === 'aerial') { p.set(-7.5, 8.5, 11); t.set(1.5, 1.5, -16) }
    else if (cameraMode === 'hood') { p.set(0, 1.28, -1.25); t.set(0, 1.15, -9) }
    else { p.set(.25, portrait ? 4.4 : 3.2, portrait ? 10.5 : 6.6); t.set(-.1, 1.5, -20) }
    for (const point of [p, t]) {
      // Cabin follows exactly the same pose as its radio and windshield.
      if (vehicle.current) point.applyEuler(vehicle.current.rotation)
      point.x += cx; point.z += cz
    }
    if (driver || s.reduced || last.current !== cameraMode) { camera.position.copy(p); look.current.copy(t) }
    else { const blend = 1 - Math.exp(-5 * dt); camera.position.lerp(p, blend); look.current.lerp(t, blend) }
    camera.lookAt(look.current); last.current = cameraMode
  }, -2)
  return null
}
