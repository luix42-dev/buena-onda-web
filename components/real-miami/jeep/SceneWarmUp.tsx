'use client'
import { useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { renderHold } from '@/lib/cruise/render-hold'

type Phase = 'hold' | 'compile' | 'settle' | 'done'
const HOLD_MAX = 8000, COMPILE_MAX = 20000, TOTAL_MAX = 30000

/** Gets a newly started (or switched) drive running smoothly behind DriveLoading. Starting a drive mounts ~60-90
 * shader programs; drawn as they appear, each first draw waited for its link (16-22 s of main-thread stalls on a
 * laptop's Intel GPU, measured 2026-10-30). Instead:
 * 1. hold (from Start): frames run without drawing (renderHold) until the car and world are mounted and the nearby
 *    City blocks are built (max 8 s after mounting);
 * 2. compile: one compile() for the whole scene, into the target CruiseGlow draws to, so the driver links every
 *    program in parallel (max 20 s);
 * 3. settle: drawing resumes; done after 20 frames in a row under 45 ms (30 s cap overall). */
/** Sits inside the scene's Suspense: true while the drive's world is actually mounted (false while a newly chosen
 * drive is still loading its assets and the boundary shows nothing). */
export function WorldMounted() {
  useLayoutEffect(() => { renderHold.worldMounted = true; return () => { renderHold.worldMounted = false } }, [])
  return null
}

export default function SceneWarmUp({ active, sceneReady, onDone, onProgress }: { active: boolean; sceneReady: boolean; onDone: () => void; onProgress?: (fraction: number) => void }) {
  const { gl, scene, camera } = useThree()
  const run = useRef({ phase: 'done' as Phase, start: 0, phaseStart: 0, frames: 0, smooth: 0, last: 0 })
  const finish = useRef(onDone), report = useRef(onProgress), mounted = useRef(sceneReady); finish.current = onDone; report.current = onProgress; mounted.current = sceneReady
  const log = (...args: unknown[]) => { if (new URLSearchParams(location.search).has('warmlog')) console.info('[warm]', ...args) }
  // Layout effect: on before any frame can draw the newly mounted world (Start also sets it, synchronously).
  useLayoutEffect(() => {
    if (!active) return
    const now = performance.now()
    run.current = { phase: 'hold', start: now, phaseStart: now, frames: 0, smooth: 0, last: 0 }
    renderHold.active = true
    return () => { renderHold.active = false; run.current = { ...run.current, phase: 'done' } }
  }, [active])
  useFrame(() => {
    const r = run.current
    if (!active || r.phase === 'done') return
    const now = performance.now(), elapsed = now - r.start
    let pending = 0, built = 1
    try { const chunks = JSON.parse(document.documentElement.dataset.miamiChunks || '{}'); pending = chunks.pending || 0; built = chunks.built || 1 } catch { /* other drives */ }
    if (r.phase === 'hold') {
      r.frames++
      report.current?.(.1 + .35 * built / (built + pending))
      // The hold starts with Start itself: the car and world mount without drawing, then the blocks build.
      if (!mounted.current || !renderHold.worldMounted) { r.phaseStart = now; r.frames = 0 }
      else if (r.frames >= 3 && (pending === 0 || now - r.phaseStart > HOLD_MAX)) {
        r.phase = 'compile'; r.phaseStart = now
        const previous = gl.getRenderTarget(), before = gl.info.programs?.length ?? 0
        gl.setRenderTarget(renderHold.target)
        // compile() creates every program (no link-status wait: checkShaderErrors is off); our own poll then waits for
        // the driver's parallel links. Not compileAsync: its internal poll throws if the canvas unmounts mid-compile
        // (the listener skipping to the radio).
        gl.compile(scene, camera)
        gl.setRenderTarget(previous)
        const compiled = new Promise<void>(resolve => {
          const poll = () => {
            if (run.current !== r) return resolve()
            const programs = (gl.info.programs ?? []) as { isReady?: () => boolean }[]
            let ready = true
            try { ready = programs.every(program => program.isReady?.() ?? true) } catch { ready = true }
            if (ready) resolve(); else setTimeout(poll, 30)
          }
          poll()
        })
        log('held', Math.round(now - r.start), 'ms; compiling, programs', before, '->', gl.info.programs?.length)
        void Promise.race([compiled, new Promise(resolve => setTimeout(resolve, COMPILE_MAX))]).catch(() => {}).then(() => {
          if (run.current !== r || r.phase !== 'compile') return
          log('compiled in', Math.round(performance.now() - r.phaseStart), 'ms')
          r.phase = 'settle'; r.phaseStart = performance.now(); renderHold.active = false
        })
      }
    } else if (r.phase === 'compile') {
      report.current?.(.45 + .35 * Math.min(1, (now - r.phaseStart) / 6000))
    } else if (r.phase === 'settle') {
      const delta = r.last ? now - r.last : 999; r.last = now
      r.smooth = delta < 45 ? r.smooth + 1 : 0
      report.current?.(.8 + .15 * Math.min(1, r.smooth / 20))
      if (r.smooth >= 20) { r.phase = 'done'; log('done', Math.round(elapsed), 'ms, programs', gl.info.programs?.length); finish.current() }
    }
    if (elapsed > TOTAL_MAX && r.phase !== 'done') { r.phase = 'done'; renderHold.active = false; log('cap', Math.round(elapsed)); finish.current() }
  })
  return null
}
