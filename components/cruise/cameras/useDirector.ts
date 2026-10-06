'use client'

import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { CruiseCamera, CruiseDirectorShot, CruiseRuntime } from '@/lib/cruise/types'
import { allowedShots, chooseDirectorShot, directorShotDuration } from './director'

export function useDirector({ mode, enabled, runtime, onShotChange }: {
  mode: CruiseCamera
  enabled: boolean
  runtime: MutableRefObject<CruiseRuntime>
  onShotChange?: (shot: CruiseDirectorShot) => void
}) {
  const shot = useRef<CruiseDirectorShot>(mode)
  const scheduler = useRef({ remaining: 0, enabled: false, reported: null as CruiseDirectorShot | null })

  useFrame((_, delta) => {
    const state = scheduler.current
    if (enabled) {
      state.remaining -= Math.min(delta, 0.05)
      if (!state.enabled || state.remaining <= 0 || !allowedShots(runtime.current.distance).includes(shot.current)) {
        shot.current = chooseDirectorShot(runtime.current, state.enabled ? shot.current : null)
        state.remaining = directorShotDuration(shot.current, runtime.current)
      }
    } else {
      shot.current = mode
      state.remaining = 0
    }
    state.enabled = enabled
    if (state.reported !== shot.current) {
      state.reported = shot.current
      onShotChange?.(shot.current)
    }
  }, -1)

  return shot
}
