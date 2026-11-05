'use client'
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

type Subscriber = { ref: { current: (...args: unknown[]) => void }; priority: number }
type Profile = { frames: number; renderMs: number; subscribers: { name: string; ms: number }[] }
declare global { interface Window { __frameProfile?: (seconds?: number) => Promise<Profile>; __r3f?: () => unknown } }

/** ?diagnostics=1 only: times every useFrame subscriber and the scene render for N seconds.
 * Subscriber names come from the callback source, so they read like "fillChunk" or "heroCreative". */
export default function FrameProfiler() {
  const get = useThree(state => state.get)
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('diagnostics')) return
    window.__frameProfile = async (seconds = 4) => {
      const state = get(), internal = state.internal as unknown as { subscribers: Subscriber[] }, gl = state.gl
      const totals = new Map<Subscriber, number>(), originals = new Map<Subscriber, Subscriber['ref']['current']>()
      for (const subscriber of internal.subscribers) {
        const original = subscriber.ref.current; originals.set(subscriber, original); totals.set(subscriber, 0)
        subscriber.ref.current = (...args: unknown[]) => { const t = performance.now(); original(...args); totals.set(subscriber, totals.get(subscriber)! + performance.now() - t) }
      }
      const render = gl.render; let renderMs = 0, frames = 0
      gl.render = (...args: Parameters<typeof render>) => { const t = performance.now(); render.apply(gl, args); renderMs += performance.now() - t; frames++ }
      await new Promise(resolve => setTimeout(resolve, seconds * 1000))
      gl.render = render; for (const [subscriber, original] of originals) subscriber.ref.current = original
      const n = Math.max(1, frames)
      const name = (fn: unknown) => String(fn).replace(/\s+/g, ' ').slice(0, 90)
      return { frames, renderMs: +(renderMs / n).toFixed(2), subscribers: [...totals].map(([s, ms]) => ({ name: `${s.priority}|${name(originals.get(s))}`, ms: +(ms / n).toFixed(2) })).sort((a, b) => b.ms - a.ms).slice(0, 15) }
    }
    window.__r3f = get
    return () => { delete window.__frameProfile; delete window.__r3f }
  }, [get])
  return null
}
