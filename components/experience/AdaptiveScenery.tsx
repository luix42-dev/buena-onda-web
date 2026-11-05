'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { QualityChoice } from '@/lib/real-miami/quality'
import { nextSceneryDpr, SCENERY_DPR_FLOOR } from '@/lib/experience/resolution'

/** Four-second windows avoid reacting to single frames. Manual choices stay manual.
 * Resolution goes first; once it sits at the floor and the drive is still under 24 fps, the frame is not
 * pixel-bound, so the tier steps down instead (post pass, reflections, rain density). */
export default function AdaptiveScenery({ choice, onDprChange, onTierDrop }: { choice: QualityChoice; onDprChange: (dpr: number) => void; onTierDrop?: () => void }) {
  const { gl, size } = useThree()
  const window = useRef({ seconds: 0, frames: 0, age: 0, slow: 0 })
  const ceiling = Math.min(1.25, Math.max(SCENERY_DPR_FLOOR, devicePixelRatio || 1))
  useEffect(() => {
    window.current = { seconds: 0, frames: 0, age: 0, slow: 0 }
    onDprChange(choice === 'low' ? .75 : ceiling)
  }, [choice, ceiling, onDprChange, size.width, size.height])
  useFrame((_, delta) => {
    // Stalls longer than half a second (tab switches, shader compiles) are not the steady frame rate.
    if (choice !== 'auto' || delta <= 0 || delta > .5) return
    const sample = window.current
    sample.age += delta
    if (sample.age < 12) return
    sample.seconds += delta; sample.frames++
    if (sample.seconds < 4) return
    const fps = sample.frames / sample.seconds, current = gl.getPixelRatio(), next = nextSceneryDpr(current, fps, ceiling)
    if (Math.abs(next - current) > .005) onDprChange(next)
    // Two slow windows at the floor in a row: drop a tier and give the new tier a fresh settling period.
    sample.slow = current <= SCENERY_DPR_FLOOR + .005 && fps < 24 ? sample.slow + 1 : 0
    if (sample.slow >= 2 && onTierDrop) { onTierDrop(); window.current = { seconds: 0, frames: 0, age: 0, slow: 0 }; return }
    sample.seconds = 0; sample.frames = 0
  })
  return null
}
