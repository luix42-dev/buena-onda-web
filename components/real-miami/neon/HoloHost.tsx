'use client'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as T from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { NightState } from '../nightdrive/state'
import { roadSample } from '../nightdrive/road'
import { HOST_LINES, HOST_TIMING } from '@/lib/real-miami/neon'

/** VESPER, an original holographic host (CC0 Quaternius figure under a hologram shader).
 * She materialises out of nothing at the roadside or towering between buildings, turns to the
 * car, whispers one line while the radio ducks, then glitches out. */
const RIDE_LEAD = 10, RIDE_SECONDS = 3.4
export type HostLine = typeof HOST_LINES[number]
export type HostEvent = { phase: 'speak'; line: HostLine; giant: boolean } | { phase: 'gone' }

function holoMaterial(uniforms: { uTime: { value: number }; uFade: { value: number } }) {
  const material = new T.MeshBasicMaterial({ color: '#7fe8ff', transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide, fog: false })
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vY; varying vec3 vVN; uniform float uTime; uniform float uFade;')
      .replace('#include <project_vertex>', `
      // Horizontal glitch slices while she forms and dissolves.
      float slice = step(.92, fract(sin(floor(transformed.y * 18. + uTime * 30.) * 91.7) * 4375.5));
      transformed.x += slice * (1. - uFade) * .35 * sin(uTime * 80.);
      #include <project_vertex>
      vY = (modelMatrix * vec4(transformed, 1.)).y; vVN = normalize(normalMatrix * objectNormal);`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vY; varying vec3 vVN; uniform float uTime; uniform float uFade;')
      .replace('#include <opaque_fragment>', `
      float scan = .62 + .38 * sin(vY * 140. - uTime * 9.);
      float rim = pow(1. - abs(normalize(vVN).z), 1.6);
      float flicker = .86 + .14 * sin(uTime * 37.) * sin(uTime * 13.);
      vec3 col = mix(vec3(.45,.9,1.), vec3(1.,.45,.85), rim * .65);
      float a = (.18 + rim * .75) * scan * flicker * uFade;
      gl_FragColor = vec4(col * (1.2 + rim), a);`)
  }
  return material
}

/** `giantEvery`: every Nth appearance is skyline-scale (Neon Run: 3; Look v2 Retrowave: 2, alternating
 * between straddling the avenue and towering beside it, turning to watch the car pass). */
export default function HoloHost({ state, enabled, onEvent, giantEvery = 3, order }: { state: MutableRefObject<NightState>; enabled: boolean; onEvent: (event: HostEvent) => void; giantEvery?: number; order?: readonly number[] }) {
  const figure = useGLTF('/real-miami/people/npc_woman_dress.glb'), anims = useGLTF('/real-miami/people/npc_anims_female.glb')
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFade: { value: 0 } }), [])
  const host = useMemo(() => {
    const root = cloneSkinned(figure.scene) as T.Group, material = holoMaterial(uniforms)
    root.traverse(o => { if (o instanceof T.Mesh) { o.material = material; o.frustumCulled = false; o.castShadow = false } })
    // Same calibration as the Ocean Drive crowd (.352 = life size); a hologram stands a little taller.
    // Box3 of a skinned bind pose is unreliable for these rigs, so no auto-fit.
    root.scale.setScalar(.352 * 1.18)
    const holder = new T.Group(); holder.add(root); holder.visible = false
    // A soft pool of light under her feet, and a thin projection beam from below.
    const pool = new T.Mesh(new T.CircleGeometry(1.1, 32), new T.MeshBasicMaterial({ color: '#58d8ff', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = .03; holder.add(pool)
    const mixer = new T.AnimationMixer(root), idle = anims.animations.find(a => a.name === 'Idle'), wave = anims.animations.find(a => a.name === 'Stand')
    if (idle) mixer.clipAction(idle).play()
    return { holder, root, material, pool, mixer, wave: wave ? mixer.clipAction(wave) : null }
  }, [figure.scene, anims.animations, uniforms])
  useEffect(() => () => { host.material.dispose(); host.pool.geometry.dispose(); (host.pool.material as T.Material).dispose(); host.mixer.stopAllAction() }, [host])
  // ?hostFirst=<seconds> brings the first appearance forward for captures.
  const show = useRef({ next: Number(new URLSearchParams(location.search).get('hostFirst')) || HOST_TIMING.firstAfter, until: 0, start: 0, at: 0, lateral: 0, scale: 1, line: 0, spoke: false, giant: false })
  useFrame((frame, delta) => {
    const s = state.current, sh = show.current, now = s.elapsed
    uniforms.uTime.value = frame.clock.elapsedTime
    if (!enabled || s.paused) { if (host.holder.visible) { host.holder.visible = false; onEvent({ phase: 'gone' }) } return }
    if (!host.holder.visible && now >= sh.next) {
      // Every third appearance she straddles the avenue ahead, forty metres tall, and the car drives
      // through her. Otherwise she forms on the sidewalk on the car's side, rides along just ahead while she speaks, then stays put and the car passes her.
      sh.giant = (sh.line % giantEvery) === giantEvery - 1; sh.at = s.distance + (sh.giant ? (giantEvery === 2 ? 270 : 170) : RIDE_LEAD)
      const beside = sh.giant && giantEvery === 2 && Math.floor(sh.line / 2) % 2 === 1
      sh.lateral = beside ? (sh.line % 4 < 2 ? 1 : -1) * 10 : sh.giant ? 0 : (s.lateral >= 0 ? 1 : -1) * 7.6
      // Retrowave giants are ~73 m: taller than the avenue's towers, towering over the curb when she stands beside the avenue.
      sh.scale = sh.giant ? (giantEvery === 2 ? 40 : 22) : 1.15; sh.start = now; sh.until = now + HOST_TIMING.stay + (sh.giant ? (giantEvery === 2 ? 9 : 3) : 0); sh.spoke = false
      host.holder.visible = true; uniforms.uFade.value = 0
    }
    if (!host.holder.visible) return
    if (!sh.giant && now - sh.start < RIDE_SECONDS) sh.at = s.distance + RIDE_LEAD
    const origin = roadSample(s.distance, s.seed), p = roadSample(sh.at, s.seed)
    host.holder.position.set(p.x - origin.x + Math.cos(p.yaw) * sh.lateral, p.y - origin.y + (sh.giant ? 0 : .16), p.z - origin.z - Math.sin(p.yaw) * sh.lateral)
    host.holder.scale.setScalar(sh.scale)
    // Face the approaching car.
    const toCar = Math.atan2(-host.holder.position.x, -host.holder.position.z); host.holder.rotation.y = toCar
    const remaining = sh.until - now, age = now - sh.start
    uniforms.uFade.value = T.MathUtils.clamp(Math.min(age / .9, remaining / 1.1), 0, 1)
    ;(host.pool.material as T.MeshBasicMaterial).opacity = uniforms.uFade.value * .35
    host.mixer.update(Math.min(delta, .05))
    if (!sh.spoke && age > .8) { sh.spoke = true; onEvent({ phase: 'speak', line: HOST_LINES[order ? order[sh.line % order.length] : sh.line % HOST_LINES.length], giant: sh.giant }) }
    // Passed her, or time is up: dissolve and schedule the next one.
    // A giant beside the road keeps watching as the car passes; only one the car drives through dissolves on contact.
    if (s.distance > sh.at + (Math.abs(sh.lateral) > 9 ? 60 : 4) && remaining > .7) sh.until = now + .7
    if (remaining <= 0) {
      host.holder.visible = false; onEvent({ phase: 'gone' }); sh.line++
      sh.next = now + HOST_TIMING.every + (Math.sin(sh.line * 12.9898) * .5 + .5) * HOST_TIMING.jitter
    }
  })
  return <primitive object={host.holder} dispose={null} />
}
