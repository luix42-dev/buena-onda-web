'use client'
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { QualityChoice } from '@/lib/real-miami/quality'
import { nextSceneryDpr } from '@/lib/experience/resolution'

/** Four-second windows avoid reacting to single frames. Manual choices stay manual. */
export default function AdaptiveScenery({ choice, onDprChange }: { choice: QualityChoice; onDprChange: (dpr: number) => void }) {
  const { gl, size } = useThree()
  const window = useRef({ seconds: 0, frames: 0, age: 0 })
  const ceiling = Math.min(1.25, Math.max(.6, devicePixelRatio || 1))
  useEffect(() => {
    window.current = { seconds: 0, frames: 0, age: 0 }
    onDprChange(choice === 'low' ? .75 : ceiling)
  }, [choice, ceiling, onDprChange, size.width, size.height])
  useFrame((_, delta) => {
    if (choice !== 'auto' || delta <= 0 || delta > .2) return
    const sample = window.current
    sample.age += delta
    if (sample.age < 12) return
    sample.seconds += delta; sample.frames++
    if (sample.seconds < 4) return
    const current = gl.getPixelRatio(), next = nextSceneryDpr(current, sample.frames / sample.seconds, ceiling)
    if (Math.abs(next - current) > .005) onDprChange(next)
    sample.seconds = 0; sample.frames = 0
  })
  return null
}
