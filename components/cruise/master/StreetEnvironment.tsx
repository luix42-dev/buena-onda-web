'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { SKY } from './StreetSky'
import { pulse, BANDS } from './pulse'
import { SEED_PLOTS, dollars, priceCents, type Plot, type AvenuePhase } from './plots'

export const streetX = (s: number) => 3 * Math.sin(s / 95)
const yawAt = (s: number) => -Math.atan(3 / 95 * Math.cos(s / 95))
type Time = 'day' | 'sunset' | 'night'
type Props = { timeOfDay: Time; onAdClick?: (id: string) => void; onPlotClick?: (n: number) => void; plots?: Plot[]; avenue?: AvenuePhase; drive?: MutableRefObject<{ distance: number }>; high?: boolean }

/** Shops on the right (+x), ocean on the left (-x), matching the reference frames. Flip to -1 to mirror. */
const D = 1
const B = -D
const PALETTE = ['#7fd3c8', '#f5a9b5', '#f4e4c6', '#a9d4ec', '#f8c999', '#c4e5c9', '#e7b9da']
const TEAL = '#45c7bd', PINK = '#f7b4bf', NEON_PINK = '#ff4f9a', NEON_TEAL = '#38f0dc'
const DISPLAY = '"Arial Black","Archivo Black","Helvetica Neue",Helvetica,Arial,sans-serif'
const SITES = [22, 46, 70, 95, 124, 155, 181, 207]
const BUENA = 3, BRANCHES = 5

// ---------- Canvas artwork --------------------------------------------------

type Ctx = CanvasRenderingContext2D
function canvasTexture(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  const c = canvas.getContext('2d')!; draw(c, w, h)
  const t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true
  return t
}
function fit(c: Ctx, text: string, size: number, maxWidth: number, weight = 900, family = DISPLAY) {
  c.font = `${weight} ${size}px ${family}`; const w = c.measureText(text).width
  if (w > maxWidth) c.font = `${weight} ${Math.floor(size * maxWidth / w)}px ${family}`
}
function label(c: Ctx, text: string, x: number, y: number, size: number, maxWidth: number, fill: string, opts: { stroke?: string; glow?: string; weight?: number; family?: string; spacing?: number } = {}) {
  c.save(); fit(c, text, size, maxWidth, opts.weight, opts.family)
  if (opts.spacing) (c as Ctx & { letterSpacing?: string }).letterSpacing = `${opts.spacing}px`
  c.textAlign = 'center'; c.textBaseline = 'middle'
  if (opts.glow) { c.shadowColor = opts.glow; c.shadowBlur = size * .35 }
  if (opts.stroke) { c.lineJoin = 'round'; c.lineWidth = size * .09; c.strokeStyle = opts.stroke; c.strokeText(text, x, y) }
  c.fillStyle = fill; c.fillText(text, x, y); c.restore()
}
function vinyl(c: Ctx, x: number, y: number, r: number, labelColor: string) {
  c.save(); c.fillStyle = '#121216'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill()
  c.strokeStyle = 'rgba(255,255,255,.09)'; c.lineWidth = Math.max(1, r * .012)
  for (let g = r * .42; g < r * .97; g += r * .045) { c.beginPath(); c.arc(x, y, g, 0, Math.PI * 2); c.stroke() }
  const sheen = c.createLinearGradient(x - r, y - r, x + r, y + r)
  sheen.addColorStop(.35, 'rgba(255,255,255,0)'); sheen.addColorStop(.5, 'rgba(255,255,255,.16)'); sheen.addColorStop(.65, 'rgba(255,255,255,0)')
  c.fillStyle = sheen; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill()
  c.fillStyle = labelColor; c.beginPath(); c.arc(x, y, r * .34, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#121216'; c.beginPath(); c.arc(x, y, r * .04, 0, Math.PI * 2); c.fill(); c.restore()
}
function palm(c: Ctx, x: number, y: number, s: number, color: string, lean = .25) {
  c.save(); c.fillStyle = color; c.strokeStyle = color; c.lineCap = 'round'
  const topX = x + lean * s, topY = y - s
  c.lineWidth = s * .055; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * s * .2, y - s * .5, topX, topY); c.stroke()
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI + k * (Math.PI / 6) + (k % 2 ? .12 : -.1), len = s * (.42 + (k % 3) * .06)
    const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * .55 + len * .28
    c.beginPath(); c.moveTo(topX, topY); c.quadraticCurveTo((topX + ex) / 2, Math.min(topY, ey) - len * .2, ex, ey)
    c.quadraticCurveTo((topX + ex) / 2, Math.min(topY, ey) - len * .05, topX, topY); c.fill()
  }
  c.restore()
}
function sunsetGradient(c: Ctx, x: number, y: number, w: number, h: number) {
  const g = c.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#5b3a9a'); g.addColorStop(.45, '#ff5f8f'); g.addColorStop(.8, '#ff9a5a'); g.addColorStop(1, '#ffc46b')
  c.fillStyle = g; c.fillRect(x, y, w, h)
}
function frame(c: Ctx, w: number, h: number, color: string, inset = 18) {
  c.strokeStyle = color; c.lineWidth = 8; c.strokeRect(inset, inset, w - inset * 2, h - inset * 2)
}

const ART = {
  billboard: () => canvasTexture(1600, 760, (c, w, h) => {
    const split = 700; sunsetGradient(c, 0, 0, split, h)
    c.fillStyle = '#ffd27a'; c.globalAlpha = .9; c.beginPath(); c.arc(split * .5, h * .78, 150, Math.PI, 0); c.fill(); c.globalAlpha = 1
    for (let k = 0; k < 5; k++) { c.fillStyle = '#ff6f8e'; c.fillRect(split * .5 - 160, h * .78 - 30 - k * 26, 320, 8 + k * 1.5) }
    vinyl(c, split * .52, h * .42, 230, '#ff8a5b')
    palm(c, 70, h, 360, '#2a1840', .35); palm(c, split - 40, h, 300, '#2a1840', -.3); palm(c, split - 130, h, 210, '#2a1840', .2)
    c.fillStyle = '#41c5b8'; c.fillRect(split, 0, w - split, h)
    const cx = split + (w - split) / 2
    label(c, 'YOUR', cx, 180, 190, 820, '#1b2340'); label(c, 'BRAND', cx, 360, 190, 820, '#1b2340'); label(c, 'HERE', cx, 540, 190, 820, '#1b2340')
    c.fillStyle = '#1b2340'; c.fillRect(cx - 150, 640, 300, 64)
    label(c, 'SPONSORED', cx, 673, 38, 270, '#41c5b8', { spacing: 6 })
  }),
  radioBillboard: () => canvasTexture(1600, 760, (c, w, h) => {
    const split = 700; sunsetGradient(c, 0, 0, split, h)
    c.fillStyle = '#ffd27a'; c.globalAlpha = .9; c.beginPath(); c.arc(split * .5, h * .78, 150, Math.PI, 0); c.fill(); c.globalAlpha = 1
    vinyl(c, split * .52, h * .42, 230, '#ff8a5b')
    palm(c, 70, h, 360, '#2a1840', .35); palm(c, split - 40, h, 300, '#2a1840', -.3)
    c.fillStyle = '#41c5b8'; c.fillRect(split, 0, w - split, h)
    const cx = split + (w - split) / 2
    label(c, 'TUNE IN', cx, 170, 130, 800, '#1b2340')
    label(c, 'BUENA ONDA', cx, 330, 150, 820, '#1b2340'); label(c, 'RADIO', cx, 480, 150, 820, '#1b2340')
    label(c, 'CH1 · CH2 · CH3 · CH4 · ON YOUR DASH', cx, 640, 40, 820, '#1b2340', { weight: 700, spacing: 4 })
  }),
  buenaSign: () => canvasTexture(1600, 760, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2fb3aa'); g.addColorStop(1, '#1b7f86'); c.fillStyle = g; c.fillRect(0, 0, w, h)
    vinyl(c, 300, h / 2, 230, '#ff8a5b'); frame(c, w, h, '#fff2d6')
    label(c, 'BUENA ONDA', 1010, 250, 170, 1020, '#fff4dc', { stroke: '#174a52' })
    label(c, 'RECORD STORE', 1010, 420, 120, 980, '#ffd27a', { stroke: '#174a52' })
    label(c, 'VINYL · TAPES · GOOD VIBES', 1010, 570, 54, 960, '#e6fffb', { weight: 700, spacing: 4 })
    label(c, '0.3 MI AHEAD · ON YOUR RIGHT', 1010, 670, 34, 900, '#bff3ec', { weight: 700, spacing: 6 })
  }),
  branchesSign: () => canvasTexture(1600, 760, (c, w, h) => {
    c.fillStyle = '#f7b2bb'; c.fillRect(0, 0, w, h); frame(c, w, h, '#fff4ea')
    palm(c, 230, h - 40, 520, '#e4576c', .2)
    label(c, 'BRANCHES', 960, 250, 200, 1080, '#d9405b', { stroke: '#fff4ea' })
    label(c, 'VINTAGE', 960, 440, 170, 1000, '#d9405b', { stroke: '#fff4ea' })
    label(c, 'GOOD CLOTHES · BRIGHTER DAYS', 960, 590, 52, 1000, '#7a2638', { weight: 700, spacing: 4 })
    label(c, 'ON YOUR RIGHT · OCEAN DRIVE', 960, 680, 34, 900, '#9a3a4c', { weight: 700, spacing: 6 })
  }),
  buenaParapet: () => canvasTexture(2048, 360, (c, w, h) => {
    c.fillStyle = '#2aa79f'; c.fillRect(0, 0, w, h)
    label(c, 'BUENA ONDA', w / 2, h * .44, 230, w * .86, '#fff6e2', { stroke: '#165a5e', glow: 'rgba(255,240,210,.6)' })
    label(c, 'RECORD STORE', w / 2, h * .85, 64, w * .6, '#ffe2a8', { weight: 800, spacing: 18 })
  }),
  branchesParapet: () => canvasTexture(2048, 360, (c, w, h) => {
    c.fillStyle = '#fbe8de'; c.fillRect(0, 0, w, h)
    label(c, 'BRANCHES VINTAGE', w / 2, h * .5, 220, w * .92, '#d63f5c', { stroke: '#8f2238' })
  }),
  blade: (lines: string[], bg: string, fg: string, icon: 'palm' | 'vinyl') => canvasTexture(320, 1280, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff4ea'; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28)
    if (icon === 'palm') palm(c, w / 2 - 20, 300, 230, fg, .15); else vinyl(c, w / 2, 170, 115, '#ff8a5b')
    const letters = lines.join(' ').split(''); const step = (h - 380) / letters.length
    letters.forEach((ch, i) => label(c, ch, w / 2, 350 + step * (i + .5), Math.min(150, step * .95), w * .8, fg, { stroke: bg === '#f7b2bb' ? '#fff4ea' : '#174a52' }))
  }),
  banner: () => canvasTexture(2048, 280, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#6b2f9a'); g.addColorStop(.5, '#ff4f9a'); g.addColorStop(1, '#6b2f9a')
    c.fillStyle = g; c.fillRect(0, 0, w, h)
    palm(c, 120, h, 260, '#2a1033', .3); palm(c, w - 130, h, 260, '#2a1033', -.3)
    label(c, 'VICE NIGHTS · FRIDAY', w / 2, h * .54, 170, w * .74, '#fff2fb', { glow: '#ffb3e1', stroke: '#5a1b5e' })
  }),
  board: (title: string, subtitle: string, bg: string, fg = '#fff3d5') => canvasTexture(1536, 448, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h); frame(c, w, h, '#f2e3bc')
    label(c, title, w / 2, h * .42, 150, w * .88, fg, { family: 'Georgia,serif', weight: 700 })
    label(c, subtitle, w / 2, h * .78, 46, w * .85, fg, { weight: 700, spacing: 6 })
  }),
  chalk: () => canvasTexture(512, 640, (c, w, h) => {
    c.fillStyle = '#26302d'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b48a5a'; c.lineWidth = 26; c.strokeRect(0, 0, w, h)
    label(c, 'GOOD', w / 2, 170, 96, w * .8, '#f3eee0', { family: 'Georgia,serif', weight: 700 })
    label(c, 'CLOTHES', w / 2, 270, 96, w * .8, '#f3eee0', { family: 'Georgia,serif', weight: 700 })
    label(c, 'BRIGHTER', w / 2, 390, 84, w * .8, '#ffb3c1', { family: 'Georgia,serif', weight: 700 })
    label(c, 'DAYS', w / 2, 480, 84, w * .8, '#ffb3c1', { family: 'Georgia,serif', weight: 700 })
    palm(c, w / 2, 610, 90, '#9fe0c9', .1)
  }),
}

function useArt(make: () => T.Texture, deps: unknown[] = []) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps); useEffect(() => () => t.dispose(), [t]); return t
}

// ---------- Architecture ----------------------------------------------------

type Batch = { key: string; geometry: T.BufferGeometry }
function Architecture({ timeOfDay }: { timeOfDay: Time }) {
  const plaster = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!; const data = ctx.createImageData(128, 128)
    for (let i = 0; i < data.data.length; i += 4) { const v = 118 + ((i * 16807 % 101) / 101) * 30; data.data[i] = data.data[i + 1] = data.data[i + 2] = v; data.data[i + 3] = 255 }
    ctx.putImageData(data, 0, 0); const t = new T.CanvasTexture(canvas); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(8, 8); return t
  }, [])
  useEffect(() => () => plaster.dispose(), [plaster])
  const batches = useMemo<Batch[]>(() => {
    const groups = new Map<string, T.BufferGeometry[]>()
    const push = (key: string, g: T.BufferGeometry) => { const list = groups.get(key) ?? []; list.push(g); groups.set(key, list) }
    const add = (key: string, pos: [number, number, number], size: [number, number, number], yaw = 0) => {
      const g = new T.BoxGeometry(...size); g.rotateY(yaw); g.translate(...pos); push(key, g)
    }
    SITES.forEach((s, i) => {
      // fx(a): a metres from the building centre toward the road. Works for either street side.
      const c = streetX(s) + D * (17 + (i === 2 ? 3 : 0)); const fx = (a: number) => c - D * a
      const z = -s; const hero = i === BUENA || i === BRANCHES
      const h = hero ? 9 : 9 + (i % 3) * 2
      const color = i === BUENA ? TEAL : i === BRANCHES ? PINK : PALETTE[(i + 2) % PALETTE.length]
      const trim = i === BRANCHES ? '#fff1e6' : '#f4ead2'
      add(color, [fx(-1), h / 2, z], [10, h, 20]); if (i === 2) add('#e7cdbd', [fx(7.3), .06, z], [3.1, .12, 20])
      add('#efe2c8', [fx(4.25), .38, z], [2.8, .55, 21])
      add('#344b49', [fx(4.1), 1.9, z], [.15, 3, 18.8])
      add('#ad7953', [fx(5.1), .67, z], [2, .15, 19])
      add('#343f37', [fx(4.9), 3.33, z], [1.95, .09, 19])
      add('#5b6758', [fx(4.9), .72, z], [1.85, .025, 18.7])
      add('#746b5b', [fx(5.72), .46, z], [.08, .15, 20.6])
      for (let k = -8; k <= 8; k += 4) {
        add(trim, [fx(5.7), 2, z + k], [.36, 3.6, .24])
        add('#b4c6c0', [fx(5.76), 3.5, z + k + 1.85], [.12, .12, 3.65])
        add('#897660', [fx(5.6), .75, z + k + 1.8], [.17, .12, 3.6])
        add('glass', [fx(5.72), 2.07, z + k + 1.83], [.025, 2.46, 3.46])
        add('#738982', [fx(5.75), 2.08, z + k + 2.5], [.03, 2.46, .035])
        add('light', [fx(5), 3.2, z + k + 1.8], [.4, .06, 2])
        if (i === BUENA) {
          add('#895b3d', [fx(4.95), 1.13, z + k + 1.8], [1, .85, 2.7])
          for (let r = 0; r < 8; r++) add(PALETTE[r % PALETTE.length], [fx(5.05), 1.7, z + k + .62 + r * .32], [.55, .62, .07], .12 * D)
          // Posters on the back wall read as a record shop from the street.
          for (let r = 0; r < 3; r++) add(['#ff8a5b', '#ffd27a', '#ff5f8f'][r], [fx(4.2), 2.45, z + k + 1 + r * .8], [.03, .9, .62])
        } else if (i === BRANCHES) {
          add('#b8a27f', [fx(4.85), 2.65, z + k + 1.8], [.08, .08, 2.7])
          for (let r = 0; r < 4; r++) {
            const zz = z + k + .8 + r * .65; const cloth = ['#f8c999', '#a9d4ec', '#ff7d92', '#f4e4c6'][r]
            add(cloth, [fx(4.9), 2.02, zz], [.24, 1.06, .43]); add(cloth, [fx(4.9), 2.34, zz], [.25, .3, .75])
            add('#b8a27f', [fx(4.9), 2.6, zz], [.04, .14, .08])
          }
        } else add('#9f8a67', [fx(4.9), 1.5, z + k + 1.7], [.4, 1.6, 1.25])
      }
      add('#272f2b', [fx(5.75), 1.95, z], [.12, 2.6, 1.3]); add('#d8bc7b', [fx(5.86), 1.8, z + .4], [.12, .5, .04])
      add(trim, [fx(4.9), 3.85, z], [3.3, .3, 21.3])
      add(color, [fx(6.3), 3.57, z], [.2, .3, 21.3])
      for (let tier = 0; tier < 3; tier++) add(trim, [fx(0), h - .4 + tier * .24, z], [12 + tier * .15, .12, 21 + tier * .2])
      add(color, [fx(3.1), h + .7, z], [4, 1.2, 8]); add(trim, [fx(3.1), h + 1.36, z], [4.3, .14, 8.3])
      for (let y = 5.3; y < h - .6; y += 2.6) {
        if (hero && y > 6.4) continue // parapet sign lives here
        for (let k = -7; k <= 7; k += 3.5) {
          add('window', [fx(4.02), y, z + k], [.12, 1.45, 2.3])
          add(trim, [fx(4.2), y + .86, z + k], [.48, .12, 2.65])
          add(trim, [fx(4.1), y, z + k], [.2, 1.45, .06])
          add(trim, [fx(4.2), y - .79, z + k], [.42, .14, 2.6])
        }
      }
      for (let k = 0; k < 4; k++) add(trim, [fx(4.18), h / 2 + 1.4, z - 9.4 + k * .22], [.12, h - 3.3, .07])
      for (let y = 4.4; y < h; y += 1.3) add(trim, [fx(0), y, z + 10.03], [10.4, .08, .13])
      if (hero) {
        // Deco tower on the approach corner, neon on the canopy edge and around the parapet sign.
        const zt = z + 6.5, neon = i === BUENA ? `neon:${NEON_TEAL}` : `neon:${NEON_PINK}`
        add(color, [fx(2.5), h + 1.9, zt], [5, 3.8, 4.4]); add(trim, [fx(2.5), h + 3.9, zt], [5.4, .22, 4.8])
        add(color, [fx(2.5), h + 4.7, zt], [3.4, 1.4, 3]); add(trim, [fx(2.5), h + 5.5, zt], [3.7, .18, 3.3])
        for (const f of [-1.95, 1.95]) add(trim, [fx(5.06), h + 1.9, zt + f], [.12, 3.4, .16])
        add(neon, [fx(6.42), 3.34, z], [.06, .07, 21.2]); add(neon, [fx(6.42), 3.8, z], [.06, .05, 21.2])
        add(neon, [fx(4.1), 8.68, z], [.05, .06, 15.2]); add(neon, [fx(4.1), 6.02, z], [.05, .06, 15.2])
      }
    })
    // Road furniture: curbs, sidewalks, double yellow centre line and edge lines.
    for (let s = 5; s < 224; s += 2) {
      const x = streetX(s); const yaw = yawAt(s)
      for (const side of [-1, 1]) {
        add('#d9cbb6', [x + side * 6.2, .15, -s], [.35, .3, 2.03], yaw)
        add(side === D ? '#e6d2c0' : '#ece0cb', [x + side * 8.2, .05, -s], [3.65, .1, 2.03], yaw)
        if (side === D) add('#dcc6b3', [x + side * 10.7, .06, -s], [1.4, .1, 2.03], yaw)
        add('#f3ead6', [x + side * 5.75, .023, -s], [.12, .018, 2.03], yaw)
        add('#f0b23a', [x + side * .14, .025, -s], [.1, .018, 2.03], yaw)
      }
    }
    for (let s = 16; s < 220; s += 27) for (const side of [-1, 1]) {
      const x = streetX(s) + side * 8.9
      if (!isOpenSightline(s, side)) {
        add('#2f4744', [x, 3.5, -s], [.14, 7, .14]); add('#2f4744', [x - side * .65, 6.9, -s], [1.4, .14, .14])
        add('light', [x - side * 1.25, 6.8, -s], [.65, .12, .42]); add('#d9cbb6', [x, .25, -s], [.6, .5, .6])
      }
      if (side === B) { add('#b9936a', [x + B * 3, .52, -s - 4], [.6, .15, 2.3]); add('#2f4744', [x + B * 3, .26, -s - 4.8], [.5, .45, .08]); add('#2f4744', [x + B * 3, .26, -s - 3.2], [.5, .45, .08]); add('#2f4744', [x + B * 3.32, .9, -s - 4], [.06, .75, 2.3]) }
    }
    // Lifeguard tower on the beach.
    { const s = 58, x = streetX(s) + B * 27
      for (const dx of [-.8, .8]) for (const dz of [-.8, .8]) add('#f3ead6', [x + dx, 1, -s + dz], [.15, 2, .15])
      add('#ffd27a', [x, 2.6, -s], [2.4, 1.4, 2.2]); add('#ff6f8e', [x, 3.45, -s], [2.8, .25, 2.6]); add('#45c7bd', [x, 1.55, -s], [2.6, .12, 2.4]) }
    for (let s = 9; s < 225; s += 11.3) for (let i = 0; i < 5; i++) {
      const color = i % 2 ? '#5f8048' : '#476b45'; const g = new T.SphereGeometry(.65 + (i % 3) * .18, 7, 5)
      g.scale(1.15, .65, 1); g.translate(streetX(s) + B * (12.4 + i * .57), .32, -s + Math.sin(i * 3.2) * 1.2); push(color, g)
    }
    return Array.from(groups, ([key, gs]) => { const geometry = mergeGeometries(gs)!; gs.forEach(g => g.dispose()); geometry.computeBoundingSphere(); return { key, geometry } })
  }, [])
  useEffect(() => () => batches.forEach(b => b.geometry.dispose()), [batches])
  const night = timeOfDay === 'night', sunset = timeOfDay === 'sunset'
  // Music-reactive emissives: neon kicks with the beat, lamp heads and night windows breathe with the mix.
  const reactive = useRef(new Map<string, T.MeshStandardMaterial>())
  useFrame(() => {
    reactive.current.forEach((m, key) => {
      const base = m.userData.base as number
      if (key.startsWith('neon:')) m.emissiveIntensity = base * (0.75 + pulse.kick * 1.6 + pulse.bass * 0.7)
      else if (key === 'light') m.emissiveIntensity = base * (0.85 + pulse.energy * 0.5)
      else if (key === 'window' && night) m.emissiveIntensity = base * (0.7 + pulse.mids * 0.9)
    })
  })
  return <group>{batches.map(({ key, geometry }) => {
    const glass = key === 'glass', light = key === 'light', win = key === 'window', neon = key.startsWith('neon:')
    const color = light ? '#ffddb0' : glass ? '#9fc4c0' : win ? '#35606c' : neon ? key.slice(5) : key
    const ei = neon ? (night ? 6 : sunset ? 2.2 : .8) : light ? (night ? 3 : .15) : win ? (night ? .55 : 0) : 0
    return <mesh key={key} geometry={geometry} castShadow={!glass && !neon} receiveShadow={!neon} userData={{ cruiseOccluder: !glass }}>
      <meshStandardMaterial ref={(m: T.MeshStandardMaterial | null) => { if (m && (neon || light || win)) { m.userData.base = ei; reactive.current.set(key, m) } }} color={color} transparent={glass} opacity={glass ? .2 : 1} depthWrite={!glass}
        bumpMap={light || win || glass || neon ? undefined : plaster} bumpScale={.012}
        roughness={win ? .08 : glass ? .1 : .85} metalness={win ? .55 : glass ? .2 : 0}
        emissive={light ? '#ffbc76' : neon ? color : win && night ? '#ffcf8a' : '#000000'}
        emissiveIntensity={ei} />
    </mesh>
  })}</group>
}

// ---------- GLTF batching (palms, skyline) ----------------------------------

type Placement = { x: number; z: number; scale: number; yaw: number }
function batchScene(scene: T.Object3D, placements: Placement[]) {
  scene.updateMatrixWorld(true)
  const parts: { geometry: T.BufferGeometry; material: T.Material | T.Material[]; matrix: T.Matrix4 }[] = []
  scene.traverse(o => { if (o instanceof T.Mesh) parts.push({ geometry: o.geometry, material: o.material, matrix: o.matrixWorld.clone() }) })
  return parts.map(part => {
    const copies = placements.map(p => {
      const transform = new T.Object3D(); transform.position.set(p.x, 0, p.z); transform.scale.setScalar(p.scale); transform.rotation.y = p.yaw; transform.updateMatrix()
      const geometry = part.geometry.clone()
      // Decode quantized attributes before baking world transforms (they would overflow [-1,1]).
      for (const key of Object.keys(geometry.attributes)) {
        const source = geometry.getAttribute(key) as T.BufferAttribute
        if (source.array instanceof Float32Array && !source.normalized) continue
        const values = new Float32Array(source.count * source.itemSize)
        for (let v = 0; v < source.count; v++) for (let c = 0; c < source.itemSize; c++) values[v * source.itemSize + c] = source.getComponent(v, c)
        geometry.setAttribute(key, new T.BufferAttribute(values, source.itemSize))
      }
      return geometry.applyMatrix4(transform.matrix.multiply(part.matrix))
    })
    const geometry = mergeGeometries(copies)!; copies.forEach(g => g.dispose()); return { geometry, material: part.material }
  })
}
/** Wind + bass sway for baked palms. Geometry is in world space, so height above ground drives the bend. */
const swayUniforms = { uSwayTime: { value: 0 }, uSwayBass: { value: 0 } }
function swayMaterial(source: T.Material) {
  const m = source.clone()
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, swayUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSwayTime, uSwayBass;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float bend = max(0.0, position.y - 2.5); bend *= bend * 0.0035;
        float phase = position.x * 0.21 + position.z * 0.13;
        transformed.x += bend * (sin(uSwayTime * 0.9 + phase) * 1.2 + sin(uSwayTime * 2.3 + phase * 1.7) * 0.35) * (1.0 + uSwayBass * 2.2);
        transformed.z += bend * cos(uSwayTime * 0.7 + phase) * 0.6 * (1.0 + uSwayBass * 1.5);`)
  }
  m.customProgramCacheKey = () => 'cruise-sway'
  return m
}
function Batched({ url, placements, shadows = true, sway = false }: { url: string; placements: Placement[]; shadows?: boolean; sway?: boolean }) {
  const gltf = useGLTF(url, false, true)
  const batches = useMemo(() => batchScene(gltf.scene, placements).map(p => ({ ...p, material: sway ? (Array.isArray(p.material) ? p.material.map(swayMaterial) : swayMaterial(p.material)) : p.material })), [gltf.scene, placements, sway])
  useEffect(() => () => batches.forEach(p => { p.geometry.dispose(); if (sway) (Array.isArray(p.material) ? p.material : [p.material]).forEach(m => m.dispose()) }), [batches, sway])
  useFrame((_, dt) => { if (!sway) return; swayUniforms.uSwayTime.value += Math.min(dt, .05); swayUniforms.uSwayBass.value += (pulse.bass - swayUniforms.uSwayBass.value) * .15 })
  return <group dispose={null}>{batches.map((p, i) => <mesh key={i} geometry={p.geometry} material={p.material} castShadow={shadows} receiveShadow={shadows} />)}</group>
}

const AD_STATIONS = [56, 84, 144]
/** The ocean-side lamp at s=43 stood in front of billboard #1 (s=56) from the start line: no post there (its bench stays). */
const isOpenSightline = (s: number, side: number) => s === 43 && side === B
const PALMS: Placement[] = [
  ...Array.from({ length: 19 }, (_, i) => ({ s: 10 + i * 11.3, i })).filter(({ s }) => AD_STATIONS.every(a => Math.abs(a - s) > 4))
    .map(({ s, i }) => ({ x: streetX(s) + B * (12.5 + (i % 2) * 3), z: -s, scale: .69 + (i % 4) * .055, yaw: i * 2.4 })),
  // Sidewalk palms on the shop side, kept clear of the approach signs and hero shopfronts.
  ...[33.5, 58, 110, 172, 196].map((s, i) => ({ x: streetX(s) + D * 9.7, z: -s, scale: .62 + (i % 3) * .05, yaw: i * 1.7 })),
]
const SKYLINE_GLASS: Placement[] = [
  { x: D * 50, z: -70, scale: .95, yaw: .4 }, { x: D * 56, z: -175, scale: 1.15, yaw: 1.1 },
  { x: D * 14, z: -330, scale: 1.25, yaw: .2 }, { x: B * 10, z: -380, scale: 1.1, yaw: .9 },
]
const SKYLINE_TERRACED: Placement[] = [
  { x: D * 46, z: -125, scale: .85, yaw: 0 }, { x: D * 44, z: -240, scale: 1.0, yaw: .6 },
  { x: D * 34, z: -300, scale: 1.1, yaw: .3 }, { x: D * -2, z: -350, scale: .9, yaw: 1.4 },
]

// ---------- Ground, ocean ---------------------------------------------------

const OCEAN = { sunset: { deep: '#1c4a6e' }, day: { deep: '#1d7f98' }, night: { deep: '#0a1430' } }
const oceanVertex = /* glsl */ `
#include <fog_pars_vertex>
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const oceanFragment = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uSun, uSunColor, uDeep, uHorizon, uMid; uniform float uTime, uShore, uHighs;
varying vec3 vWorld;
vec2 w(vec2 p, vec2 d, float f, float a, float s) { float k = dot(p, d) * f + uTime * s; return d * cos(k) * f * a; }
void main() {
  vec2 p = vWorld.xz, g = vec2(0.0);
  g += w(p, normalize(vec2(.8, .6)), .21, .22, .9);  g += w(p, normalize(vec2(.3, 1.)), .37, .12, 1.3);
  g += w(p, normalize(vec2(-.6, .8)), .73, .05, 1.9); g += w(p, normalize(vec2(.95, -.3)), 1.31, .025, 2.6);
  g += w(p, normalize(vec2(-.2, -1.)), 2.3, .012, 3.4); g += w(p, normalize(vec2(.5, .5)), 3.7, .007, 4.2);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n); r.y = abs(r.y);
  vec3 sky = mix(uHorizon, uMid, smoothstep(0.0, 0.35, r.y));
  float sd = max(dot(r, uSun), 0.0);
  vec3 col = mix(uDeep, sky, clamp(fres * 1.15, 0.0, 1.0));
  col += uSunColor * (pow(sd, 260.0) * 9.0 * (1.0 + uHighs * 1.5) + pow(sd, 30.0) * .35);
  float shore = 1.0 - smoothstep(0.0, uShore, abs(vWorld.x) - 34.0 + sin(vWorld.z * .15 + uTime * .7) * .6);
  col = mix(col, vec3(.95, .93, .9), shore * .55);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`
function Ocean({ time }: { time: Time }) {
  const material = useMemo(() => new T.ShaderMaterial({
    vertexShader: oceanVertex, fragmentShader: oceanFragment, fog: true,
    uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {
      uSun: { value: new T.Vector3() }, uSunColor: { value: new T.Color() }, uDeep: { value: new T.Color() },
      uHorizon: { value: new T.Color() }, uMid: { value: new T.Color() }, uTime: { value: 0 }, uShore: { value: 2.2 }, uHighs: { value: 0 },
    }]),
  }), [])
  useEffect(() => {
    const p = SKY[time], u = material.uniforms
    u.uSun.value.set(...p.sunDir).normalize(); u.uSunColor.value.set(p.sun); u.uDeep.value.set(OCEAN[time].deep)
    u.uHorizon.value.set(p.horizon); u.uMid.value.set(p.mid)
  }, [material, time])
  useEffect(() => () => material.dispose(), [material])
  useFrame((_, dt) => { material.uniforms.uTime.value += dt; material.uniforms.uHighs.value = pulse.highs })
  return <mesh rotation-x={-Math.PI / 2} position={[B * (34 + 150), -.06, -150]} material={material}><planeGeometry args={[300, 700]} /></mesh>
}

function Ground({ time }: { time: Time }) {
  const originals = useTexture(['/cruise/materials/clean-asphalt/color.webp', '/cruise/materials/clean-asphalt/normal.webp', '/cruise/materials/clean-asphalt/roughness.webp'])
  const maps = useMemo(() => originals.map((original, i) => { const t = original.clone(); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 70); t.anisotropy = 8; if (i === 0) t.colorSpace = T.SRGBColorSpace; t.needsUpdate = true; return t }), [originals])
  const road = useMemo(() => {
    const p: number[] = [], uv: number[] = [], indices: number[] = []
    for (let i = 0; i <= 120; i++) { const s = -12 + i * 2; const x = streetX(s); p.push(x - 6, 0, -s, x + 6, 0, -s); uv.push(0, i / 120, 1, i / 120); if (i < 120) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g
  }, [])
  useEffect(() => () => { road.dispose(); maps.forEach(m => m.dispose()) }, [road, maps])
  // Land stops at the shoreline (x = B*34) so the ocean is no longer buried under the sand plane.
  const land = 34 + 70
  return <>
    <mesh geometry={road} receiveShadow><meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new T.Vector2(.35, .35)} color="#cfc8c6" envMapIntensity={.9} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[B * 34 + D * land / 2, -.035, -150]} receiveShadow><planeGeometry args={[land, 700]} /><meshStandardMaterial color="#e6cfa6" roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[B * 14.6, -.018, -110]} receiveShadow><planeGeometry args={[6.1, 480]} /><meshStandardMaterial color="#8fa166" roughness={1} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[B * 22.1, -.025, -110]}><planeGeometry args={[3.2, 480]} /><meshStandardMaterial color="#d8c3a0" roughness={.9} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[B * 33.2, -.03, -150]}><planeGeometry args={[2.4, 700]} /><meshStandardMaterial color="#b89d76" roughness={.4} metalness={.1} /></mesh>
    <Ocean time={time} />
  </>
}

// ---------- Signage ---------------------------------------------------------

function Sign({ id, s, side, texture, onClick, night, width = 7.45, height = 3.4, y = 5.3, offset = 10.1 }: { id: string; s: number; side: number; texture: T.Texture; onClick?: (id: string) => void; night: boolean; width?: number; height?: number; y?: number; offset?: number }) {
  const x = streetX(s) + side * offset
  return <group position={[x, 0, -s]} rotation-y={-side * .25}>
    {[-width * .3, width * .3].map(a => <mesh key={a} position={[a, y / 2, -.25]} castShadow><boxGeometry args={[.22, y, .26]} /><meshStandardMaterial color="#2f4744" roughness={.55} metalness={.4} /></mesh>)}
    <mesh position={[0, y, -.12]} castShadow><boxGeometry args={[width + .3, height + .3, .28]} /><meshStandardMaterial color="#f1e4c7" /></mesh>
    <mesh name={`ad-${id}`} userData={{ adId: id }} position={[0, y, .035]} onClick={event => { event.stopPropagation(); onClick?.(id) }}>
      <planeGeometry args={[width, height]} /><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={night ? .9 : .28} roughness={.7} />
    </mesh>
    <mesh position={[0, y + height / 2 + .3, .2]}><boxGeometry args={[width + .5, .12, .8]} /><meshStandardMaterial color="#f1e4c7" /></mesh>
    {[-.35, 0, .35].map(f => <mesh key={f} position={[f * width, y + height / 2 + .25, .55]}><boxGeometry args={[.12, .12, .5]} /><meshStandardMaterial color="#2f4744" emissive="#ffe6b8" emissiveIntensity={night ? 2 : 0} /></mesh>)}
  </group>
}

/** Flat sign on a shopfront, facing the road. a = metres from building centre toward the road. */
function FacadeSign({ s, a, y, w, h, texture, night, glow = .1 }: { s: number; a: number; y: number; w: number; h: number; texture: T.Texture; night: boolean; glow?: number }) {
  const x = streetX(s) + D * 17 - D * a
  return <mesh position={[x, y, -s]} rotation-y={-D * Math.PI / 2}><planeGeometry args={[w, h]} /><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffe8c8" emissiveIntensity={night ? .9 : glow} roughness={.6} /></mesh>
}

/** Projecting blade sign: faces oncoming traffic, so it reads for the whole approach. */
function BladeSign({ s, texture, night, neon }: { s: number; texture: T.Texture; night: boolean; neon: string }) {
  const x = streetX(s) + D * 17 - D * 7.2, z = -s + 9
  return <group position={[x, 7.4, z]}>
    <mesh castShadow><boxGeometry args={[1.85, 6.3, .2]} /><meshStandardMaterial color="#f4ead2" /></mesh>
    <mesh position={[0, 0, .105]}><planeGeometry args={[1.6, 6]} /><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={night ? 1 : .3} /></mesh>
    <mesh position={[0, 0, -.105]} rotation-y={Math.PI}><planeGeometry args={[1.6, 6]} /><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={night ? 1 : .3} /></mesh>
    <mesh position={[0, 0, 0]}><boxGeometry args={[1.95, 6.4, .08]} /><meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={night ? 3.5 : 1.6} /></mesh>
    {[1.6, -1.6].map(yy => <mesh key={yy} position={[D * 1.4, yy, 0]}><boxGeometry args={[1.2, .1, .1]} /><meshStandardMaterial color="#2f4744" metalness={.5} roughness={.4} /></mesh>)}
  </group>
}

function TowerDisc({ s, night }: { s: number; night: boolean }) {
  const t = useArt(() => canvasTexture(512, 512, (c, w) => { c.fillStyle = '#2aa79f'; c.fillRect(0, 0, w, w); vinyl(c, w / 2, w / 2, w * .46, '#ff8a5b') }))
  const x = streetX(s) + D * 17 - D * 5.08
  return <mesh position={[x, 9 + 1.9, -s + 6.5]} rotation-y={-D * Math.PI / 2}><circleGeometry args={[1.5, 48]} /><meshStandardMaterial map={t} roughness={.35} emissiveMap={t} emissive="#ffffff" emissiveIntensity={night ? .7 : .12} /></mesh>
}

function ChalkBoard({ s }: { s: number }) {
  const t = useArt(ART.chalk)
  const x = streetX(s) + D * 9.6
  return <group position={[x, 0, -s]} rotation-y={-D * .5}>
    <mesh position={[0, .62, 0]} rotation-x={-.12}><planeGeometry args={[.8, 1.0]} /><meshStandardMaterial map={t} roughness={.9} /></mesh>
    <mesh position={[0, .6, -.13]} rotation-x={.12}><boxGeometry args={[.86, 1.08, .04]} /><meshStandardMaterial color="#8a6544" /></mesh>
  </group>
}

function EventBanner({ s, night }: { s: number; night: boolean }) {
  const map = useArt(ART.banner)
  return <group position={[streetX(s), 0, -s]} rotation-y={yawAt(s)}>
    {[-7.6, 7.6].map(x => <mesh key={x} position={[x, 4, 0]} castShadow><cylinderGeometry args={[.1, .14, 8, 10]} /><meshStandardMaterial color="#2f4744" metalness={.4} roughness={.5} /></mesh>)}
    <mesh position={[0, 7.7, 0]}><boxGeometry args={[15.2, .05, .05]} /><meshStandardMaterial color="#6d6c66" /></mesh>
    <mesh position={[0, 6.7, 0]}><planeGeometry args={[12.5, 1.7]} /><meshStandardMaterial map={map} side={T.DoubleSide} emissiveMap={map} emissive="#ffffff" emissiveIntensity={night ? 1 : .35} /></mesh>
  </group>
}

/** Cheap night lighting: additive warm pools under every street lamp instead of 16 real point lights. */
function LightPools({ time }: { time: Time }) {
  const texture = useArt(() => canvasTexture(256, 256, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    g.addColorStop(0, 'rgba(255,196,128,1)'); g.addColorStop(.35, 'rgba(255,170,100,.45)'); g.addColorStop(1, 'rgba(255,150,90,0)')
    c.fillStyle = g; c.fillRect(0, 0, w, w)
  }))
  const geometry = useMemo(() => {
    const parts: T.BufferGeometry[] = []
    for (let s = 16; s < 220; s += 27) for (const side of [-1, 1]) {
      if (isOpenSightline(s, side)) continue
      const g = new T.PlaneGeometry(10, 10); g.rotateX(-Math.PI / 2); g.translate(streetX(s) + side * (8.9 - 2.2), .06, -s); parts.push(g)
    }
    const merged = mergeGeometries(parts)!; parts.forEach(g => g.dispose()); return merged
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (time !== 'night') return null
  return <mesh geometry={geometry} renderOrder={2}><meshBasicMaterial map={texture} transparent opacity={.6} blending={T.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} /></mesh>
}

// ---------- The Avenue: claimable plots --------------------------------------

/** While the Avenue is hidden, open plots carry Buena Onda culture instead of prices. */
const HOUSE_FLAGS = [
  { bg: '#2aa79f', fg: '#fff4dc', a: 'BUENA', b: 'ONDA', icon: 'vinyl' },
  { bg: '#f7b2bb', fg: '#d9405b', a: 'OCEAN', b: 'DRIVE', icon: 'palm' },
  { bg: '#3b1f6b', fg: '#ffb3e1', a: 'VICE', b: 'NIGHTS', icon: 'palm' },
  { bg: '#ffb347', fg: '#1b2340', a: 'RADIO', b: 'ON', icon: 'vinyl' },
] as const
function houseArt(plot: Plot, w: number, h: number, vertical: boolean) {
  const f = HOUSE_FLAGS[plot.number % HOUSE_FLAGS.length]
  return canvasTexture(w, h, (c) => {
    c.fillStyle = f.bg; c.fillRect(0, 0, w, h); frame(c, w, h, f.fg, vertical ? 12 : 14)
    if (vertical) {
      if (f.icon === 'vinyl') vinyl(c, w / 2, h * .17, w * .3, '#ff8a5b'); else palm(c, w / 2 - 10, h * .3, w * .55, f.fg, .15)
      label(c, f.a, w / 2, h * .52, 74, w * .86, f.fg); label(c, f.b, w / 2, h * .66, 74, w * .86, f.fg)
      label(c, 'MIAMI', w / 2, h * .88, 40, w * .8, f.fg, { weight: 700, spacing: 6 })
    } else {
      label(c, 'BUENA ONDA RADIO', w / 2, h * .4, h * .3, w * .86, '#fff4dc')
      label(c, 'LISTEN WHILE YOU CRUISE · CH1 – CH4', w / 2, h * .74, h * .13, w * .86, '#fff4dc', { weight: 700, spacing: 3 })
    }
  })
}

function plotArt(plot: Plot, w: number, h: number, vertical: boolean, phase: AvenuePhase = 'open') {
  if (phase === 'hidden' && (!plot.owner || plot.pending)) return houseArt(plot, w, h, vertical)
  const price = priceCents(plot)
  return canvasTexture(w, h, (c) => {
    if (plot.owner) {
      const bg = plot.owner.color ?? '#1b2340'
      c.fillStyle = bg; c.fillRect(0, 0, w, h)
      const light = parseInt(bg.slice(1, 3), 16) * .299 + parseInt(bg.slice(3, 5), 16) * .587 + parseInt(bg.slice(5, 7), 16) * .114 > 150
      const fg = light ? '#1b2340' : '#fff4e2'
      frame(c, w, h, fg, vertical ? 12 : 14)
      if (vertical) {
        c.save(); c.translate(w / 2, h * .46); c.rotate(-Math.PI / 2)
        label(c, plot.owner.name.toUpperCase(), 0, 0, w * .5, h * .78, fg); c.restore()
        label(c, `#${plot.number}`, w / 2, h - 46, 44, w * .8, fg, { weight: 700 })
      } else {
        label(c, plot.owner.name.toUpperCase(), w / 2, h * .38, h * .36, w * .86, fg)
        if (plot.owner.tagline) label(c, plot.owner.tagline.toUpperCase(), w / 2, h * .72, h * .14, w * .8, fg, { weight: 700, spacing: 3 })
        label(c, `PLOT #${plot.number}`, w - 90, h - 24, 22, 150, fg, { weight: 700 })
      }
    } else {
      c.fillStyle = '#16122b'; c.fillRect(0, 0, w, h)
      c.strokeStyle = NEON_PINK; c.lineWidth = 10; c.setLineDash([26, 14]); c.strokeRect(12, 12, w - 24, h - 24); c.setLineDash([])
      const cents = price ?? 0
      if (vertical) {
        label(c, `#${plot.number}`, w / 2, h * .16, 96, w * .84, '#fff2fb', { glow: NEON_PINK })
        c.save(); c.translate(w / 2, h * .53); c.rotate(-Math.PI / 2)
        label(c, 'CLAIM ME', 0, 0, w * .44, h * .5, '#ffd27a'); c.restore()
        label(c, `FROM ${dollars(cents)}`, w / 2, h * .9, 52, w * .86, '#38f0dc', { glow: '#38f0dc' })
      } else {
        label(c, `THIS ${plot.kind === 'bench' ? 'BENCH' : 'SPOT'} IS OPEN · PLOT #${plot.number}`, w / 2, h * .36, h * .2, w * .9, '#fff2fb', { glow: NEON_PINK })
        label(c, `CLAIM IT FROM ${dollars(cents)} · BUILD IT. BRAND IT. DEFEND IT.`, w / 2, h * .72, h * .12, w * .9, '#38f0dc', { weight: 700 })
      }
    }
  })
}
const plotKey = (p: Plot) => `${p.number}:${p.status}:${p.owner?.name}:${p.owner?.color}:${p.owner?.tagline}:${p.valueCents}`

function PlotTexture({ plot, w, h, vertical, phase, children }: { plot: Plot; w: number; h: number; vertical: boolean; phase: AvenuePhase; children: (t: T.Texture) => JSX.Element }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(() => plotArt(plot, w, h, vertical, phase), [plotKey(plot), w, h, vertical, phase])
  useEffect(() => () => t.dispose(), [t]); return children(t)
}

/** Lamp-post flags: double-sided, face oncoming traffic, swing gently with the bass. */
function LampFlag({ plot, night, onClick, phase }: { plot: Plot; night: boolean; onClick?: (n: number) => void; phase: AvenuePhase }) {
  const flag = useRef<T.Group>(null)
  const x = streetX(plot.s) + plot.side * (8.9 - .55)
  useFrame(() => { if (flag.current) flag.current.rotation.y = Math.sin(pulse.time * 1.1 + plot.number) * .06 + pulse.kick * .05 * plot.side })
  return <PlotTexture plot={plot} w={256} h={640} vertical phase={phase}>{t => <group position={[x, 4.3, -plot.s]}>
    <mesh position={[0, 1.05, 0]}><boxGeometry args={[.9, .05, .05]} /><meshStandardMaterial color="#2f4744" metalness={.5} roughness={.4} /></mesh>
    <group ref={flag}>
      {[0, Math.PI].map(r => <mesh key={r} rotation-y={r} position-z={r ? -.01 : .01} name={`plot-${plot.number}`} userData={r ? { plot: plot.number } : { plot: plot.number, adId: `plot-${plot.number}` }}
        onClick={e => { e.stopPropagation(); onClick?.(plot.number) }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
        <planeGeometry args={[.8, 2]} /><meshStandardMaterial map={t} emissiveMap={t} emissive="#ffffff" emissiveIntensity={night ? .85 : plot.owner ? .22 : .45} side={T.FrontSide} />
      </mesh>)}
    </group>
  </group>}</PlotTexture>
}

/** Beach bench backs: a sponsor panel facing the road. */
function BenchPanel({ plot, night, onClick, phase }: { plot: Plot; night: boolean; onClick?: (n: number) => void; phase: AvenuePhase }) {
  const x = streetX(plot.s - 4) + B * 8.9 + B * 3.36
  return <PlotTexture plot={plot} w={1024} h={256} vertical={false} phase={phase}>{t =>
    <mesh position={[x, .92, -plot.s]} rotation-y={-B * Math.PI / 2} name={`plot-${plot.number}`} userData={{ plot: plot.number, adId: `plot-${plot.number}` }} onClick={e => { e.stopPropagation(); onClick?.(plot.number) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
      <planeGeometry args={[2.2, .55]} /><meshStandardMaterial map={t} emissiveMap={t} emissive="#ffffff" emissiveIntensity={night ? .7 : .25} />
    </mesh>}</PlotTexture>
}

/** Live LED equalizer riding on top of the Vice Nights banner. */
function BannerEQ({ s }: { s: number }) {
  const mesh = useRef<T.InstancedMesh>(null)
  const tmp = useMemo(() => new T.Object3D(), [])
  useEffect(() => {
    const m = mesh.current; if (!m) return
    const c = new T.Color()
    for (let i = 0; i < BANDS; i++) m.setColorAt(i, c.set(NEON_PINK).lerp(new T.Color(NEON_TEAL), i / (BANDS - 1)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])
  useFrame(() => {
    const m = mesh.current; if (!m) return
    for (let i = 0; i < BANDS; i++) {
      const v = .06 + pulse.spectrum[i] * 1.25
      tmp.position.set(-5.75 + i * (11.5 / (BANDS - 1)), 7.6 + v / 2, 0); tmp.scale.set(1, v, 1); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <group position={[streetX(s), 0, -s]} rotation-y={yawAt(s)}>
    <instancedMesh ref={mesh} args={[undefined, undefined, BANDS]} frustumCulled={false}>
      <boxGeometry args={[.32, 1, .08]} /><meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  </group>
}

// ---------- Life: traffic and pedestrians ------------------------------------

const TRAFFIC_COLORS = ['#f1e6cf', '#d9485a', '#53bfcc', '#f4b860']
function Traffic({ drive }: { drive?: MutableRefObject<{ distance: number }> }) {
  const gltf = useGLTF('/cruise/traffic/classic-traffic.glb', false, true)
  const cars = useMemo(() => {
    // Normalise the model: ~4.7 m long, nose toward -z.
    const base = gltf.scene.clone(true); const box = new T.Box3().setFromObject(base); const size = box.getSize(new T.Vector3())
    const holder = new T.Group(); holder.add(base)
    if (size.x > size.z) base.rotation.y = Math.PI / 2
    base.updateMatrixWorld(true); const b2 = new T.Box3().setFromObject(base); const len = b2.getSize(new T.Vector3()).z
    base.scale.setScalar(4.7 / len); base.updateMatrixWorld(true)
    let rearZ = 0; base.traverse(o => { if (o instanceof T.Mesh && /rear/i.test((Array.isArray(o.material) ? o.material[0] : o.material).name)) rearZ = new T.Box3().setFromObject(o).getCenter(new T.Vector3()).z })
    if (rearZ < 0) base.rotation.y += Math.PI
    base.updateMatrixWorld(true); const b3 = new T.Box3().setFromObject(base); base.position.y -= b3.min.y
    const specs = [
      { lane: 2.1, ahead: 34, speed: 0, color: 0 }, { lane: 2.0, ahead: 72, speed: 0, color: 1 },
      { lane: -3.4, ahead: 0, speed: 7.5, color: 2, start: 150 }, { lane: -3.4, ahead: 0, speed: 6.5, color: 3, start: 40 },
    ]
    return specs.map(spec => {
      const car = holder.clone(true)
      car.traverse(o => { if (o instanceof T.Mesh) { const m = (Array.isArray(o.material) ? o.material[0] : o.material) as T.MeshStandardMaterial; if (/paint/i.test(m.name)) { o.material = m.clone(); (o.material as T.MeshStandardMaterial).color.set(TRAFFIC_COLORS[spec.color]) } o.castShadow = true } })
      return { car, spec, s: spec.start ?? 0 }
    })
  }, [gltf.scene])
  useFrame((state, dt) => {
    const d = drive?.current.distance ?? 0, t = state.clock.elapsedTime
    for (const c of cars) {
      if (c.spec.speed === 0) c.s = Math.min(232, d + c.spec.ahead + Math.sin(t * .15 + c.spec.ahead) * 5)
      else { c.s -= c.spec.speed * Math.min(dt, .05); if (c.s < -15) c.s = 235 }
      c.car.position.set(streetX(c.s) + c.spec.lane, 0, -c.s)
      c.car.rotation.y = yawAt(c.s) + (c.spec.speed ? Math.PI : 0)
      c.car.visible = c.s < 231
    }
  })
  return <group>{cars.map((c, i) => <primitive key={i} object={c.car} />)}</group>
}

function People({ count }: { count: number }) {
  const casual = useGLTF('/cruise/people/casual.glb', false, true), suit = useGLTF('/cruise/people/suit.glb', false, true)
  const crowd = useMemo(() => Array.from({ length: count }, (_, i) => {
    const src = i % 3 === 2 ? suit : casual
    const body = cloneSkinned(src.scene) as T.Object3D
    const box = new T.Box3().setFromObject(body); const height = box.getSize(new T.Vector3()).y || 1
    body.scale.setScalar((1.66 + (i % 4) * .05) / height)
    body.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.frustumCulled = false } })
    const holder = new T.Group(); holder.add(body)
    const mixer = new T.AnimationMixer(body); const walkClip = src.animations.find(a => /walk/i.test(a.name)); const idleClip = src.animations.find(a => /idle/i.test(a.name))
    const walking = i % 4 !== 3; const clip = walking ? walkClip : idleClip
    if (clip) { const action = mixer.clipAction(clip); action.time = i * .37; action.play() }
    const side = i % 3 === 1 ? B : D; const dir = i % 2 ? 1 : -1
    return { holder, mixer, walking, side, dir, s: 12 + i * (205 / count), lane: side === D ? 8.3 + (i % 2) * .9 : 8.0, speed: 1.15 + (i % 3) * .12 }
  }), [casual, suit, count])
  useFrame((_, dt) => {
    const step = Math.min(dt, .05)
    for (const p of crowd) {
      p.mixer.update(step)
      if (p.walking) { p.s += p.dir * p.speed * step; if (p.s > 222) p.s = 8; if (p.s < 8) p.s = 222 }
      p.holder.position.set(streetX(p.s) + p.side * p.lane, .1, -p.s)
      p.holder.rotation.y = p.walking ? (p.dir > 0 ? Math.PI : 0) : -p.side * Math.PI / 2
    }
  })
  return <group>{crowd.map((p, i) => <primitive key={i} object={p.holder} />)}</group>
}

// ---------- Scene -----------------------------------------------------------

export default function StreetEnvironment({ timeOfDay, onAdClick, onPlotClick: plotClick, plots = SEED_PLOTS, avenue = 'hidden', drive, high = false }: Props) {
  // Hidden phase: signs are scenery, not storefronts for ad space. Owned plots still link out.
  const onPlotClick = (n: number) => { const p = plots.find(x => x.number === n); if (avenue !== 'hidden' || (p?.owner && !p.pending && p.status === 'claimed')) plotClick?.(n) }
  const night = timeOfDay === 'night'
  const plot1 = plots.find(p => p.number === 1)!
  const claimedBillboard = useArt(() => avenue === 'hidden' && (!plot1.owner || plot1.pending) ? ART.radioBillboard() : plot1.owner ? plotArt(plot1, 1600, 760, false, avenue) : ART.billboard(), [plotKey(plot1), plot1.pending, avenue])
  const billboard = claimedBillboard, buena = useArt(ART.buenaSign), branches = useArt(ART.branchesSign)
  const buenaParapet = useArt(ART.buenaParapet), branchesParapet = useArt(ART.branchesParapet)
  const buenaBlade = useArt(() => ART.blade(['RECORDS'], '#2aa79f', '#fff4dc', 'vinyl'))
  const branchesBlade = useArt(() => ART.blade(['BRANCHES'], '#f7b2bb', '#d9405b', 'palm'))
  const oceanPalms = useArt(() => ART.board('OCEAN PALMS', 'HOTEL · MIAMI BEACH', '#5a7f9c'))
  const cafeSol = useArt(() => ART.board('CAFE SOL', 'COFFEE · BREAKFAST · SUNSHINE', '#c9764a'))
  const s3 = SITES[BUENA], s5 = SITES[BRANCHES]
  return <group>
    <Ground time={timeOfDay} /><Architecture timeOfDay={timeOfDay} />
    <Batched url="/cruise/environment/palms/yughues-palm.glb" placements={PALMS} sway />
    <Batched url="/cruise/environment/skyline/skyline-glass.glb" placements={SKYLINE_GLASS} shadows={false} />
    <Batched url="/cruise/environment/skyline/skyline-terraced.glb" placements={SKYLINE_TERRACED} shadows={false} />
    <Sign id="billboard" s={56} side={B} offset={11} texture={billboard} onClick={() => onPlotClick ? onPlotClick(1) : onAdClick?.('billboard')} night={night} width={10} height={4.75} y={4.6} />
    <Sign id="buena" s={84} side={D} texture={buena} onClick={onAdClick} night={night} />
    <Sign id="branches" s={144} side={D} texture={branches} onClick={onAdClick} night={night} />
    <FacadeSign s={s3} a={4.08} y={7.35} w={15} h={2.5} texture={buenaParapet} night={night} glow={.2} />
    <FacadeSign s={s5} a={4.08} y={7.35} w={15} h={2.5} texture={branchesParapet} night={night} glow={.2} />
    <BladeSign s={s3} texture={buenaBlade} night={night} neon={NEON_TEAL} />
    <BladeSign s={s5} texture={branchesBlade} night={night} neon={NEON_PINK} />
    <TowerDisc s={s3} night={night} />
    <ChalkBoard s={s5 - 6} />
    <FacadeSign s={SITES[1]} a={5.9} y={4.65} w={16.5} h={1.55} texture={oceanPalms} night={night} />
    <FacadeSign s={SITES[4]} a={5.9} y={4.65} w={16.5} h={1.55} texture={cafeSol} night={night} />
    <EventBanner s={62} night={night} />
    <BannerEQ s={62} />
    {plots.filter(p => p.kind === 'lamp' && !isOpenSightline(p.s, p.side)).map(p => <LampFlag key={p.number} plot={p} night={night} onClick={onPlotClick} phase={avenue} />)}
    {plots.filter(p => p.kind === 'bench').map(p => <BenchPanel key={p.number} plot={p} night={night} onClick={onPlotClick} phase={avenue} />)}
    <LightPools time={timeOfDay} />
    <Traffic drive={drive} />
    <People count={high ? 12 : 7} />
  </group>
}
