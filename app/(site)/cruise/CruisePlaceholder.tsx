'use client'

// CruisePlaceholder — generative outrun horizon for the cruise window.
// Renders when a scene has no video yet (or as a standalone "Test Pattern" scene).
// Neon colors are strokes only, never fills, per the Buena Onda design system.
// Parent element must be position: relative. Respects prefers-reduced-motion.

import { useEffect, useRef } from 'react'

type TimeOfDay = 'day' | 'sunset' | 'night'

interface Props {
  timeOfDay: TimeOfDay
}

const PALETTES: Record<
  TimeOfDay,
  {
    sky: [number, string][]
    ground: string
    grid: string
    gridAccent: string | null
    sun: string | null
    stars: boolean
  }
> = {
  day: {
    sky: [
      [0, '#F8F7F3'],
      [0.7, '#CFEFF6'],
      [1, '#08CCFC'],
    ],
    ground: '#F8F7F3',
    grid: '#1A9E9E',
    gridAccent: null,
    sun: '#FFB347',
    stars: false,
  },
  sunset: {
    sky: [
      [0, '#2F2F2D'],
      [0.45, '#C46D63'],
      [0.8, '#E8176A'],
      [1, '#FFB347'],
    ],
    ground: '#2F2F2D',
    grid: '#FF3C8E',
    gridAccent: '#FFB347',
    sun: '#FFB347',
    stars: false,
  },
  night: {
    sky: [
      [0, '#0E0E0D'],
      [1, '#2F2F2D'],
    ],
    ground: '#0E0E0D',
    grid: '#00D4FF',
    gridAccent: '#FF3C8E',
    sun: null,
    stars: true,
  },
}

const SPEED = 0.22 // grid cycles per second
const H_LINES = 14
const V_LINES = 10

export default function CruisePlaceholder({ timeOfDay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const maybeCanvas = canvasRef.current
    if (!maybeCanvas) return
    const maybeCtx = maybeCanvas.getContext('2d')
    if (!maybeCtx) return
    // Rebind as non-null — TS doesn't carry the guards into the closures below
    const canvas: HTMLCanvasElement = maybeCanvas
    const ctx: CanvasRenderingContext2D = maybeCtx

    const pal = PALETTES[timeOfDay]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let w = 0
    let h = 0
    let dpr = 1

    // Deterministic star field (seeded, so it doesn't reshuffle on resize)
    const stars = Array.from({ length: 90 }, (_, i) => {
      const s = Math.sin(i * 127.1) * 43758.5453
      const t = Math.sin(i * 311.7) * 12543.853
      return { x: s - Math.floor(s), y: t - Math.floor(t), p: i % 7 }
    })

    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = parent.clientWidth
      h = parent.clientHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw(timeMs: number) {
      const t = timeMs / 1000
      const horizon = h * 0.46
      const cx = w / 2

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, horizon)
      for (const [stop, color] of pal.sky) sky.addColorStop(stop, color)
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, horizon)

      // Ground
      ctx.fillStyle = pal.ground
      ctx.fillRect(0, horizon, w, h - horizon)

      // Stars (night)
      if (pal.stars) {
        ctx.fillStyle = '#F8F7F3'
        for (const s of stars) {
          const sy = s.y * horizon * 0.92
          const tw = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.8 + s.p))
          ctx.globalAlpha = 0.15 + 0.45 * tw
          ctx.fillRect(s.x * w, sy, s.p === 0 ? 2 : 1, s.p === 0 ? 2 : 1)
        }
        ctx.globalAlpha = 1
      }

      // Sun — stroked circle with stripe lines, clipped above the horizon. No fill.
      if (pal.sun) {
        const r = Math.min(w, h) * 0.21
        const sunY = horizon - r * 0.3
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, w, horizon)
        ctx.clip()
        ctx.strokeStyle = pal.sun
        ctx.lineWidth = 2.5
        ctx.shadowColor = pal.sun
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.arc(cx, sunY, r, 0, Math.PI * 2)
        ctx.stroke()
        // Interior stripes on the lower half
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, sunY, r - 4, 0, Math.PI * 2)
        ctx.clip()
        ctx.lineWidth = 2
        let gap = 6
        for (let y = sunY + r * 0.1; y < sunY + r; y += gap) {
          ctx.beginPath()
          ctx.moveTo(cx - r, y)
          ctx.lineTo(cx + r, y)
          ctx.stroke()
          gap += 3.5
        }
        ctx.restore()
        ctx.restore()
      }

      // Horizon glow line
      ctx.strokeStyle = pal.gridAccent ?? pal.grid
      ctx.lineWidth = 1.5
      ctx.shadowColor = pal.gridAccent ?? pal.grid
      ctx.shadowBlur = 10
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(0, horizon)
      ctx.lineTo(w, horizon)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Vertical grid lines fanning from the vanishing point
      ctx.strokeStyle = pal.grid
      ctx.shadowColor = pal.grid
      ctx.shadowBlur = 6
      for (let i = -V_LINES; i <= V_LINES; i++) {
        if (i === 0) continue
        const topX = cx + i * (w * 0.012)
        const botX = cx + i * (w * 0.11)
        ctx.lineWidth = 1.2
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.moveTo(topX, horizon)
        ctx.lineTo(botX, h)
        ctx.stroke()
      }

      // Horizontal grid lines rolling toward the viewer
      for (let i = 0; i < H_LINES; i++) {
        const phase = (i / H_LINES + t * SPEED) % 1
        const y = horizon + (h - horizon) * Math.pow(phase, 2.6)
        const accent = pal.gridAccent && i % 4 === 0
        ctx.strokeStyle = accent ? pal.gridAccent! : pal.grid
        ctx.shadowColor = accent ? pal.gridAccent! : pal.grid
        ctx.lineWidth = 0.6 + phase * 2.2
        ctx.globalAlpha = 0.25 + phase * 0.75
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    }

    function loop(now: number) {
      draw(now)
      raf = requestAnimationFrame(loop)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      if (reduced) draw(0)
    })
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    if (reduced) {
      draw(0)
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [timeOfDay])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
