'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as T from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { NightState } from '../nightdrive/state'
import { pulse } from '../master/pulse'
import landmarkRegistry from '../../../public/real-miami/miami/landmarks.json'

/**
 * People on Ocean Drive. CC0 Quaternius characters (see public/real-miami/people/LICENSE.txt),
 * one shared 31-bone skeleton family, clips shared by bone name.
 * - Each NPC's per-material colors are baked into a vertex-color attribute so every
 *   person is ONE draw call with one shared material.
 * - World-fixed vignettes on the real sidewalks / Lummus Park promenade. Paths run
 *   parallel to the street; nobody ever crosses the roadway.
 * - Mixers only tick within ACTIVE_RADIUS of the car; beyond VISIBLE_RADIUS the
 *   person is hidden (fog has already absorbed them by then, so no near pop-in).
 */
const BASE = '/real-miami/people/'
const CHARACTERS = ['npc_man_tee', 'npc_man_longsleeve', 'npc_man_suit', 'npc_woman_dress', 'npc_woman_tank', 'npc_woman_jacket'] as const
type Character = typeof CHARACTERS[number]
type Clip = 'Idle' | 'Walk' | 'Run' | 'Clap'
const VISIBLE_RADIUS = 110, ACTIVE_RADIUS = 75
const SCALE = { man: .36, woman: .352 }

// Period Miami wardrobe: linen, pastel, tank tops, white sneakers.
const TOPS = ['#f4c6c8', '#bfe3d5', '#f5e3a8', '#cfc4e8', '#b8dbea', '#f6d1ae', '#f4f1e6', '#e88f86', '#7fc4c0']
const BOTTOMS = ['#efe8d8', '#d9cdb3', '#c7b99c', '#f6f3ea', '#9fb3c4', '#8c9a86']
const SKIN = ['#f1c9a5', '#d9a77c', '#c58c5e', '#9b6640', '#7a4b2c', '#e7b98f']
const HAIR = ['#2b1d14', '#4a3020', '#7a5230', '#c9a46a', '#141210', '#5c4a3c']

type Behaviour =
  | { kind: 'stand'; clip: 'Idle' | 'Clap'; gesture?: boolean; bob?: boolean }
  | { kind: 'walk'; clip: 'Walk' | 'Run' | 'Idle'; from: T.Vector3; to: T.Vector3; speed: number; glide?: boolean }
type Spec = { character: Character; position: T.Vector3; facing: T.Vector3; behaviour: Behaviour; when: 'always' | 'sunset' | 'night'; vignette: string; seed: number }
type Npc = Spec & {
  root: T.Group; mixer: T.AnimationMixer; actions: Partial<Record<Clip, T.AnimationAction>>
  heading: number; along: number; dir: 1 | -1; gestureAt: number; geometry: T.BufferGeometry
}

function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 } }

/** Vignettes are anchored to the registry's hotel facades (edge midpoint + street normal). */
function buildSpecs(): Spec[] {
  type L = { kind: string; streetFacing: { edge: number[][]; normal: number[] }; encounter?: { distanceFromFacadeMeters?: number } }
  const marks = new Map<string, { e: T.Vector3; n: T.Vector3; t: T.Vector3; across: number }>()
  for (const l of landmarkRegistry.landmarks as unknown as L[]) {
    const [a, b] = l.streetFacing.edge
    const e = new T.Vector3((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2)
    const n = new T.Vector3(l.streetFacing.normal[0], 0, l.streetFacing.normal[1]).normalize()
    const t = new T.Vector3(b[0] - a[0], 0, b[1] - a[1]).normalize() // north -> south along the facade
    marks.set(l.kind, { e, n, t, across: l.encounter?.distanceFromFacadeMeters || 10.5 })
  }
  const at = (kind: string, out: number, along: number) => { const m = marks.get(kind)!; return m.e.clone().addScaledVector(m.n, out).addScaledVector(m.t, along) }
  const promenade = (kind: string, along: number) => { const m = marks.get(kind)!; return at(kind, m.across + 21, along) }
  const specs: Spec[] = []
  const add = (s: Omit<Spec, 'seed'>) => specs.push({ ...s, seed: specs.length * 977 + 31 })
  if (!marks.has('colony') || !marks.has('clevelander')) return specs
  const n = (kind: string) => marks.get(kind)!.n.clone(), t = (kind: string) => marks.get(kind)!.t.clone()
  // 1. Valet at the Colony entrance, facing the street.
  add({ vignette: 'valet', character: 'npc_man_longsleeve', position: at('colony', 3.0, 2.4), facing: n('colony'), behaviour: { kind: 'stand', clip: 'Idle', gesture: true }, when: 'always' })
  // 2. Couple strolling the Colony / Breakwater sidewalk, side by side.
  for (const [i, character] of (['npc_woman_dress', 'npc_man_tee'] as const).entries()) {
    const off = 5.2 + i * .65
    add({ vignette: 'couple', character, position: at('colony', off, -30), facing: t('colony').negate(), behaviour: { kind: 'walk', clip: 'Walk', from: at('colony', off, 30), to: at('breakwater', off, 25), speed: 1.05 }, when: 'always' })
  }
  // 3. Two friends mid-story outside the Breakwater; one gestures now and then.
  add({ vignette: 'conversation', character: 'npc_woman_tank', position: at('breakwater', 4.4, -6.2), facing: t('breakwater'), behaviour: { kind: 'stand', clip: 'Idle' }, when: 'always' })
  add({ vignette: 'conversation', character: 'npc_man_tee', position: at('breakwater', 4.4, -5.1), facing: t('breakwater').negate(), behaviour: { kind: 'stand', clip: 'Idle', gesture: true }, when: 'always' })
  // 4. The Clevelander crowd, swaying to the current station. Grows after dark.
  const bar = [[3.6, -12, 'npc_woman_dress', 'always'], [4.4, -13.2, 'npc_man_longsleeve', 'always'], [3.9, -14.4, 'npc_woman_jacket', 'always'], [4.8, -11.4, 'npc_man_tee', 'night'], [3.4, -15.6, 'npc_woman_tank', 'night']] as const
  bar.forEach(([out, along, character, when], i) => {
    const facing = n('clevelander').negate().applyAxisAngle(new T.Vector3(0, 1, 0), (i - 2) * .55)
    add({ vignette: 'bar crowd', character, position: at('clevelander', out, along), facing, behaviour: { kind: 'stand', clip: 'Idle', bob: true }, when })
  })
  // 5. Server crossing between patio tables.
  add({ vignette: 'server', character: 'npc_man_suit', position: at('clevelander', 2.6, -20), facing: t('clevelander'), behaviour: { kind: 'walk', clip: 'Walk', from: at('clevelander', 2.6, -24), to: at('clevelander', 2.6, -17), speed: .95 }, when: 'always' })
  // 6. Doorman at the Leslie / Carlyle block.
  if (marks.has('leslie')) add({ vignette: 'valet', character: 'npc_man_longsleeve', position: at('leslie', 2.8, -1.8), facing: n('leslie'), behaviour: { kind: 'stand', clip: 'Idle', gesture: true }, when: 'always' })
  if (marks.has('carlyle')) add({ vignette: 'evening walk', character: 'npc_woman_jacket', position: at('carlyle', 5.6, 0), facing: t('carlyle'), behaviour: { kind: 'walk', clip: 'Walk', from: at('carlyle', 5.6, -18), to: at('carlyle', 5.6, 40), speed: 1.15 }, when: 'always' })
  // 7. Lummus Park promenade: a sunset jogger and a roller skater gliding.
  add({ vignette: 'jogger', character: 'npc_man_tee', position: promenade('colony', 0), facing: t('colony').negate(), behaviour: { kind: 'walk', clip: 'Run', from: promenade('colony', 10), to: promenade('clevelander', -10), speed: 2.9 }, when: 'sunset' })
  add({ vignette: 'skater', character: 'npc_woman_tank', position: promenade('breakwater', 0), facing: t('breakwater'), behaviour: { kind: 'walk', clip: 'Idle', from: promenade('breakwater', -40), to: promenade('carlyle', 30), speed: 3.4, glide: true }, when: 'always' })
  // 8. Beachgoer by the lifeguard stand at sunset, gone at night.
  add({ vignette: 'beachgoer', character: 'npc_woman_dress', position: at('clevelander', marks.get('clevelander')!.across + 58, 6), facing: n('clevelander'), behaviour: { kind: 'stand', clip: 'Idle' }, when: 'sunset' })
  return specs
}

/** Parts exported separately can disagree on attribute storage (Uint8 vs Uint16 joints,
 * normalized vs float weights). Unify to a common layout so they merge into one draw. */
function normalizeForMerge(geometries: T.BufferGeometry[]) {
  const flat = geometries.map(g => g.index ? g.toNonIndexed() : g)
  const shared = Object.keys(flat[0].attributes).filter(name => flat.every(g => g.getAttribute(name)))
  return flat.map(g => {
    const out = new T.BufferGeometry()
    for (const name of shared) {
      const a = g.getAttribute(name) as T.BufferAttribute, n = a.count * a.itemSize
      if (name === 'skinIndex') { const v = new Uint16Array(n); for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) v[i * a.itemSize + k] = a.getComponent(i, k); out.setAttribute(name, new T.Uint16BufferAttribute(v, a.itemSize)) }
      else { const v = new Float32Array(n); for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) v[i * a.itemSize + k] = a.getComponent(i, k) * (a.normalized ? 1 / (a.array instanceof Uint8Array ? 255 : a.array instanceof Uint16Array ? 65535 : 1) : 1); out.setAttribute(name, new T.Float32BufferAttribute(v, a.itemSize)) }
    }
    return out
  })
}

type Template = { scene: T.Object3D; clips: T.AnimationClip[]; woman: boolean }

function bakeVertexColors(mesh: T.SkinnedMesh, palette: (name: string, base: T.Color) => T.Color): T.BufferGeometry {
  const geometry = mesh.geometry.clone()
  const count = geometry.getAttribute('position').count, colors = new Float32Array(count * 3)
  const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as T.MeshStandardMaterial[]
  const index = geometry.index
  const paint = (group: { start: number; count: number; materialIndex?: number }) => {
    const m = materials[group.materialIndex || 0], c = palette(m?.name || '', m?.color || new T.Color('#888'))
    for (let i = group.start; i < group.start + group.count; i++) { const v = index ? index.getX(i) : i; colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b }
  }
  if (geometry.groups.length) geometry.groups.forEach(paint); else paint({ start: 0, count: index ? index.count : count, materialIndex: 0 })
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3)); geometry.clearGroups()
  return geometry
}

export default function MiamiCrowd({ state, route, blend, enabled = true, density = 1 }: { state: MutableRefObject<NightState>; route: { sample: (d: number) => { x: number; z: number } }; blend: MutableRefObject<number>; enabled?: boolean; density?: number }) {
  const gltfs = useGLTF(CHARACTERS.map(c => `${BASE}${c}.glb`))
  const anims = useGLTF([`${BASE}npc_anims_male.glb`, `${BASE}npc_anims_female.glb`])
  const material = useMemo(() => new T.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: 0, emissive: '#3b2412', emissiveIntensity: 0 }), [])
  const crowd = useMemo(() => {
    const group = new T.Group(); group.name = 'miami-crowd'
    const templates = new Map<Character, Template>()
    CHARACTERS.forEach((c, i) => templates.set(c, { scene: gltfs[i].scene, clips: anims[c.includes('woman') ? 1 : 0].animations, woman: c.includes('woman') }))
    const specs = buildSpecs().filter((_, i) => density >= 1 || i % Math.round(1 / Math.max(.25, density)) === 0)
    const npcs: Npc[] = specs.map(spec => {
      const template = templates.get(spec.character)!, r = rng(spec.seed + 7)
      const pick = <V,>(list: readonly V[]) => list[Math.floor(r() * list.length)]
      const top = new T.Color(pick(TOPS)), bottom = new T.Color(pick(BOTTOMS)), skin = new T.Color(pick(SKIN)), hair = new T.Color(pick(HAIR)), white = new T.Color('#f2f0ea')
      const palette = (name: string, base: T.Color) => {
        if (/^(Shirt|Shirt2|Dress|Jacket|LightJacket)$/.test(name)) return name === 'Shirt2' || name === 'LightJacket' ? top.clone().lerp(white, .45) : top
        if (name === 'Pants') return bottom
        if (name === 'Skin') return skin
        if (/^Hair/.test(name) || name === 'Eyebrows') return hair
        if (name === 'Shoes' || name === 'Socks') return white
        return base
      }
      const scene = cloneSkinned(template.scene)
      // GLTFLoader splits a multi-material mesh into one SkinnedMesh per primitive.
      // Bake each part's wardrobe color, merge them, and keep one skinned draw.
      const parts: T.SkinnedMesh[] = []
      scene.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) parts.push(o as T.SkinnedMesh) })
      const baked = parts.map(part => bakeVertexColors(part, palette))
      const geometry = (baked.length > 1 ? mergeGeometries(normalizeForMerge(baked), false) : baked[0])!
      if (baked.length > 1) baked.forEach(g => g.dispose())
      const keep = parts[0]
      keep.geometry = geometry; keep.material = material
      keep.frustumCulled = false; keep.castShadow = false; keep.receiveShadow = false
      parts.slice(1).forEach(part => part.removeFromParent())
      const root = new T.Group(); root.add(scene)
      root.scale.setScalar(template.woman ? SCALE.woman : SCALE.man)
      root.position.copy(spec.position)
      const mixer = new T.AnimationMixer(scene), actions: Npc['actions'] = {}
      for (const clip of ['Idle', 'Walk', 'Run', 'Clap'] as Clip[]) {
        const source = template.clips.find(c => c.name === clip); if (!source) continue
        const action = mixer.clipAction(source); action.enabled = true; actions[clip] = action
      }
      const main = actions[spec.behaviour.clip] || actions.Idle
      if (main) { main.play(); main.time = r() * main.getClip().duration; main.timeScale = .9 + r() * .2 } // randomized phase: nobody moves in sync
      group.add(root)
      const heading = Math.atan2(spec.facing.x, spec.facing.z)
      return { ...spec, root, mixer, actions, heading, along: r(), dir: r() < .5 ? 1 : -1, gestureAt: 4 + r() * 8, geometry: geometry! }
    })
    return { group, npcs }
  }, [gltfs, anims, material, density])

  useEffect(() => () => { crowd.npcs.forEach(n => { n.mixer.stopAllAction(); n.geometry.dispose() }); material.dispose() }, [crowd, material])
  const stats = useRef({ ms: 0, active: 0, visible: 0 })
  useEffect(() => {
    const w = window as unknown as { __miamiCrowd?: () => unknown }
    w.__miamiCrowd = () => ({ total: crowd.npcs.length, ...stats.current, vignettes: Array.from(new Set(crowd.npcs.map(n => n.vignette))) })
    return () => { delete w.__miamiCrowd }
  }, [crowd])

  const temp = useMemo(() => new T.Vector3(), [])
  useFrame((_, delta) => {
    const begin = performance.now(), dt = Math.min(delta, .1), s = state.current, o = route.sample(s.distance)
    crowd.group.position.set(-o.x, 0, -o.z)
    crowd.group.visible = enabled
    if (!enabled) return
    const night = blend.current >= .5
    material.emissiveIntensity = blend.current * .22
    let active = 0, visible = 0
    for (const npc of crowd.npcs) {
      const cast = npc.when === 'always' || (npc.when === 'night') === night
      const d = Math.hypot(npc.root.position.x - o.x, npc.root.position.z - o.z)
      npc.root.visible = cast && d < VISIBLE_RADIUS
      if (!npc.root.visible) continue
      visible++
      if (d > ACTIVE_RADIUS) continue
      active++
      const b = npc.behaviour
      if (b.kind === 'walk') {
        // Ping-pong along a sidewalk segment with an eased turn at each end.
        const length = b.from.distanceTo(b.to)
        npc.along += npc.dir * b.speed * dt / Math.max(1, length)
        if (npc.along > 1) { npc.along = 1; npc.dir = -1 } else if (npc.along < 0) { npc.along = 0; npc.dir = 1 }
        npc.root.position.lerpVectors(b.from, b.to, npc.along)
        temp.subVectors(b.to, b.from).multiplyScalar(npc.dir)
        const want = Math.atan2(temp.x, temp.z), turn = Math.atan2(Math.sin(want - npc.heading), Math.cos(want - npc.heading))
        npc.heading += turn * (1 - Math.exp(-dt * 5))
        if (b.glide) npc.root.rotation.z = Math.sin(pulse.time * 1.6 + npc.seed) * .06 // skater's weight shift
      } else if (b.gesture) {
        // Mostly still; an occasional short gesture so a pair reads as mid-conversation.
        npc.gestureAt -= dt
        const clap = npc.actions.Clap, idle = npc.actions.Idle
        if (npc.gestureAt <= 0 && clap && idle) {
          npc.gestureAt = 7 + (npc.seed % 9)
          clap.reset().setLoop(T.LoopOnce, 1).fadeIn(.3).play(); idle.fadeOut(.3)
          setTimeout(() => { clap.fadeOut(.4); idle.reset().fadeIn(.4).play() }, 1500)
        }
      }
      if (b.kind === 'stand' && b.bob) {
        // Subtle: weight shifts with the bass, a small dip on the kick. Not a dance game.
        const live = pulse.source !== 'idle'
        npc.root.position.y = live ? -pulse.kick * .025 : 0
        npc.root.rotation.z = live ? Math.sin(pulse.time * 2.2 + npc.seed) * .035 * (.4 + pulse.bass) : 0
      }
      npc.root.rotation.y = npc.heading
      npc.mixer.update(dt)
    }
    stats.current = { ms: stats.current.ms * .9 + (performance.now() - begin) * .1, active, visible }
  })
  return <primitive object={crowd.group} dispose={null} />
}
