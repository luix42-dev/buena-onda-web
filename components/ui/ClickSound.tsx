'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Plays a subtle mechanical-click sound on every internal link click.
 * Uses the Web Audio API so no file download is required.
 */
export default function ClickSound() {
  const pathname   = usePathname()
  const prevPath   = useRef(pathname)
  const ctxRef     = useRef<AudioContext | null>(null)
  const enabledRef = useRef(false)

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

  // Play on route change
  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname
    playClick()
  }, [pathname])

  function playClick() {
    const ctx = ctxRef.current
    if (!ctx) return

    // A short percussive noise burst — like flipping a page
    const bufferSize = ctx.sampleRate * 0.04 // 40 ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data   = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8)
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    // Band-pass filter to make it sound mechanical
    const filter = ctx.createBiquadFilter()
    filter.type            = 'bandpass'
    filter.frequency.value = 1800
    filter.Q.value         = 0.8

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start()
  }

  return null
}
