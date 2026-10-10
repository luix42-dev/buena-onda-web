import * as T from 'three'

/**
 * Cheap procedural canvas textures for the Ocean Drive cockpit. Built once per mount,
 * disposed by the owner. No image downloads, no new dependencies.
 */
export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number], srgb = true) {
  const el = document.createElement('canvas'); el.width = w; el.height = h; draw(el.getContext('2d')!)
  const t = new T.CanvasTexture(el); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...repeat) }
  return t
}

/** Deterministic PRNG so the grain is identical on every load (no flicker between sessions). */
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }

/** Book-matched walnut: base gradient, long wavy grain lines, darker figure bands and pores. */
export const woodTex = () => canvasTex(1024, 256, c => {
  const r = rng(7)
  const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#4a2412'); g.addColorStop(.35, '#6e3a1d'); g.addColorStop(.62, '#7d4523'); g.addColorStop(1, '#3f1f0f')
  c.fillStyle = g; c.fillRect(0, 0, 1024, 256)
  // Broad figure: soft dark bands that wander along the plank.
  for (let i = 0; i < 9; i++) {
    c.strokeStyle = `rgba(40,16,6,${.12 + r() * .14})`; c.lineWidth = 10 + r() * 22
    c.beginPath(); const y0 = r() * 256, f = .003 + r() * .004, a = 8 + r() * 18
    for (let x = -20; x <= 1044; x += 12) c.lineTo(x, y0 + Math.sin(x * f + i) * a)
    c.stroke()
  }
  // Fine grain lines.
  for (let i = 0; i < 140; i++) {
    const light = r() > .7
    c.strokeStyle = light ? `rgba(196,128,72,${.08 + r() * .1})` : `rgba(28,10,4,${.1 + r() * .22})`; c.lineWidth = .6 + r() * 1.6
    c.beginPath(); const y0 = r() * 256, f1 = .004 + r() * .006, f2 = .018 + r() * .02, a1 = 4 + r() * 10, ph = r() * 6
    for (let x = -10; x <= 1034; x += 8) c.lineTo(x, y0 + Math.sin(x * f1 + ph) * a1 + Math.sin(x * f2 + ph * 2) * 2)
    c.stroke()
  }
  // Pores.
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(20,8,2,${.15 + r() * .25})`; c.fillRect(r() * 1024, r() * 256, 1 + r() * 3, 1) }
})

/** Cream tuck-and-roll leather: pleat shading, stitch lines and a fine pebble grain. */
export const leatherTex = () => canvasTex(512, 512, c => {
  const r = rng(11)
  c.fillStyle = '#efe3c9'; c.fillRect(0, 0, 512, 512)
  for (let x = 0; x < 512; x += 64) {
    const g = c.createLinearGradient(x, 0, x + 64, 0)
    g.addColorStop(0, 'rgba(110,80,52,.34)'); g.addColorStop(.16, 'rgba(255,250,240,.18)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(.86, 'rgba(120,90,60,.06)'); g.addColorStop(1, 'rgba(110,80,52,.34)')
    c.fillStyle = g; c.fillRect(x, 0, 64, 512)
    c.strokeStyle = 'rgba(90,66,44,.35)'; c.lineWidth = 1.2; c.setLineDash([5, 4])
    c.beginPath(); c.moveTo(x + 4, 0); c.lineTo(x + 4, 512); c.moveTo(x + 60, 0); c.lineTo(x + 60, 512); c.stroke(); c.setLineDash([])
  }
  for (let i = 0; i < 9000; i++) { const v = r(); c.fillStyle = v > .5 ? `rgba(255,255,255,${(v - .5) * .12})` : `rgba(80,60,40,${v * .1})`; c.fillRect(r() * 512, r() * 512, 2, 2) }
}, [3, 1])

/** Gauge atlas: 2×2 cells of 512px — speed (0,0), rpm (1,0), fuel (0,1), temp (1,1). UV quadrant per gauge. */
export const GAUGE_CELL = { speed: [0, 1], rpm: [1, 1], fuel: [0, 0], temp: [1, 0] } as const // [col, row] in UV space (row 1 = top)
export function gaugeAtlas() {
  return canvasTex(1024, 1024, c => {
    const cells: [keyof typeof GAUGE_CELL, number, number][] = [['speed', 0, 0], ['rpm', 512, 0], ['fuel', 0, 512], ['temp', 512, 512]]
    for (const [kind, ox, oy] of cells) { c.save(); c.translate(ox, oy); drawGauge(c, kind); c.restore() }
  })
}
function drawGauge(c: CanvasRenderingContext2D, kind: keyof typeof GAUGE_CELL) {
  const big = kind === 'speed' || kind === 'rpm'
  // Deep face with a slight radial falloff so it reads as a recessed dial.
  const face = c.createRadialGradient(256, 236, 40, 256, 256, 256); face.addColorStop(0, '#1b1f26'); face.addColorStop(.85, '#0b0d10'); face.addColorStop(1, '#050607')
  c.fillStyle = face; c.beginPath(); c.arc(256, 256, 256, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#3a3f48'; c.lineWidth = 6; c.beginPath(); c.arc(256, 256, 248, 0, Math.PI * 2); c.stroke()
  c.textAlign = 'center'; c.textBaseline = 'middle'
  if (big) {
    const max = kind === 'speed' ? 120 : 8, majors = kind === 'speed' ? 12 : 8, minors = kind === 'speed' ? 2 : 5
    if (kind === 'rpm') { c.strokeStyle = '#d8283f'; c.lineWidth = 20; c.beginPath(); c.arc(256, 256, 214, Math.PI * .75 + Math.PI * 1.5 * (6 / 8), Math.PI * 2.25); c.stroke() }
    for (let i = 0; i <= majors * minors; i++) {
      const a = Math.PI * .75 + (i / (majors * minors)) * Math.PI * 1.5, major = i % minors === 0
      c.strokeStyle = '#f6eedc'; c.lineWidth = major ? 9 : 3.5; const r0 = major ? 188 : 208
      c.beginPath(); c.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); c.lineTo(256 + Math.cos(a) * 234, 256 + Math.sin(a) * 234); c.stroke()
      if (major && (kind === 'rpm' || (i / minors) % 2 === 0)) {
        c.fillStyle = '#fbf4e4'; c.font = `800 ${kind === 'speed' ? 50 : 58}px "Arial Narrow",Helvetica,Arial,sans-serif`
        c.fillText(String(Math.round((i / minors) * (max / majors))), 256 + Math.cos(a) * 146, 256 + Math.sin(a) * 146)
      }
    }
    c.font = '700 30px Helvetica,Arial,sans-serif'; c.fillStyle = '#ffb347'
    c.fillText(kind === 'speed' ? 'MPH' : 'RPM ×1000', 256, 352)
    c.font = '600 20px Helvetica,Arial,sans-serif'; c.fillStyle = '#8d939c'; c.fillText('BUENA ONDA', 256, 398)
  } else {
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI * 1.15 + (i / 4) * Math.PI * .7
      c.strokeStyle = i === 0 && kind === 'fuel' || i === 4 && kind === 'temp' ? '#e8304a' : '#f6eedc'; c.lineWidth = i % 2 ? 7 : 12
      c.beginPath(); c.moveTo(256 + Math.cos(a) * 170, 256 + Math.sin(a) * 170); c.lineTo(256 + Math.cos(a) * 228, 256 + Math.sin(a) * 228); c.stroke()
    }
    c.fillStyle = '#fbf4e4'; c.font = '800 64px Helvetica,Arial,sans-serif'
    const [lo, hi] = kind === 'fuel' ? ['E', 'F'] : ['C', 'H']
    c.fillText(lo, 256 + Math.cos(Math.PI * 1.15) * 112, 256 + Math.sin(Math.PI * 1.15) * 112 + 12)
    c.fillText(hi, 256 + Math.cos(Math.PI * 1.85) * 112, 256 + Math.sin(Math.PI * 1.85) * 112 + 12)
    c.fillStyle = '#ffb347'; c.font = '700 46px Helvetica,Arial,sans-serif'; c.fillText(kind === 'fuel' ? 'FUEL' : 'TEMP', 256, 350)
  }
}

/** Palm badge + hanging string for the air freshener; also used on the horn button. */
export const palmTex = () => canvasTex(128, 384, c => {
  c.strokeStyle = '#f3ead6'; c.lineWidth = 2; c.beginPath(); c.moveTo(64, 0); c.lineTo(64, 196); c.stroke()
  c.translate(0, 192)
  c.fillStyle = '#2bd3a0'; c.strokeStyle = '#2bd3a0'; c.lineCap = 'round'; c.lineWidth = 9
  c.beginPath(); c.moveTo(64, 188); c.quadraticCurveTo(70, 120, 66, 70); c.stroke()
  for (let k = 0; k < 7; k++) { const a = -Math.PI + k * Math.PI / 6; c.beginPath(); c.moveTo(66, 70); c.quadraticCurveTo(66 + Math.cos(a) * 30, 40, 66 + Math.cos(a) * 58, 70 + Math.sin(a) * 26 + 26); c.lineTo(66, 76); c.fill() }
  c.fillStyle = '#ff4f9a'; c.font = '900 20px Arial'; c.textAlign = 'center'; c.fillText('MIAMI', 64, 176)
})
export const badgeTex = () => canvasTex(128, 128, c => {
  const g = c.createRadialGradient(64, 54, 4, 64, 64, 64); g.addColorStop(0, '#2a3566'); g.addColorStop(1, '#141a33'); c.fillStyle = g; c.fillRect(0, 0, 128, 128)
  c.fillStyle = '#2bd3a0'; c.strokeStyle = '#2bd3a0'; c.lineCap = 'round'; c.lineWidth = 6
  c.beginPath(); c.moveTo(64, 112); c.quadraticCurveTo(68, 80, 66, 52); c.stroke()
  for (let k = 0; k < 7; k++) { const a = -Math.PI + k * Math.PI / 6; c.beginPath(); c.moveTo(66, 52); c.quadraticCurveTo(66 + Math.cos(a) * 22, 30, 66 + Math.cos(a) * 40, 52 + Math.sin(a) * 18 + 18); c.lineTo(66, 56); c.fill() }
  c.fillStyle = '#ff4f9a'; c.fillRect(30, 114, 68, 5)
})

/** Soft radial falloff (white → transparent) used by every additive halo, light pool and neon spill. */
export const glowTex = () => canvasTex(128, 128, c => {
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g; c.fillRect(0, 0, 128, 128)
})

/** Headlight pool on the road: a forward fan, brightest just ahead of the bumper, fading with distance. */
export const beamTex = () => canvasTex(256, 512, c => {
  // y = 0 is far end, y = 512 is the bumper.
  const img = c.createImageData(256, 512)
  for (let y = 0; y < 512; y++) for (let x = 0; x < 256; x++) {
    const v = 1 - y / 512 // 0 at bumper → 1 far
    const half = .18 + v * .32 // fan widens with distance
    const dx = Math.abs(x / 255 - .5) / half
    const lateral = Math.max(0, 1 - dx * dx)
    const along = Math.pow(1 - v, 1.3) * Math.min(1, (1 - v) * 9) * (.35 + .65 * Math.min(1, v * 5))
    const a = Math.min(1, lateral * along * 1.3)
    const i = (y * 256 + x) * 4; img.data[i] = 255; img.data[i + 1] = 236; img.data[i + 2] = 196; img.data[i + 3] = a * 255
  }
  c.putImageData(img, 0, 0)
})

/** Analog VU meter face. */
export const vuTex = () => canvasTex(256, 160, c => {
  const g = c.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#fbecc6'); g.addColorStop(1, '#ead29a'); c.fillStyle = g; c.fillRect(0, 0, 256, 160)
  c.strokeStyle = '#2a1d10'; c.lineWidth = 3; c.beginPath(); c.arc(128, 168, 118, Math.PI * 1.22, Math.PI * 1.78); c.stroke()
  c.strokeStyle = '#c2241f'; c.lineWidth = 7; c.beginPath(); c.arc(128, 168, 114, Math.PI * 1.62, Math.PI * 1.78); c.stroke()
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 1.22 + (i / 10) * Math.PI * .56
    c.strokeStyle = i >= 7 ? '#c2241f' : '#2a1d10'; c.lineWidth = i % 5 === 0 ? 3 : 2
    c.beginPath(); c.moveTo(128 + Math.cos(a) * 118, 168 + Math.sin(a) * 118); c.lineTo(128 + Math.cos(a) * (i % 5 === 0 ? 100 : 108), 168 + Math.sin(a) * (i % 5 === 0 ? 100 : 108)); c.stroke()
  }
  c.fillStyle = '#2a1d10'; c.font = '800 30px Helvetica,Arial,sans-serif'; c.textAlign = 'center'; c.fillText('VU', 128, 126)
  c.font = '700 16px Helvetica,Arial,sans-serif'; c.fillText('-20', 42, 70); c.fillStyle = '#c2241f'; c.fillText('+3', 214, 70)
})
