'use client'

import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { HERO_X } from '@/lib/cruise/constants'
import type { CruiseCamera, CruiseDirectorShot, CruiseRuntime, CruiseVehicleId } from '@/lib/cruise/types'
import { getVehicle } from '@/lib/cruise/vehicles'
import { useDirector } from './useDirector'
import { useCockpit } from '../vehicle/CockpitContext'
import { reachBlend } from '@/lib/cruise/armIK'

export default function CameraRig({ mode, tv, cinematic = tv, reducedMotion, runtime, onShotChange, vehicleId = 'coastal-coupe', radioFocused=false }: {
  radioFocused?: boolean
  mode: CruiseCamera; tv: boolean; reducedMotion: boolean; runtime: MutableRefObject<CruiseRuntime>
  cinematic?: boolean; onShotChange?: (shot: CruiseDirectorShot) => void
  vehicleId?: CruiseVehicleId
}) {
  const { camera, size } = useThree()
  const cockpit = useCockpit()
  const vectors = useMemo(() => ({ position: new Vector3(), target: new Vector3(), look: new Vector3(HERO_X, 1, -12) }), [])
  const previous = useRef<CruiseDirectorShot | null>(null)
  const previousVehicle = useRef<CruiseVehicleId | null>(null)
  const previousFocus = useRef(false)
  const shotRef = useDirector({ mode, enabled: cinematic, runtime, onShotChange })
  useFrame((_, delta) => {
    const shot = shotRef.current
    const portrait = size.height > size.width
    const drift = cinematic && !reducedMotion ? Math.sin(runtime.current.time * 0.075) : 0
    let nextFov = portrait ? 61 : 49
    if (shot === 'chase') {
      vectors.position.set(HERO_X + 0.85 + drift * 0.5, portrait ? 2.6 : 1.85, portrait ? 9 : 6.7)
      vectors.target.set(HERO_X - 0.2, 0.9, portrait ? -9 : -8)
    } else if (shot === 'hood') {
      vectors.position.set(HERO_X, 1.05, -1.05)
      vectors.target.set(HERO_X, 1.25, -45)
      nextFov = 64
    } else if (shot === 'driver') {
      vectors.position.set(HERO_X - 0.34, 1.12, 0.27)
      vectors.target.set(HERO_X - 0.20, 0.78, -1.2)
      if (size.height < 500) vectors.target.y = 0.55
      if (portrait) { vectors.position.x = HERO_X - 0.30; vectors.position.y = 1.15; vectors.position.z = 0.25; vectors.target.x = HERO_X + 0.12; vectors.target.y = 0.60 }
      if (cockpit?.command && !reducedMotion) {
        const lean = reachBlend((performance.now() - cockpit.command.started) / 1000)
        vectors.position.x += 0.075 * lean
        vectors.position.z -= 0.035 * lean
        vectors.target.x += 0.12 * lean
        vectors.target.y -= 0.10 * lean
      }
      nextFov = portrait ? 100 : 72
    } else if (shot === 'side') {
      vectors.position.set(HERO_X - (portrait ? 4.8 : 5.6), portrait ? 2.05 : 1.5, portrait ? 7.8 : 1.8)
      vectors.target.set(HERO_X, 0.72, -0.35)
      nextFov = portrait ? 65 : 55
    } else if (shot === 'lowRear') {
      vectors.position.set(HERO_X + 0.45, portrait ? 0.88 : 0.66, portrait ? 8 : 6.1)
      vectors.target.set(HERO_X, 0.7, -3.8)
      nextFov = portrait ? 64 : 51
    } else if (shot === 'rearQuarter') {
      vectors.position.set(HERO_X + (portrait ? 2.5 : 3.5), portrait ? 2.2 : 1.65, portrait ? 8.8 : 6.5)
      vectors.target.set(HERO_X, 0.72, -1.5)
      nextFov = portrait ? 61 : 48
    } else if (shot === 'billboardReveal') {
      vectors.position.set(HERO_X - 0.8, portrait ? 3 : 2.5, portrait ? 11 : 8.5)
      vectors.target.set(HERO_X + 0.6, 1.35, -7)
      nextFov = portrait ? 59 : 50
    } else {
      const skyline = shot === 'skyline'
      vectors.position.set(HERO_X + (skyline ? 1.6 : 0.8) + drift * 0.3, skyline ? 3.4 : 2.8, portrait ? 12 : 10)
      vectors.target.set(HERO_X - 0.15, skyline ? 1.35 : 0.9, -4.5)
      nextFov = portrait ? 58 : 47
    }
    const baseline = getVehicle('coastal-coupe').cameraAnchors
    const anchors = getVehicle(vehicleId).cameraAnchors
    if (shot in anchors) {
      const anchor = anchors[shot as CruiseCamera]
      const base = baseline[shot as CruiseCamera]
      vectors.position.x += anchor.position[0] - base.position[0]
      vectors.position.y += anchor.position[1] - base.position[1]
      vectors.position.z += anchor.position[2] - base.position[2]
      vectors.target.x += anchor.target[0] - base.target[0]
      vectors.target.y += anchor.target[1] - base.target[1]
      vectors.target.z += anchor.target[2] - base.target[2]
    } else {
      // Preserve director composition while clearing the larger classic body.
      vectors.position.y += anchors.chase.position[1] - baseline.chase.position[1]
      vectors.position.z += anchors.chase.position[2] - baseline.chase.position[2]
    }
    if (radioFocused) {
      if (vehicleId==='island-trail') { vectors.position.set(HERO_X-.22,1.45,.35); vectors.target.set(HERO_X+.21,1.13,-.50) }
      else if (vehicleId==='classic-coupe') { vectors.position.set(HERO_X-.12,1.18,.32); vectors.target.set(HERO_X+.17,.93,-.458) }
      else { vectors.position.set(HERO_X-.19,1.08,.43); vectors.target.set(HERO_X+.12,.80,-.25) }
      nextFov=portrait?58:43
    }
    // Enter focus gently; interior/exterior changes otherwise cut through no body panels.
    const interior = shot === 'driver' || shot === 'hood'
    const wasInterior = previous.current === 'driver' || previous.current === 'hood'
    const focusTransition=radioFocused||previousFocus.current
    const cut = previous.current === null || previousVehicle.current !== vehicleId || (!focusTransition && shot !== previous.current && (interior || wasInterior)) || reducedMotion
    const blend = 1 - Math.exp(-Math.min(delta, 0.05) * (radioFocused?5:3.8))
    if (cut) { camera.position.copy(vectors.position); vectors.look.copy(vectors.target) }
    else { camera.position.lerp(vectors.position, blend); vectors.look.lerp(vectors.target, blend) }
    camera.lookAt(vectors.look)
    if ('fov' in camera) {
      const fov = MathUtils.lerp(camera.fov as number, nextFov, cut ? 1 : blend)
      if (Math.abs((camera.fov as number) - fov) > 0.001) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
    }
    previous.current = shot
    previousVehicle.current = vehicleId
    previousFocus.current = radioFocused
  })
  return null
}
