'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils, PerspectiveCamera, Vector3, type Object3D } from 'three'
import type { CruiseRuntime, CruiseVehicleId } from '@/lib/cruise/types'
import { VEHICLES } from '@/lib/cruise/vehicles'

/** steer/glance are normalized touch inputs; speed is the selected cruise speed in m/s. */
export type DriveState = {
  distance: number
  speed: number
  lateral: number
  steer: number
  paused: boolean
  glance: number
}

export type DriveControllerProps = {
  state: MutableRefObject<DriveState>
  runtime: MutableRefObject<CruiseRuntime>
  vehicle: MutableRefObject<Group | null>
  cameraMode: 'chase' | 'driver'
  vehicleId: CruiseVehicleId
  onFinish: () => void
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
    const input = MathUtils.clamp(left || right ? Number(right) - Number(left) : drive.steer, -1, 1)
    steering.current = MathUtils.damp(steering.current, input, 7, dt)
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
    const fov = isDriver ? 62 : 65 // Vertical degrees; horizontal FOV follows canvas aspect.
    if (perspective.fov !== fov) {
      perspective.fov = fov
      perspective.near = .04
      perspective.far = 500
      perspective.updateProjectionMatrix()
    }
    if (isDriver) {
      if (vehicleId === 'island-trail') {
        desiredPosition.current.set(.02, 1.57, .25)
        desiredTarget.current.set(.02, 1.1, -2.7)
      } else {
        const anchor = VEHICLES[vehicleId].cameraAnchors.driver
        desiredPosition.current.fromArray(anchor.position)
        // A small downward look includes the physical console without an extreme lens.
        desiredTarget.current.set(anchor.position[0] + .12, anchor.position[1] - .31, -3.1)
      }
    } else {
      desiredPosition.current.set(.7, 2.8, 4.5)
      desiredTarget.current.set(-.1, 1.05, -9)
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
