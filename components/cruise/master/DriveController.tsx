'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, PerspectiveCamera, Vector3, type Object3D } from 'three'
import type { CruiseRuntime, CruiseVehicleId } from '@/lib/cruise/types'
import { VEHICLES } from '@/lib/cruise/vehicles'
import { CONVERTIBLE_EYE } from './ConvertibleCar'

/** steer/glance are normalized touch inputs; speed is the selected cruise speed in m/s. */
export type DriveState = {
  distance: number
  speed: number
  lateral: number
  steer: number
  paused: boolean
  glance: number
  /** Smoothed steering (-1..1), written every frame for cockpit wheels. */
  wheel?: number
  /** TV / lean-back mode: the car drives itself with a slow, human weave. */
  autopilot?: boolean
}

export type StreetVehicleId = CruiseVehicleId | 'ocean-convertible'
export type StreetCamera = 'chase' | 'driver' | 'side' | 'low' | 'aerial' | 'hood'

export type DriveControllerProps = {
  state: MutableRefObject<DriveState>
  runtime: MutableRefObject<CruiseRuntime>
  vehicle: MutableRefObject<Group | null>
  cameraMode: StreetCamera
  vehicleId: StreetVehicleId
  onFinish: () => void
}

const DEG = 180 / Math.PI
/** Vertical FOV (degrees) for the convertible cockpit from the canvas aspect ratio. */
export function convertibleFov(aspect: number) {
  const half = MathUtils.clamp(.86 / Math.max(.3, aspect || 1.6), Math.tan(22 / DEG), Math.tan(29 / DEG))
  return 2 * Math.atan(half) * DEG
}

export function streetCenter(distance: number) { return 3 * Math.sin(distance / 95) }

/** Bounded lane driving, not a tire/rigid-body physics simulation. */
export default function DriveController({ state, runtime, vehicle, cameraMode, vehicleId, onFinish }: DriveControllerProps) {
  const { camera } = useThree()
  const keys = useRef(new Set<string>())
  const steering = useRef(0)
  const finished = useRef(false)
  const lastView = useRef('')
  const desiredPosition = useRef(new Vector3())
  const desiredTarget = useRef(new Vector3())
  const cameraTarget = useRef(new Vector3())
  const center = useRef(new Vector3())
  const wheel = useRef<Object3D | null>(null)
  useEffect(() => { wheel.current = null }, [vehicleId])

  useEffect(() => {
    const editable = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('input,textarea,select,[contenteditable="true"]')
    const accepted = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'KeyQ', 'KeyE'])
    const down = (event: KeyboardEvent) => {
      if (!accepted.has(event.code) || editable(event.target) || document.querySelector('[role="dialog"]')) return
      if (event.code === 'Space' && event.target instanceof HTMLElement && event.target.closest('button,a')) return
      event.preventDefault()
      keys.current.add(event.code)
      if (event.code === 'Space' && !event.repeat && state.current.distance < 210) state.current.paused = !state.current.paused
    }
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code) }
    const clear = () => { keys.current.clear(); state.current.steer = 0; state.current.glance = 0 }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [state])

  useFrame((_, elapsed) => {
    // Discard suspended-tab catch-up instead of teleporting the vehicle.
    const dt = Math.min(elapsed, .05)
    const drive = state.current
    const pressed = keys.current
    if (document.querySelector('[role="dialog"]')) { pressed.clear(); drive.steer = 0; drive.glance = 0 }
    const left = pressed.has('ArrowLeft') || pressed.has('KeyA')
    const right = pressed.has('ArrowRight') || pressed.has('KeyD')
    const auto = drive.autopilot && !left && !right && !drive.steer
    const weave = Math.sin(runtime.current.time * .23) * .7 + Math.sin(runtime.current.time * .071) * .5
    const input = auto ? MathUtils.clamp((2 + weave * .6 - drive.lateral) * .7, -.6, .6) : MathUtils.clamp(left || right ? Number(right) - Number(left) : drive.steer, -1, 1)
    steering.current = MathUtils.damp(steering.current, input, auto ? 2.5 : 7, dt)
    drive.wheel = steering.current
    if (!drive.paused) {
      const acceleration = Number(pressed.has('ArrowUp') || pressed.has('KeyW')) - Number(pressed.has('ArrowDown') || pressed.has('KeyS'))
      drive.speed = MathUtils.clamp(drive.speed + acceleration * dt * 2, 0, 8)
      drive.distance = Math.min(210, Math.max(0, drive.distance + drive.speed * dt))
      drive.lateral = MathUtils.clamp(drive.lateral + steering.current * Math.min(drive.speed * .28, 1.6) * dt, -2.3, 2.3)
    }
    if (drive.distance < 209) finished.current = false
    if (drive.distance >= 210 && !finished.current) {
      finished.current = true
      drive.paused = true
      onFinish()
    }
    runtime.current.distance = drive.distance
    runtime.current.time += dt
    runtime.current.speed = drive.paused ? 0 : drive.speed

    const routeYaw = -Math.atan(3 / 95 * Math.cos(drive.distance / 95))
    const yaw = routeYaw - (drive.paused ? 0 : steering.current * .085 * Math.min(1, drive.speed / 2))
    center.current.set(streetCenter(drive.distance) + drive.lateral, 0, -drive.distance)
    if (vehicle.current) {
      vehicle.current.position.copy(center.current)
      vehicle.current.rotation.set(0, yaw, 0)
    }

    const view = `${cameraMode}:${vehicleId}`
    const isDriver = cameraMode === 'driver'
    const perspective = camera as PerspectiveCamera
    // Vertical degrees; horizontal FOV follows canvas aspect. The convertible's cockpit is aspect-aware:
    // it holds a ~80° horizontal view (natural road perspective, head unit in frame) and keeps the
    // vertical FOV between 44° and 58° so phones in landscape are not fish-eyed and portraits stay sane.
    const fov = isDriver
      ? (vehicleId === 'ocean-convertible' ? convertibleFov(perspective.aspect) : 62)
      : cameraMode === 'aerial' ? 50 : cameraMode === 'side' ? 55 : 65
    if (Math.abs(perspective.fov - fov) > .01) {
      perspective.fov = fov
      perspective.near = .04
      perspective.far = 500
      perspective.updateProjectionMatrix()
    }
    if (cameraMode === 'side') { desiredPosition.current.set(3.4, 1.25, -.6); desiredTarget.current.set(0, .95, -2.6) }
    else if (cameraMode === 'low') { desiredPosition.current.set(.95, .48, 4.4); desiredTarget.current.set(-.1, 1.0, -7) }
    else if (cameraMode === 'aerial') { desiredPosition.current.set(-7.5, 8.5, 11); desiredTarget.current.set(1.5, 1.5, -16) }
    else if (cameraMode === 'hood') { desiredPosition.current.set(0, 1.28, -1.25); desiredTarget.current.set(0, 1.15, -9) }
    else if (isDriver) {
      if (vehicleId === 'ocean-convertible') {
        desiredPosition.current.set(...CONVERTIBLE_EYE)
        // ~3° towards the centre stack; 7° down at 16:9, up to 10.5° on wider phones so the head unit
        // stays in the lower-right third above the touch HUD while the road reaches the horizon.
        const pitch = 7 + 3.5 * MathUtils.clamp((perspective.aspect - 1.78) / .38, 0, 1)
        desiredTarget.current.set(CONVERTIBLE_EYE[0] + .2, CONVERTIBLE_EYE[1] - Math.tan(pitch / DEG) * (CONVERTIBLE_EYE[2] + 3.6), -3.6)
      } else if (vehicleId === 'island-trail') {
        desiredPosition.current.set(.02, 1.57, .25)
        desiredTarget.current.set(.02, 1.1, -2.7)
      } else {
        const anchor = VEHICLES[vehicleId as CruiseVehicleId].cameraAnchors.driver
        desiredPosition.current.fromArray(anchor.position)
        // A small downward look includes the physical console without an extreme lens.
        desiredTarget.current.set(anchor.position[0] + .12, anchor.position[1] - .31, -3.1)
      }
    } else {
      // Higher, further back: the car sits low in frame and the street reads like the reference.
      desiredPosition.current.set(.25, 3.2, 6.6)
      desiredTarget.current.set(-.15, 1.7, -16)
    }
    // Q/E or touch glance moves only the view. Releasing returns to forward immediately.
    const glance = MathUtils.clamp(pressed.has('KeyQ') || pressed.has('KeyE') ? Number(pressed.has('KeyQ')) - Number(pressed.has('KeyE')) : drive.glance, -1, 1)
    const relative = desiredTarget.current.sub(desiredPosition.current)
    const angle = glance * .24
    const gx = relative.x * Math.cos(angle) + relative.z * Math.sin(angle)
    const gz = -relative.x * Math.sin(angle) + relative.z * Math.cos(angle)
    relative.set(gx, relative.y, gz).add(desiredPosition.current)
    for (const point of [desiredPosition.current, desiredTarget.current]) {
      const x = point.x * Math.cos(yaw) + point.z * Math.sin(yaw)
      const z = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw)
      point.set(x + center.current.x, point.y, z + center.current.z)
    }
    if (isDriver || lastView.current !== view) {
      // No position lag inside the cabin: lag causes dashboard/pillar clipping.
      camera.position.copy(desiredPosition.current)
      cameraTarget.current.copy(desiredTarget.current)
    } else {
      camera.position.lerp(desiredPosition.current, 1 - Math.exp(-9 * dt))
      cameraTarget.current.copy(desiredTarget.current)
    }
    camera.lookAt(cameraTarget.current)
    lastView.current = view
  }, -1)

  // HeroCar updates its stock wheel from the original route. Apply actual player
  // steering afterwards, keeping the stock vehicle implementation untouched.
  useFrame(() => {
    if (vehicleId !== 'island-trail' || !vehicle.current) return
    if (!wheel.current) wheel.current = vehicle.current.getObjectByName('IslandSteeringWheel') || null
    if (wheel.current) wheel.current.rotation.z = -steering.current * .48
  })

  return null
}
