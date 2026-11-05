'use client'

import { useRef, type MutableRefObject, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { HERO_X } from '@/lib/cruise/constants'
import { routeCurvature } from '@/lib/cruise/routePath'
import { createVehicleFeel, stepVehicleFeel } from '@/lib/cruise-os/vehicle-feel'
import type { CruiseRuntime } from '@/lib/cruise/types'

/** Give every car in the original Cruise scene the same sprung body response as the newer routes. */
export default function LegacyDriveFeel({ runtime, reducedMotion, children }: { runtime: MutableRefObject<CruiseRuntime>; reducedMotion: boolean; children: ReactNode }) {
  const pivot = useRef<Group>(null)
  const response = useRef(createVehicleFeel())
  useFrame((_, delta) => {
    const group = pivot.current
    if (!group) return
    const drive = runtime.current
    const body = stepVehicleFeel(response.current, {
      distance: drive.distance,
      speed: drive.speed,
      acceleration: 0,
      curvature: routeCurvature(drive.distance),
      wheel: 0,
      paused: false,
      reduced: reducedMotion,
      focused: false,
    }, delta)
    group.position.y = body.heave
    group.rotation.set(body.pitch, body.yaw, body.roll, 'YXZ')
  })
  return <group ref={pivot} position-x={HERO_X}><group position-x={-HERO_X}>{children}</group></group>
}
