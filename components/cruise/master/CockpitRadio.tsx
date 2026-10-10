'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RADIO_PRESETS, useCockpit } from '../vehicle/CockpitContext'
import { pulse, BANDS } from './pulse'
import { mat, mergeParts } from './cockpit/merge'
import { glowTex, vuTex } from './cockpit/textures'
import { useReducedMotion } from './cockpit/motion'

/**
 * The hero of the cockpit: an '84-style head unit with a vacuum-fluorescent display,
 * a spectrum fed by the radio (labelled honestly: LIVE SPECTRUM vs AUTO RHYTHM), analog VU
 * needles, chrome presets that physically press, a tape deck with turning reels and an
 * under-dash graphic EQ. Station changes run a short VFD tuning sweep (dial pointer,
 * sweeping readout and a scan bar) instead of any flash.
 * Static parts are merged per material class; presets are instanced. Every control routes
 * to the existing CockpitContext / useCruiseAudio owner.
 */

const VFD = '#ffb347', VFD_DIM = '#3a220c', VFD_CYAN = '#5ff2e6'
const SEGMENTS = 12
const FONT = '"Consolas","Lucida Console","Courier New",monospace'
const DIAL_LO = 88.1, DIAL_HI = 107.9
const dialFor = (i: number) => DIAL_LO + (RADIO_PRESETS.length > 1 ? i / (RADIO_PRESETS.length - 1) : .5) * (DIAL_HI - DIAL_LO)

function canvas(w: number, h: number, live = false) {
  const el = document.createElement('canvas'); el.width = w; el.height = h
  const t = new T.CanvasTexture(el); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4
  // Live screens re-upload many times a second: skip the mipmap chain rebuild on every upload.
  if (live) { t.generateMipmaps = false; t.minFilter = T.LinearFilter }
  return { el, ctx: el.getContext('2d')!, t }
}

const hover = (on: boolean) => { document.body.style.cursor = on ? 'pointer' : '' }
const DEV = process.env.NODE_ENV !== 'production'

export default function CockpitRadio({ night, sunset = false, high = false }: { night: boolean; sunset?: boolean; high?: boolean }) {
  const controls = useCockpit(); const audio = controls?.audio
  const reduced = useReducedMotion()
  const screen = useMemo(() => canvas(1024, 256, true), [])
  const eq = useMemo(() => canvas(512, 128, true), [])
  // VFD cell mask: drawn once, stamped over every frame for the dot-matrix look.
  const mask = useMemo(() => {
    const el = document.createElement('canvas'); el.width = 1024; el.height = 256; const c = el.getContext('2d')!
    c.fillStyle = 'rgba(0,0,0,.38)'; for (let y = 0; y < 256; y += 4) c.fillRect(0, y + 3, 1024, 1)
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < 1024; x += 4) c.fillRect(x + 3, 0, 1, 256)
    return el
  }, [])
  const tape = useMemo(() => {
    const c = canvas(512, 160); const x = c.ctx
    const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, '#f4ead2'); g.addColorStop(1, '#e8d6ad'); x.fillStyle = g; x.fillRect(0, 0, 512, 160)
    x.fillStyle = '#ff4f9a'; x.fillRect(0, 18, 512, 14); x.fillStyle = '#38f0dc'; x.fillRect(0, 34, 512, 8)
    x.fillStyle = '#1b2340'; x.font = '900 40px "Arial Black",Arial,sans-serif'; x.textAlign = 'center'; x.fillText('BUENA ONDA', 256, 92)
    x.font = '700 22px monospace'; x.fillText('MIAMI MIX · SIDE A · C-90', 256, 128); c.t.needsUpdate = true; return c
  }, [])
  const tex = useMemo(() => ({ glow: glowTex(), vu: vuTex() }), [])

  // ---- Static geometry, merged per material class -------------------------------
  const geo = useMemo(() => {
    const chrome = mergeParts([
      { g: new RoundedBoxGeometry(.38, .125, .06, 2, .008), m: mat([0, 0, -.03]), c: '#c9ccd1' },
      { g: new T.BoxGeometry(.05, .02, .006), m: mat([.135, -.1, .004]), c: '#cfd2d6' },
      // Thin bright bezel around the display window.
      { g: new T.BoxGeometry(.252, .003, .003), m: mat([-.03, .0545, .004]), c: '#eef0f3' },
      { g: new T.BoxGeometry(.252, .003, .003), m: mat([-.03, -.0145, .004]), c: '#eef0f3' },
    ])
    const dark = mergeParts([
      { g: new T.PlaneGeometry(.362, .108), m: mat([0, .002, .001]), c: '#17181c' },
      { g: new RoundedBoxGeometry(.38, .07, .05, 2, .006), m: mat([0, -.1, -.025]), c: '#1c1d21' },
      { g: new RoundedBoxGeometry(.36, .05, .1, 2, .006), m: mat([0, -.22, -.03]), c: '#202227' },
    ])
    const glass = mergeParts([
      { g: new T.PlaneGeometry(.248, .068), m: mat([-.03, .02, .006]), c: '#2a160a' },
      { g: new T.PlaneGeometry(.205, .054), m: mat([-.03, -.1, .004]), c: '#1a1a1a' },
    ])
    const vu = mergeParts([0, 1].map(i => ({ g: new T.PlaneGeometry(.044, .027), m: mat([.117, .036 - i * .033, .003]) })))
    // Additive halos: VFD spill onto the fascia, and the EQ's green spill. One draw.
    const halo = mergeParts([
      { g: new T.PlaneGeometry(.46, .2), m: mat([-.03, .02, .0075]), c: '#ff9a3c' },
      { g: new T.PlaneGeometry(.46, .1), m: mat([0, -.22, .0215]), c: '#3dff8a' },
    ])
    const knob = mergeParts([
      { g: new T.CylinderGeometry(.016, .018, .024, 28), m: mat([0, 0, .012], [Math.PI / 2, 0, 0]), c: '#d5d8dd' },
      { g: new T.CylinderGeometry(.0125, .0125, .002, 28), m: mat([0, 0, .0245], [Math.PI / 2, 0, 0]), c: '#9aa0a8' },
      { g: new T.BoxGeometry(.002, .008, .002), m: mat([0, .009, .026]), c: VFD },
    ])
    const reel = mergeParts([
      { g: new T.CircleGeometry(.011, 6), c: '#efefe9' },
      { g: new T.CircleGeometry(.004, 12), m: mat([0, 0, .0005]), c: '#1a1a1a' },
    ])
    const needle = new T.BoxGeometry(.0012, .022, .0005).translate(0, .011, 0)
    const preset = new RoundedBoxGeometry(.05, .014, .012, 2, .003)
    const led = new T.CircleGeometry(.0022, 12)
    return { chrome, dark, glass, vu, halo, knob, reel, needle, preset, led }
  }, [])

  const mats = useMemo(() => ({
    chrome: new T.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: .2 }),
    dark: new T.MeshStandardMaterial({ vertexColors: true, metalness: .55, roughness: .38 }),
    glass: new T.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: .26, roughness: .05, metalness: .3, depthWrite: false }),
    vfd: new T.MeshBasicMaterial({ map: screen.t, toneMapped: false }),
    eq: new T.MeshBasicMaterial({ map: eq.t, toneMapped: false }),
    tape: new T.MeshStandardMaterial({ map: tape.t, roughness: .6 }),
    vu: new T.MeshStandardMaterial({ map: tex.vu, emissiveMap: tex.vu, emissive: '#ffcf7a', roughness: .5 }),
    halo: new T.MeshBasicMaterial({ map: tex.glow, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: .3 }),
    needle: new T.MeshBasicMaterial({ color: '#c2241f' }),
    knob: new T.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: .15 }),
    reel: new T.MeshStandardMaterial({ vertexColors: true, roughness: .5 }),
    preset: new T.MeshStandardMaterial({ color: '#ffffff', metalness: .9, roughness: .25 }),
    led: new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
  }), [screen, eq, tape, tex])

  useEffect(() => () => {
    screen.t.dispose(); eq.t.dispose(); tape.t.dispose(); Object.values(tex).forEach(t => t.dispose())
    Object.values(geo).forEach(g => g.dispose()); Object.values(mats).forEach(m => m.dispose())
  }, [screen, eq, tape, tex, geo, mats])

  // Lighting levels per time of day: the VFD is self-lit; halos stay subtle in daylight.
  useEffect(() => {
    mats.vfd.color.setScalar(night ? 1.25 : 1.05)
    mats.eq.color.setScalar(night ? 1.2 : 1)
    mats.vu.emissiveIntensity = night ? .85 : .3
  }, [mats, night])
  const haloBase = (night ? .42 : sunset ? .2 : .08) * (high ? 1.25 : 1)

  const vuL = useRef<T.Group>(null), vuR = useRef<T.Group>(null)
  const reels = useRef<(T.Mesh | null)[]>([])
  const presets = useRef<T.InstancedMesh>(null), leds = useRef<T.InstancedMesh>(null)
  const pressed = useRef<{ i: number; t: number } | null>(null), presetsDirty = useRef(true)
  const volumeKnob = useRef<T.Mesh>(null), tuneKnob = useRef<T.Mesh>(null)
  const root = useRef<T.Group>(null)
  const marquee = useRef(0), acc = useRef(0), clock = useRef(0), glowLevel = useRef(0)
  const initDial = dialFor(Math.max(0, RADIO_PRESETS.findIndex(s => s.id === audio?.stationId)))
  const sweep = useRef({ start: -1, from: initDial, to: initDial, station: audio?.stationId ?? '', tuning: false, dial: initDial })
  const scratch = useMemo(() => ({ m: new T.Matrix4(), v: new T.Vector3(), c: new T.Color(), last: 0 }), [])

  // Preset instance colours follow the active station / power state.
  const activeIndex = RADIO_PRESETS.findIndex(s => s.id === audio?.stationId), playing = !!audio?.playing
  useEffect(() => {
    const p = presets.current, l = leds.current; if (!p || !l) return
    for (let i = 0; i < RADIO_PRESETS.length; i++) {
      p.setColorAt(i, scratch.c.set(i === activeIndex ? '#f0d9a0' : '#cfd2d6'))
      l.setColorAt(i, scratch.c.set(i === activeIndex && playing ? VFD : '#3a2a1a'))
      l.setMatrixAt(i, scratch.m.makeTranslation(-.105 + i * .058, -.029, .0115))
    }
    if (p.instanceColor) p.instanceColor.needsUpdate = true
    if (l.instanceColor) l.instanceColor.needsUpdate = true
    l.instanceMatrix.needsUpdate = true; presetsDirty.current = true
  }, [activeIndex, playing, scratch])

  useFrame(({ camera, size }, dt) => {
    const tuning = !!controls?.tuning
    clock.current += dt
    // ---- Tuning sweep trigger: CockpitContext static burst, or any station change.
    const sw = sweep.current, id = audio?.stationId ?? ''
    if ((tuning && !sw.tuning) || id !== sw.station) {
      const to = dialFor(Math.max(0, RADIO_PRESETS.findIndex(s => s.id === id)))
      if (to !== sw.to || tuning) { sw.from = sw.dial; sw.to = to; sw.start = clock.current }
      sw.station = id
    }
    sw.tuning = tuning
    const duration = reduced.current ? .35 : .9
    const st = sw.start < 0 ? 1 : (clock.current - sw.start) / duration
    const sweeping = st < 1 || tuning
    const e = Math.min(1, st), eased = e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2
    sw.dial = sweeping ? sw.from + (sw.to - sw.from) * eased : sw.to

    // Analog needles: ballistic swing, pinned left when off.
    const target = (v: number) => -0.75 + Math.min(1.08, v * 1.2) * 1.5
    if (vuL.current) vuL.current.rotation.z += (-(playing ? target(pulse.vuL) : -0.75) - vuL.current.rotation.z) * Math.min(1, dt * 14)
    if (vuR.current) vuR.current.rotation.z += (-(playing ? target(pulse.vuR) : -0.75) - vuR.current.rotation.z) * Math.min(1, dt * 14)
    if (playing && !reduced.current) reels.current.forEach((r, i) => { if (r) r.rotation.z -= dt * (i ? 2.4 : 3.1) })
    if (volumeKnob.current) volumeKnob.current.rotation.z = 2.3 - (audio?.volume ?? 0) * 4.6
    if (tuneKnob.current && sweeping) tuneKnob.current.rotation.z -= dt * (reduced.current ? 2 : 5)

    // Physical preset press: depress the instance for 180 ms.
    const p = presets.current
    if (p) {
      const down = pressed.current && performance.now() - pressed.current.t < 180 ? pressed.current.i : -1
      if (presetsDirty.current || down >= 0 || pressed.current) {
        for (let i = 0; i < RADIO_PRESETS.length; i++) p.setMatrixAt(i, scratch.m.makeTranslation(-.105 + i * .058, -.04, .004 + (i === down ? -.006 : 0)))
        p.instanceMatrix.needsUpdate = true; presetsDirty.current = false
        if (down < 0) pressed.current = null
      }
    }

    // Restrained glow: a slow follow of overall energy (no strobing on kicks).
    glowLevel.current += ((playing ? .9 + pulse.energy * .25 : .7) - glowLevel.current) * Math.min(1, dt * 2)
    mats.halo.opacity = haloBase * glowLevel.current * (sweeping ? .85 : 1)

    if (DEV && clock.current - scratch.last > .5 && root.current) {
      scratch.last = clock.current
      root.current.getWorldPosition(scratch.v).project(camera)
      document.documentElement.dataset.cruiseHeadUnit = JSON.stringify({ x: Math.round((scratch.v.x * .5 + .5) * 1000) / 10, y: Math.round((.5 - scratch.v.y * .5) * 1000) / 10, w: size.width, h: size.height })
    }

    // Canvas redraw + texture upload is the radio's main cost; from outside the cabin it is a few pixels, so 2 Hz is plenty.
    const near = !!root.current && root.current.getWorldPosition(scratch.v).distanceToSquared(camera.position) < 4
    acc.current += dt; if (acc.current < (near ? 1 / 24 : 1 / 2)) return; const step = acc.current; acc.current = 0
    marquee.current += step * 90
    drawScreen(screen.ctx, mask, high, {
      station: audio?.station.name ?? 'BUENA ONDA', track: audio?.trackTitle || '', playing,
      loading: !!audio?.loading, error: audio?.error ?? null, muted: !!audio?.muted, volume: audio?.volume ?? 0,
      preset: Math.max(0, activeIndex), marquee: marquee.current, sweep: sweeping ? Math.min(1, st) : -1, dial: sw.dial, time: clock.current,
    })
    screen.t.needsUpdate = true
    drawEq(eq.ctx, playing); eq.t.needsUpdate = true
  })

  const act = (e: ThreeEvent<MouseEvent>, fn: () => void) => { e.stopPropagation(); fn() }
  return <group name="CockpitRadio" ref={root}>
    <mesh geometry={geo.chrome} material={mats.chrome} castShadow />
    <mesh geometry={geo.dark} material={mats.dark} />
    <mesh position={[-.03, .02, .003]} material={mats.vfd}><planeGeometry args={[.24, .062]} /></mesh>
    <mesh geometry={geo.vu} material={mats.vu} />
    {[0, 1].map(i => <group key={i} ref={i ? vuR : vuL} position={[.117, .024 - i * .033, .0042]}><mesh geometry={geo.needle} material={mats.needle} /></group>)}

    {/* Knobs: power/volume (left), tune/seek (right). Hit boxes are invisible (raycast still hits). */}
    {[-1, 1].map(side => <group key={side} position={[side * .168, .02, 0]}>
      <mesh ref={side < 0 ? volumeKnob : tuneKnob} geometry={geo.knob} material={mats.knob} />
      <mesh position-z={.02} visible={false} onPointerOver={() => hover(true)} onPointerOut={() => hover(false)}
        onClick={e => act(e, () => controls?.operateRadio(side < 0 ? 'power' : 'seek', 1))}
        onWheel={e => { if (side < 0) { e.stopPropagation(); controls?.operateRadio('volume', Math.max(0, Math.min(1, (audio?.volume ?? 0) - Math.sign(e.deltaY) * .05))) } }}>
        <boxGeometry args={[.05, .05, .04]} />
      </mesh>
    </group>)}

    {/* Chrome preset buttons (instanced) with amber LEDs for the active station */}
    <instancedMesh ref={presets} args={[geo.preset, mats.preset, RADIO_PRESETS.length]} name="CockpitPresets"
      onPointerOver={() => hover(true)} onPointerOut={() => hover(false)}
      onClick={e => act(e, () => { const i = e.instanceId ?? -1; const station = RADIO_PRESETS[i]; if (!station) return; pressed.current = { i, t: performance.now() }; controls?.operateRadio('preset', station.id) })} />
    <instancedMesh ref={leds} args={[geo.led, mats.led, RADIO_PRESETS.length]} />

    {/* Tape deck */}
    <mesh position={[-.03, -.1, .001]} material={mats.tape}><planeGeometry args={[.2, .05]} /></mesh>
    {[-1, 1].map((side, i) => <mesh key={side} geometry={geo.reel} material={mats.reel} position={[-.03 + side * .045, -.104, .006]} ref={m => { reels.current[i] = m }} />)}

    {/* Under-dash 7-band graphic EQ booster */}
    <mesh position={[0, -.22, .021]} material={mats.eq}><planeGeometry args={[.34, .042]} /></mesh>

    <mesh geometry={geo.glass} material={mats.glass} renderOrder={1} />
    <mesh geometry={geo.halo} material={mats.halo} renderOrder={2} />
  </group>
}

// Background + ghost segments (real VFDs show unlit cells) never change: draw them once.
let base: HTMLCanvasElement | null = null
function screenBase(W: number, H: number) {
  if (base) return base
  base = document.createElement('canvas'); base.width = W; base.height = H; const c = base.getContext('2d')!
  c.fillStyle = '#050302'; c.fillRect(0, 0, W, H)
  c.fillStyle = VFD_DIM
  for (let b = 0; b < BANDS; b++) for (let k = 0; k < SEGMENTS; k++) c.fillRect(40 + b * 24, 236 - k * 8, 18, 5)
  return base
}

type ScreenState = { station: string; track: string; playing: boolean; loading: boolean; error: string | null; muted: boolean; volume: number; preset: number; marquee: number; sweep: number; dial: number; time: number }

function drawScreen(c: CanvasRenderingContext2D, mask: HTMLCanvasElement, high: boolean, s: ScreenState) {
  const W = 1024, H = 256, tuning = s.sweep >= 0
  c.shadowBlur = 0
  c.drawImage(screenBase(W, H), 0, 0)
  c.textBaseline = 'alphabetic'
  const glow = (color: string, blur: number) => { c.fillStyle = color; if (high) { c.shadowColor = color; c.shadowBlur = blur } }

  if (tuning) {
    // Line 1: sweeping dial readout.
    glow(VFD, 12); c.font = `700 66px ${FONT}`; c.textAlign = 'left'
    c.fillText(s.dial.toFixed(1).padStart(5, ' '), 32, 76)
    c.shadowBlur = 0; c.font = `700 26px ${FONT}`; c.fillStyle = VFD_CYAN; c.fillText('TUNING', 252, 74)
    // Line 2: dial scale with a moving pointer.
    c.fillStyle = VFD_DIM; c.fillRect(32, 112, 560, 2)
    c.fillStyle = VFD; c.font = `700 16px ${FONT}`; c.textAlign = 'center'
    for (let f = 88; f <= 108; f += 2) { const x = 32 + ((f - DIAL_LO) / (DIAL_HI - DIAL_LO)) * 560; c.fillRect(x - 1, f % 4 === 0 ? 100 : 106, 2, f % 4 === 0 ? 12 : 6); if (f % 4 === 0) c.fillText(String(f), x, 132) }
    const px = 32 + ((s.dial - DIAL_LO) / (DIAL_HI - DIAL_LO)) * 560
    glow(VFD_CYAN, 10); c.fillRect(px - 2, 92, 4, 26); c.shadowBlur = 0
  } else {
    // Line 1: station + channel
    glow(s.error ? '#ff6a4d' : VFD, 12); c.font = `700 60px ${FONT}`; c.textAlign = 'left'
    c.fillText(s.station.toUpperCase().slice(0, 17), 32, 74)
    c.shadowBlur = 0
    // Line 2: scrolling track / status marquee
    c.fillStyle = VFD; c.font = `700 30px ${FONT}`
    const line = s.error ? s.error.toUpperCase() : s.loading ? 'CONNECTING TO SIGNAL' : s.playing ? (s.track ? s.track.toUpperCase() : 'ON AIR · ' + s.station.toUpperCase()) + '   ★   BUENA ONDA CRUISE   ★   ' : 'PRESS POWER TO RIDE'
    c.save(); c.beginPath(); c.rect(32, 96, 560, 40); c.clip()
    if (s.playing && line.length > 30) { const w = c.measureText(line).width; const x = 32 - (s.marquee % w); c.fillText(line, x, 126); c.fillText(line, x + w, 126) }
    else c.fillText(line.slice(0, 32), 32, 126)
    c.restore()
  }
  c.textAlign = 'right'; c.font = `700 34px ${FONT}`; c.fillStyle = VFD_CYAN
  c.fillText(`CH${s.preset + 1}`, 990, 50)
  c.font = `700 22px ${FONT}`
  c.fillText(tuning ? 'SEEK' : s.playing ? (s.muted ? 'MUTE' : 'STEREO') : s.loading ? 'SEEK' : 'STBY', 990, 82)
  // Volume ladder
  c.fillStyle = VFD_DIM; for (let k = 0; k < 16; k++) c.fillRect(640 + k * 22, 104, 16, 20)
  c.fillStyle = VFD_CYAN; for (let k = 0; k < Math.round(s.volume * 16); k++) c.fillRect(640 + k * 22, 104, 16, 20)
  // Spectrum with peak hold; while tuning, a soft scan bar crosses the bands instead.
  const scan = tuning ? s.sweep * (BANDS + 4) - 2 : -99
  for (let b = 0; b < BANDS; b++) {
    let lit: number
    if (tuning) { const d = Math.abs(b - scan); lit = d < 3 ? Math.round((1 - d / 3) * SEGMENTS * .8) : 0 }
    else lit = s.playing ? Math.round(pulse.spectrum[b] * SEGMENTS) : 0
    for (let k = 0; k < lit; k++) { c.fillStyle = tuning ? VFD_CYAN : k > 9 ? '#ff4f9a' : k > 6 ? '#ffd27a' : VFD; c.fillRect(40 + b * 24, 236 - k * 8, 18, 5) }
    if (s.playing && !tuning) { const pk = Math.min(SEGMENTS - 1, Math.round(pulse.peaks[b] * SEGMENTS)); c.fillStyle = VFD_CYAN; c.fillRect(40 + b * 24, 236 - pk * 8, 18, 3) }
  }
  c.fillStyle = VFD; c.font = `700 20px ${FONT}`; c.textAlign = 'left'
  // Honest source label: never claim live analysis for the synthetic groove.
  c.fillText(tuning ? 'TUNING' : pulse.source === 'live' ? 'LIVE SPECTRUM' : pulse.source === 'groove' ? 'AUTO RHYTHM' : '', 640, 164)
  c.fillStyle = '#b8792e'; c.fillText('LOUD · AUTO REV · MIAMI', 640, 204)
  if (s.playing && !tuning) { c.fillStyle = '#ff4f9a'; c.globalAlpha = .55 + pulse.kick * .35; c.beginPath(); c.arc(990, 198, 8, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1 }
  c.drawImage(mask, 0, 0)
}

const EQ_BANDS = [1, 4, 7, 10, 13, 17, 21]
function drawEq(c: CanvasRenderingContext2D, playing: boolean) {
  c.fillStyle = '#08080a'; c.fillRect(0, 0, 512, 128)
  for (let i = 0; i < 7; i++) {
    const v = playing ? pulse.spectrum[EQ_BANDS[i]] : .05
    for (let k = 0; k < 10; k++) {
      const on = k < Math.round(v * 10)
      c.fillStyle = on ? (k > 7 ? '#ff3b5c' : k > 5 ? '#ffd27a' : '#5dff9a') : '#151a16'
      c.fillRect(36 + i * 66, 112 - k * 10, 46, 7)
    }
  }
  c.fillStyle = '#9aa0a8'; c.font = '700 11px monospace'; c.textAlign = 'center'
  ;['60', '150', '400', '1K', '2.4K', '6K', '15K'].forEach((l, i) => c.fillText(l, 59 + i * 66, 126))
}
