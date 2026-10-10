'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useFBO } from '@react-three/drei'
import * as T from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import CockpitRadio from './CockpitRadio'
import { pulse } from './pulse'
import { mat, mergeParts, type Part } from './cockpit/merge'
import { badgeTex, beamTex, canvasTex, gaugeAtlas, GAUGE_CELL, glowTex, leatherTex, palmTex, woodTex } from './cockpit/textures'
import Hands from './cockpit/Hands'
import { useReducedMotion } from './cockpit/motion'

/**
 * "Ocean Drive '84" — a cream classic with the roof cut away at the beltline.
 * Exterior: existing CC0 classic-traffic.glb, clipped above y = BELT, clear-coated.
 * Interior: authored here — tuck-and-roll leather, walnut fascia, chrome-ringed gauges,
 * wood-rim wheel with optional gloved hands, the CockpitRadio head unit, a live rear-view
 * mirror (Desktop) and a palm air freshener. Static interior parts are merged per material
 * class (one draw call each); only moving parts stay separate.
 * Night: instrument backlight, under-dash neon spill and a headlight pool on the road
 * (additive decal on Mobile, plus one shadowless SpotLight on Desktop). No postprocessing.
 * Coordinates: car-local, front = -Z, ground = 0. Driver sits at x = DRIVER_X.
 */
export const DRIVER_X = -.4
/** Driver eye point (car-local). Slightly higher and further back than pass 2 for a clearer windshield. */
export const CONVERTIBLE_EYE: [number, number, number] = [DRIVER_X, 1.27, .36]
const BELT = 1.08
const Z_OFFSET = -.2 // model is authored slightly rearward; centre it on the car origin

type Drive = MutableRefObject<{ speed: number; paused: boolean; wheel?: number }>

// Steering column frame: wheel plane is XY, +Z faces the driver.
const WHEEL_BASE = mat([DRIVER_X, .93, -.3], [-1.15, 0, 0], .88)
const WHEEL_GAIN = 1.7
const RIM = .19, RIM_TUBE = .019
const ELBOWS: [[number, number, number], [number, number, number]] = [[DRIVER_X - .23, .83, -.08], [DRIVER_X + .21, .83, -.08]]
const GAUGES = [['speed', -.53, .87, .09], ['rpm', -.3, .87, .09], ['fuel', -.715, .915, .038], ['temp', -.715, .825, .038]] as const
const GAUGE_Z = -.518
// Windshield: raked chrome frame; header sits above the driver's view.
const SCREEN = { cowlY: 1.06, cowlZ: -.98, topY: 1.66, topZ: -.72, x: .79 }
const RAKE = Math.atan2(SCREEN.topZ - SCREEN.cowlZ, SCREEN.topY - SCREEN.cowlY)
const SCREEN_LEN = Math.hypot(SCREEN.topZ - SCREEN.cowlZ, SCREEN.topY - SCREEN.cowlY)
const MIRROR_AT: [number, number, number] = [.02, SCREEN.topY - .095, SCREEN.topZ + .03]

/** Drops triangles whose centroid lies inside the cabin volume (model space, before Z_OFFSET). */
function withoutCabinProxy(source: T.BufferGeometry, matrix: T.Matrix4) {
  const g = source.clone(); const pos = g.getAttribute('position'); const v = new T.Vector3(), c = new T.Vector3()
  const index = g.getIndex(); const count = index ? index.count : pos.count; const keep: number[] = []
  for (let i = 0; i < count; i += 3) {
    c.set(0, 0, 0)
    for (let k = 0; k < 3; k++) { const vi = index ? index.getX(i + k) : i + k; c.add(v.fromBufferAttribute(pos, vi).applyMatrix4(matrix)) }
    c.multiplyScalar(1 / 3)
    const cabin = Math.abs(c.x) < .8 && c.z > -.8 && c.z < 1.52 && c.y > .55
    if (!cabin) for (let k = 0; k < 3; k++) keep.push(index ? index.getX(i + k) : i + k)
  }
  g.setIndex(keep); return g
}

/** Builds every static interior batch once. All parts in car-local space unless a parent matrix is given. */
function buildInterior() {
  const leather: Part[] = [], chrome: Part[] = [], matte: Part[] = [], gaugeFaces: Part[] = [], gaugeGlass: Part[] = [], needles: Part[] = []
  // Cabin tub, doors, armrests
  matte.push({ g: new T.BoxGeometry(1.66, .04, 2.3), m: mat([0, .44, .3]), c: '#4a2724' })
  for (const side of [-1, 1]) {
    leather.push({ g: new T.BoxGeometry(.06, .6, 2.15), m: mat([side * .84, .78, .25]), c: '#f4e9d2' })
    leather.push({ g: new RoundedBoxGeometry(.07, .06, .5, 2, .02), m: mat([side * .8, .86, .1]), c: '#c9a77e' })
    chrome.push({ g: new T.BoxGeometry(.11, .035, 2.18), m: mat([side * .84, 1.075, .25]) })
    // Side mirror: stalk, housing, glass
    const sm = mat([side * .9, 1.13, -.62])
    chrome.push({ g: new T.CylinderGeometry(.012, .012, .09, 10), m: mat([0, 0, 0], [0, 0, side * .2], 1, sm) })
    chrome.push({ g: new T.CylinderGeometry(.045, .045, .022, 20), m: mat([side * .03, .06, 0], [Math.PI / 2, 0, 0], 1, sm) })
    chrome.push({ g: new T.CircleGeometry(.041, 20), m: mat([side * .03, .06, .012], [0, 0, 0], 1, sm), c: '#7f93a3' })
    // A-pillar
    chrome.push({ g: new T.BoxGeometry(.024, SCREEN_LEN, .03), m: mat([side * SCREEN.x, (SCREEN.cowlY + SCREEN.topY) / 2, (SCREEN.cowlZ + SCREEN.topZ) / 2], [RAKE, 0, side * -.03]) })
  }
  chrome.push({ g: new T.BoxGeometry(SCREEN.x * 2 + .03, .026, .034), m: mat([0, SCREEN.topY, SCREEN.topZ]) })
  chrome.push({ g: new T.BoxGeometry(SCREEN.x * 2, .02, .03), m: mat([0, SCREEN.cowlY, SCREEN.cowlZ]) })
  // Seats
  for (const [z, row] of [[.45, 0], [1.35, 1]] as const) {
    leather.push({ g: new RoundedBoxGeometry(1.56, .15, .56, 3, .05), m: mat([0, .6, z]), c: '#f4e9d2' })
    for (const x of row ? [0] : [DRIVER_X, -DRIVER_X]) leather.push({ g: new RoundedBoxGeometry(row ? 1.56 : .7, .58, .14, 3, .06), m: mat([x, .95, z + .3], [-.16, 0, 0]), c: '#f4e9d2' })
  }
  // Dash: dark padded glare-shield top (keeps the eye on the road, no windshield glare), binnacle, lower dash
  matte.push({ g: new RoundedBoxGeometry(1.66, .08, .36, 3, .035), m: mat([0, 1.0, -.72]), c: '#5a3d30' })
  matte.push({ g: new RoundedBoxGeometry(.6, .07, .13, 3, .03), m: mat([DRIVER_X, 1.02, -.545]), c: '#4e3428' })
  leather.push({ g: new T.BoxGeometry(1.62, .18, .2), m: mat([0, .64, -.62]), c: '#e7d8ba' })
  chrome.push({ g: new T.BoxGeometry(1.62, .012, .006), m: mat([0, .742, -.519]) })
  chrome.push({ g: new T.BoxGeometry(1.62, .012, .006), m: mat([0, .982, -.519]) })
  // Gauges: atlas-mapped faces, chrome bezels, glass, static fuel/temp needles
  for (const [kind, x, y, r] of GAUGES) {
    const [col, row] = GAUGE_CELL[kind]
    gaugeFaces.push({ g: new T.CircleGeometry(r, 48), m: mat([x, y, GAUGE_Z]), uv: [col * .5, row * .5, .5, .5] })
    chrome.push({ g: new T.TorusGeometry(r + .005, .0065, 10, 48), m: mat([x, y, GAUGE_Z + .004]) })
    chrome.push({ g: new T.CylinderGeometry(r + .012, r + .012, .012, 40, 1, true), m: mat([x, y, GAUGE_Z - .002], [Math.PI / 2, 0, 0]), c: '#9c9fa5' })
    gaugeGlass.push({ g: new T.CircleGeometry(r + .003, 40), m: mat([x, y, GAUGE_Z + .008]) })
    if (kind === 'fuel' || kind === 'temp') {
      const nm = mat([x, y, GAUGE_Z + .003], [0, 0, kind === 'fuel' ? .5 : -.25])
      needles.push({ g: new T.BoxGeometry(.003, r * .7, .001).translate(0, r * .35, 0), m: nm, c: '#ff7a1a' })
      needles.push({ g: new T.CircleGeometry(.007, 12), m: mat([0, 0, .0006], [0, 0, 0], 1, nm), c: '#202226' })
    }
  }
  // Steering column (static part of the wheel assembly)
  chrome.push({ g: new T.CylinderGeometry(.024, .032, .32, 14), m: mat([0, 0, -.16], [Math.PI / 2, 0, 0], 1, WHEEL_BASE) })
  // Rear-view mirror housing + stalk (the reflective surface stays live/separate)
  const rm = mat(MIRROR_AT)
  matte.push({ g: new T.BoxGeometry(.012, .1, .012), m: mat([0, .07, -.01], [0, 0, 0], 1, rm), c: '#1e1e1e' })
  matte.push({ g: new RoundedBoxGeometry(.27, .08, .03, 2, .012), m: mat([0, 0, -.012], [0, 0, 0], 1, rm), c: '#1c1c1c' })
  // Hood ornament
  chrome.push({ g: new T.ConeGeometry(.02, .11, 4), m: mat([0, 1.0, -2.25], [-.4, 0, 0]) })
  return { leather: mergeParts(leather), chrome: mergeParts(chrome), matte: mergeParts(matte), gaugeFaces: mergeParts(gaugeFaces), gaugeGlass: mergeParts(gaugeGlass), needlesStatic: mergeParts(needles) }
}

function buildWheel() {
  const spokes: Part[] = []
  for (const a of [0, 1.75, -1.75]) spokes.push({ g: new T.BoxGeometry(.018, .15, .006), m: mat([-Math.sin(a) * -.105, -Math.cos(a) * .105, 0], [0, 0, a]) })
  spokes.push({ g: new T.CylinderGeometry(.052, .056, .03, 32), m: mat([0, 0, .01], [Math.PI / 2, 0, 0]) })
  spokes.push({ g: new T.TorusGeometry(.125, .0045, 8, 64), m: mat([0, 0, .012]) })
  const needle: Part[] = [
    { g: new T.BoxGeometry(.0042, .072, .001).translate(0, .03, 0), c: '#ff7a1a' },
    { g: new T.BoxGeometry(.006, .018, .001).translate(0, -.012, 0), c: '#ff7a1a' },
    { g: new T.CircleGeometry(.011, 16), m: mat([0, 0, .0008]), c: '#202226' },
  ]
  return { rim: new T.TorusGeometry(RIM, RIM_TUBE, 14, 72), chrome: mergeParts(spokes), badge: new T.CircleGeometry(.04, 32), needle: mergeParts(needle) }
}

export default function ConvertibleCar({ camera: view, drive, timeOfDay, high, onReady, hands = true }: { camera: 'chase' | 'driver' | string; drive: Drive; timeOfDay: 'day' | 'sunset' | 'night'; high: boolean; onReady?: () => void; hands?: boolean }) {
  const night = timeOfDay === 'night', sunset = timeOfDay === 'sunset'
  const { gl } = useThree()
  const reduced = useReducedMotion()
  const gltf = useGLTF('/cruise/traffic/classic-traffic.glb', false, true)
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const belt = useMemo(() => new T.Plane(new T.Vector3(0, -1, 0), BELT), [])
  const body = useMemo(() => {
    const scene = gltf.scene.clone(true); const owned: T.Material[] = [], paints: { mesh: T.Mesh; high: T.Material; low: T.Material }[] = []
    scene.updateMatrixWorld(true)
    scene.traverse(o => {
      if (!(o instanceof T.Mesh)) return
      const src = o.material as T.MeshStandardMaterial; const name = src.name || ''
      // The LOD model has a solid low-detail interior proxy where our cabin goes; cut it out once.
      o.geometry = withoutCabinProxy(o.geometry, o.matrixWorld)
      let m: T.Material
      if (/paint/i.test(name)) {
        // Clearcoat paint on Desktop only, like the wood: Physical is the costliest shader on screen in both cameras.
        m = new T.MeshPhysicalMaterial({ color: '#f1e5c9', roughness: .32, metalness: .05, clearcoat: 1, clearcoatRoughness: .08, side: T.DoubleSide, clippingPlanes: [belt] })
        const low = new T.MeshStandardMaterial({ color: '#f1e5c9', roughness: .26, metalness: .05, side: T.DoubleSide, clippingPlanes: [belt] })
        owned.push(low); paints.push({ mesh: o, high: m, low })
      }
      else if (/chrome/i.test(name)) m = new T.MeshStandardMaterial({ color: '#e9ecef', metalness: 1, roughness: .14, clippingPlanes: [belt] })
      else if (/glaz/i.test(name)) { o.visible = false; return }
      else if (/rear/i.test(name)) m = new T.MeshStandardMaterial({ color: '#c3142c', emissive: '#ff1f3d', emissiveIntensity: .6, roughness: .3 })
      else { m = src.clone(); (m as T.MeshStandardMaterial).clippingPlanes = [belt] }
      owned.push(m); o.material = m; o.castShadow = true; o.receiveShadow = true
    })
    const box = new T.Box3().setFromObject(scene)
    return { scene, owned, paints, front: box.min.z + Z_OFFSET }
  }, [gltf.scene, belt])
  useEffect(() => () => { body.owned.forEach(m => m.dispose()); body.scene.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose() }) }, [body])
  useEffect(() => { body.paints.forEach(p => { p.mesh.material = high ? p.high : p.low }) }, [body, high])
  useEffect(() => { onReady?.() }, [onReady])

  const tex = useMemo(() => ({ wood: woodTex(), leather: leatherTex(), gauges: gaugeAtlas(), palm: palmTex(), badge: badgeTex(), glow: glowTex(), beam: beamTex() }), [])
  const geo = useMemo(() => ({ ...buildInterior(), wheel: buildWheel() }), [])
  // Neon strip + its spill on the fascia underside and the footwell carpet: one additive draw.
  const neonGlow = useMemo(() => mergeParts([
    { g: new T.PlaneGeometry(1.8, .1), m: mat([0, .545, -.512]) },
    { g: new T.PlaneGeometry(1.7, .9), m: mat([0, .463, -.2], [-Math.PI / 2, 0, 0]) },
  ]), [])

  const mats = useMemo(() => ({
    leather: new T.MeshStandardMaterial({ map: tex.leather, vertexColors: true, roughness: .62 }),
    chrome: new T.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: .13 }),
    matte: new T.MeshStandardMaterial({ vertexColors: true, roughness: .85 }),
    gauges: new T.MeshStandardMaterial({ map: tex.gauges, emissiveMap: tex.gauges, emissive: '#ffe6c0', roughness: .4 }),
    glass: new T.MeshStandardMaterial({ color: '#dfe9ee', transparent: true, opacity: .1, roughness: .03, metalness: .2, depthWrite: false }),
    needle: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    badge: new T.MeshStandardMaterial({ map: tex.badge, emissiveMap: tex.badge, roughness: .35, metalness: .2 }),
    neon: new T.MeshBasicMaterial({ color: '#ff4f9a', toneMapped: false }),
    neonGlow: new T.MeshBasicMaterial({ map: tex.glow, color: '#ff4f9a', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }),
    beam: new T.MeshBasicMaterial({ map: tex.beam, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    windshield: new T.MeshStandardMaterial({ color: '#cfe8ee', transparent: true, opacity: .06, roughness: 0, metalness: .1, depthWrite: false, side: T.DoubleSide }),
    freshener: new T.MeshStandardMaterial({ map: tex.palm, transparent: true, alphaTest: .4, side: T.DoubleSide }),
  }), [tex])
  // Wood gets clearcoat on Desktop only (Physical is the costliest shader in the cabin).
  const wood = useMemo(() => high
    ? new T.MeshPhysicalMaterial({ map: tex.wood, clearcoat: 1, clearcoatRoughness: .07, roughness: .42 })
    : new T.MeshStandardMaterial({ map: tex.wood, roughness: .3, metalness: .05 }), [high, tex])
  useEffect(() => () => wood.dispose(), [wood])
  useEffect(() => () => {
    Object.values(tex).forEach(t => t.dispose()); Object.values(mats).forEach(m => m.dispose()); neonGlow.dispose()
    Object.values(geo).forEach(g => g instanceof T.BufferGeometry ? g.dispose() : Object.values(g).forEach(x => x.dispose()))
  }, [tex, mats, geo, neonGlow])

  // Time-of-day lighting (no per-frame work).
  useEffect(() => {
    mats.gauges.emissiveIntensity = night ? 1.0 : sunset ? .22 : .06
    mats.badge.emissive.set('#2bd3a0'); mats.badge.emissiveIntensity = night ? .5 : 0
  }, [mats, night, sunset])
  const neonBase = night ? 1 : sunset ? .35 : 0
  const beamBase = night ? (high ? .5 : .7) : sunset ? .12 : 0
  useEffect(() => { mats.beam.opacity = beamBase }, [mats, beamBase])
  const neonColor = useMemo(() => new T.Color('#ff4f9a'), [])

  const spotTarget = useMemo(() => new T.Object3D(), [])
  const wheel = useRef<T.Group>(null), speedNeedle = useRef<T.Group>(null), rpmNeedle = useRef<T.Group>(null), freshener = useRef<T.Group>(null)
  const swing = useRef({ a: 0, v: 0, bass: 0 })
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, .05), d = drive.current
    const speed = d.paused ? 0 : d.speed, steer = d.wheel ?? 0
    if (wheel.current) wheel.current.rotation.z = -steer * WHEEL_GAIN
    // Speed in MPH on a 0–120 dial; tach idles at 800 rpm and breathes gently with the bass.
    const mph = speed * 2.237
    if (speedNeedle.current) speedNeedle.current.rotation.z = -(Math.PI * .75 + (mph / 120) * Math.PI * 1.5) + Math.PI / 2
    const rpm = .8 + speed * .32 + (reduced.current ? 0 : pulse.bass * .35 + pulse.kick * .25)
    if (rpmNeedle.current) rpmNeedle.current.rotation.z += ((-(Math.PI * .75 + (rpm / 8) * Math.PI * 1.5) + Math.PI / 2) - rpmNeedle.current.rotation.z) * Math.min(1, dt * 6)
    // Air freshener pendulum: lateral acceleration from steering, a soft nudge on strong kicks.
    const s = swing.current; const force = -steer * speed * .09 + (!reduced.current && pulse.kick > .7 ? .05 * Math.sin(pulse.time * 13) : 0)
    s.v += (force - s.a * 9 - s.v * 1.6) * dt; s.a += s.v * dt
    if (freshener.current) freshener.current.rotation.z = s.a
    // Under-dash neon: slow follow of the bass, ±12% around the time-of-day level. No strobing.
    s.bass += ((reduced.current ? .5 : pulse.bass) - s.bass) * Math.min(1, dt * 3)
    const neon = neonBase * (.88 + s.bass * .24)
    mats.neon.color.copy(neonColor).multiplyScalar(.5 + neon * (high ? 1.5 : 1.2))
    mats.neonGlow.opacity = neon * (high ? .55 : .45)
  })

  const beamLength = 18
  return <group name="OceanDriveConvertible">
    <group position-z={Z_OFFSET}><primitive object={body.scene} /></group>

    {/* Static interior batches */}
    <mesh geometry={geo.leather} material={mats.leather} castShadow receiveShadow />
    <mesh geometry={geo.chrome} material={mats.chrome} castShadow />
    <mesh geometry={geo.matte} material={mats.matte} receiveShadow />
    <mesh geometry={geo.gaugeFaces} material={mats.gauges} />
    <mesh geometry={geo.needlesStatic} material={mats.needle} />
    <mesh position={[0, .86, -.535]} material={wood}><boxGeometry args={[1.62, .24, .03]} /></mesh>

    {/* Sweeping needles (speed, tach) */}
    {GAUGES.slice(0, 2).map(([kind, x, y]) => <group key={kind} ref={kind === 'speed' ? speedNeedle : rpmNeedle} position={[x, y, GAUGE_Z + .003]}>
      <mesh geometry={geo.wheel.needle} material={mats.needle} scale={1.15} />
    </group>)}
    <mesh geometry={geo.gaugeGlass} material={mats.glass} renderOrder={1} />

    {/* Under-dash neon */}
    <mesh position={[0, .545, -.52]} material={mats.neon} visible={neonBase > 0}><boxGeometry args={[1.5, .008, .008]} /></mesh>
    <mesh geometry={neonGlow} material={mats.neonGlow} visible={neonBase > 0} renderOrder={2} />

    {/* The radio, centre stack */}
    <group position={[.06, .925, -.515]} scale={1.22}><CockpitRadio night={night} sunset={sunset} high={high} /></group>

    {/* Wood-rim wheel on a chrome column, optional gloved hands */}
    <group position={[DRIVER_X, .93, -.3]} rotation-x={-1.15} scale={.88}>
      <group ref={wheel} name="ConvertibleSteeringWheel">
        <mesh geometry={geo.wheel.rim} material={wood} castShadow />
        <mesh geometry={geo.wheel.chrome} material={mats.chrome} />
        <mesh geometry={geo.wheel.badge} material={mats.badge} position-z={.0255} />
      </group>
      {hands && <Hands rim={RIM} tube={RIM_TUBE} base={WHEEL_BASE} drive={drive} gain={WHEEL_GAIN} elbows={ELBOWS} />}
    </group>

    {/* Windshield glass between the chrome frame */}
    <mesh position={[0, (SCREEN.cowlY + SCREEN.topY) / 2, (SCREEN.cowlZ + SCREEN.topZ) / 2]} rotation-x={RAKE} material={mats.windshield} renderOrder={1}><planeGeometry args={[SCREEN.x * 2, SCREEN_LEN]} /></mesh>

    <RearViewMirror active={view === 'driver' && high} />
    <group ref={freshener} position={[.05, MIRROR_AT[1] - .03, MIRROR_AT[2] + .025]}>
      <mesh position={[0, -.1125, 0]} material={mats.freshener}><planeGeometry args={[.075, .225]} /></mesh>
    </group>

    {/* Headlights: additive light pool on the road ahead (all qualities) + one shadowless spot (Desktop). */}
    <mesh position={[0, .04, body.front - beamLength / 2 + .4]} rotation-x={-Math.PI / 2} material={mats.beam} visible={beamBase > 0} renderOrder={1}>
      <planeGeometry args={[5.2, beamLength]} />
    </mesh>
    {high && <>
      <primitive object={spotTarget} position={[0, 0, body.front - 14]} />
      <spotLight position={[0, .78, body.front + .1]} target={spotTarget} color="#ffe6c2" intensity={night ? 26 : sunset ? 4 : 0} distance={34} decay={1.3} angle={.52} penumbra={.75} />
    </>}
  </group>
}

/** Real reflection on desktop: a small render target from behind the windshield, every other frame. */
function RearViewMirror({ active }: { active: boolean }) {
  const fbo = useFBO(active ? 384 : 1, active ? 112 : 1, { samples: 0 })
  const cam = useMemo(() => new T.PerspectiveCamera(38, 384 / 112, .1, 260), [])
  const root = useRef<T.Group>(null), surface = useRef<T.Mesh>(null), frame = useRef(0)
  const flip = useMemo(() => new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.PI), [])
  const fallback = useMemo(() => canvasTex(256, 64, c => { const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#d0548f'); g.addColorStop(.6, '#ff8f52'); g.addColorStop(1, '#2a2430'); c.fillStyle = g; c.fillRect(0, 0, 256, 64) }), [])
  useEffect(() => { fbo.texture.wrapS = T.RepeatWrapping; fbo.texture.repeat.x = -1; fbo.texture.offset.x = 1 }, [fbo])
  useEffect(() => () => fallback.dispose(), [fallback])
  useFrame(({ gl, scene }) => {
    if (!active || !root.current || !surface.current || ++frame.current % 2) return
    root.current.updateWorldMatrix(true, false)
    root.current.matrixWorld.decompose(cam.position, cam.quaternion, cam.scale)
    cam.quaternion.multiply(flip); cam.scale.set(1, 1, 1)
    cam.rotateX(-.06); cam.updateMatrixWorld()
    surface.current.visible = false
    const previous = gl.getRenderTarget(); gl.setRenderTarget(fbo); gl.render(scene, cam); gl.setRenderTarget(previous)
    surface.current.visible = true
  })
  return <group ref={root} position={MIRROR_AT}>
    <mesh ref={surface} position-z={.004}><planeGeometry args={[.25, .065]} /><meshBasicMaterial map={active ? fbo.texture : fallback} /></mesh>
  </group>
}
