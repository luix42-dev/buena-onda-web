'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

type SoundType = 'pageTurn' | 'typewriter' | 'click'

/**
 * Plays procedurally-generated analog sounds via Web Audio API.
 * - Route changes → page turn (papery swoosh)
 * - Button/link clicks → typewriter strike
 * - Hover on interactive cards → soft mechanical click
 */
export default function ClickSound() {
  const pathname   = usePathname()
  const prevPath   = useRef(pathname)
  const ctxRef     = useRef<AudioContext | null>(null)
  const enabledRef = useRef(false)

  const playSound = useCallback((type: SoundType) => {
    const ctx = ctxRef.current
    if (!ctx) return

    switch (type) {
      case 'pageTurn': {
        // Softer, papery swoosh — filtered noise, longer decay, lower freq
        const len = ctx.sampleRate * 0.08
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const d   = buf.getChannelData(0)
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4)
        }
        const src = ctx.createBufferSource()
        src.buffer = buf
        const filt = ctx.createBiquadFilter()
        filt.type = 'lowpass'
        filt.frequency.value = 800
        filt.Q.value = 0.5
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        src.connect(filt)
        filt.connect(gain)
        gain.connect(ctx.destination)
        src.start()
        break
      }
      case 'typewriter': {
        // Sharp, metallic tick — higher freq, very short
        const len = ctx.sampleRate * 0.02
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const d   = buf.getChannelData(0)
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 12)
        }
        const src = ctx.createBufferSource()
        src.buffer = buf
        const filt = ctx.createBiquadFilter()
        filt.type = 'bandpass'
        filt.frequency.value = 2400
        filt.Q.value = 1.2
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.10, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02)
        src.connect(filt)
        filt.connect(gain)
        gain.connect(ctx.destination)
        src.start()
        break
      }
      case 'click':
      default: {
        // Original mechanical click
        const len = ctx.sampleRate * 0.04
        const buf = ctx.createBuffer(1, len, ctx.sampleRate)
        const d   = buf.getChannelData(0)
        for (let i = 0; i < len; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 8)
        }
        const src = ctx.createBufferSource()
        src.buffer = buf
        const filt = ctx.createBiquadFilter()
        filt.type = 'bandpass'
        filt.frequency.value = 1800
        filt.Q.value = 0.8
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
        src.connect(filt)
        filt.connect(gain)
        gain.connect(ctx.destination)
        src.start()
        break
      }
    }
  }, [])

  // Create audio context on first user gesture
  useEffect(() => {
    const init = () => {
      if (!enabledRef.current) {
        enabledRef.current = true
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }
    }
    window.addEventListener('pointerdown', init, { once: true })
    return () => window.removeEventListener('pointerdown', init)
  }, [])

  // Page turn on route change
  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname
    playSound('pageTurn')
  }, [pathname, playSound])

  // Typewriter on link/button clicks, soft click on card hover
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('a, button')
      if (el) playSound('typewriter')
    }
    const onHover = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('.paper-hover, [class*="group"]')
      if (el) playSound('click')
    }
    document.addEventListener('click', onClick)
    document.addEventListener('mouseenter', onHover, true)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('mouseenter', onHover, true)
    }
  }, [playSound])

  return null
}
