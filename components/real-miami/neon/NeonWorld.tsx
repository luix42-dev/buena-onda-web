'use client'
import { useEffect, useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as T from 'three'
import type { NightState } from '../nightdrive/state'
import { CHUNK_COUNT, CHUNK_LENGTH, CHUNKS_BEHIND, ROAD_STEP, roadRandom, roadSample } from '../nightdrive/road'
import { pulse } from '../master/pulse'
import { CRUISE_CAMPAIGNS } from '@/lib/cruise/campaigns'
import type { CruiseCampaign } from '@/lib/cruise/types'

/** Neon Run world. An elevated skyway threads stepped megastructures (Syd Mead horizontals,
 * chrome and light bands) over a city floor lost in smog, with flare stacks, distant arcology
 * pyramids, flying traffic, rain and holographic ads. Procedural and origin-relative like the
 * night-drive lab: chunks are filled once in chunk-local space and only translated per frame. */
const SEGMENTS = CHUNK_LENGTH / ROAD_STEP
const DECK = 6.2, FLOOR = -70
const m = new T.Object3D(), c = new T.Color()
type Strip = { mesh: T.Mesh; from: number; to: number; lift: number }
type Chunk = { group: T.Group; index: number; seed: number; strips: Strip[]; towers: T.InstancedMesh; bands: T.InstancedMesh; rails: T.InstancedMesh; lights: T.InstancedMesh; pylons: T.InstancedMesh; spires: T.InstancedMesh; pyramids: T.InstancedMesh; stacks: T.InstancedMesh; flames: T.InstancedMesh; screens: T.Mesh[]; flameBase: { x: number; y: number; z: number; s: number }[] }

// instanceColor must exist before the first compile, or the program is built without
// per-instance colour and every tower and light strip renders white.
function inst(geometry: T.BufferGeometry, material: T.Material, count: number) { const mesh = new T.InstancedMesh(geometry, material, count); mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3); mesh.count = 0; return mesh }
function put(mesh: T.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0, tilt = 0) { m.position.set(x, y, z); m.rotation.set(tilt, yaw, 0); m.scale.set(sx, sy, sz); m.updateMatrix(); mesh.setMatrixAt(i, m.matrix) }
function strip(material: T.Material, from: number, to: number, lift = 0): Strip {
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(new Float32Array((SEGMENTS + 1) * 6), 3))
  const uv = new Float32Array((SEGMENTS + 1) * 4)
  for (let i = 0; i <= SEGMENTS; i++) uv.set([0, i * ROAD_STEP / 4, (to - from) / 4, i * ROAD_STEP / 4], i * 4)
  geometry.setAttribute('uv', new T.BufferAttribute(uv, 2))
  const index: number[] = []; for (let i = 0; i < SEGMENTS; i++) { const v = i * 2; index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2) }
  geometry.setIndex(index)
  return { mesh: new T.Mesh(geometry, material), from, to, lift }
}

/** Facade windows and Mead light bands computed from chunk-local position, so nothing swims. */
function towerMaterial(lit: { value: number }) {
  const material = new T.MeshStandardMaterial({ color: '#ffffff', metalness: .55, roughness: .5, envMapIntensity: .22 })
  material.onBeforeCompile = shader => {
    shader.uniforms.uLit = lit
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTP; varying vec3 vTN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvTP = (instanceMatrix * vec4(transformed,1.)).xyz; vTN = normalize(mat3(instanceMatrix) * objectNormal);\n#else\nvTP = transformed; vTN = objectNormal;\n#endif')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vTP; varying vec3 vTN; uniform float uLit;
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)))*15731.743); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ vec3 n = normalize(vTN);
  if (abs(n.y) < .5) {
    vec3 t = normalize(cross(vec3(0.,1.,0.), n)); float u = dot(vTP, t), v = vTP.y;
    vec2 cell = vec2(u / 1.9, v / 3.2), f = fract(cell), id = floor(cell);
    float win = step(.2, f.x) * step(f.x, .8) * step(.28, f.y) * step(f.y, .78);
    // About a quarter of windows lit; colour drawn from an independent hash.
    float r = h21(id + floor(vTP.xz / 37.)), lit = step(.74, h21(id * 1.37 + floor(vTP.xz / 37.) + 11.));
    vec3 col = r > .97 ? vec3(1.,.3,.75) : r > .9 ? vec3(.35,.9,1.) : r > .8 ? vec3(.9,.94,1.) : vec3(1.,.66,.36);
    totalEmissiveRadiance += col * win * lit * uLit;
    // A 0.3 m Mead light line every 24 m of height (distance from the band centre, in metres).
    float band = smoothstep(11.78, 11.86, abs(fract(v / 24.) - .5) * 24.);
    totalEmissiveRadiance += vec3(1.,.86,.7) * band * .9 * uLit;
  } }`)
  }
  return material
}

/** Futurist creative for each campaign: dark glass, neon type, a glyph column. */
function holoTexture(campaign: CruiseCampaign, i: number) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024
  const g = canvas.getContext('2d')!, cr = campaign.creatives.wall, accent = i % 2 ? '#56e3ff' : '#ff4fd1'
  const grad = g.createLinearGradient(0, 0, 0, 1024); grad.addColorStop(0, '#1a0a2bcc'); grad.addColorStop(1, '#05030dcc'); g.fillStyle = grad; g.fillRect(0, 0, 512, 1024)
  g.strokeStyle = accent; g.lineWidth = 6; g.strokeRect(18, 18, 476, 988)
  g.font = '600 30px Outfit, Arial, sans-serif'; g.fillStyle = accent; g.fillText(cr.eyebrow, 46, 86)
  g.shadowColor = accent; g.shadowBlur = 30; g.fillStyle = '#ffffff'
  const words = cr.headline.split(/\s+/); g.font = '700 108px Outfit, Arial, sans-serif'
  words.forEach((word, k) => g.fillText(word, 40, 300 + k * 118, 432))
  g.shadowBlur = 0; g.font = '500 28px Outfit, Arial, sans-serif'; g.fillStyle = cr.foreground; g.fillText(cr.footer, 46, 930, 420)
  for (let k = 0; k < 26; k++) { g.fillStyle = `${accent}${k % 3 ? '55' : 'aa'}`; g.fillRect(452, 120 + k * 30, 18 - (k * 7) % 12, 14) }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; return texture
}

function createWorld(asphaltSource: T.Texture) {
  const group = new T.Group(), box = new T.BoxGeometry(1, 1, 1), pyramid = new T.ConeGeometry(.5, 1, 4, 1), plane = new T.PlaneGeometry(1, 1)
  pyramid.rotateY(Math.PI / 4)
  const asphalt = asphaltSource.clone(); asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping; asphalt.colorSpace = T.SRGBColorSpace; asphalt.needsUpdate = true
  const lit = { value: 1.4 }
  const campaigns = (CRUISE_CAMPAIGNS as readonly CruiseCampaign[]).filter(x => x.enabled !== false)
  const holo = campaigns.map((x, i) => new T.MeshBasicMaterial({ map: holoTexture(x, i), transparent: true, opacity: .92, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide, fog: false }))
  const materials = {
    road: new T.MeshStandardMaterial({ color: '#2a2735', map: asphalt, roughness: .3, metalness: .4, envMapIntensity: .5 }),
    shoulder: new T.MeshStandardMaterial({ color: '#15131c', roughness: .6, metalness: .4 }),
    floor: new T.MeshStandardMaterial({ color: '#120812', roughness: 1, emissive: '#3a0f2a', emissiveIntensity: .35 }),
    sheen: new T.MeshBasicMaterial({ color: '#ff3fb4', transparent: true, opacity: .035, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }),
    towers: towerMaterial(lit),
    bands: new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    rails: new T.MeshStandardMaterial({ color: '#2c2c38', metalness: .8, roughness: .3 }),
    lights: new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    pylons: new T.MeshStandardMaterial({ color: '#1c1a24', metalness: .5, roughness: .6 }),
    stacks: new T.MeshStandardMaterial({ color: '#241a1c', metalness: .4, roughness: .7, emissive: '#ff4a10', emissiveIntensity: .08 }),
    flames: new T.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide, fog: false }),
  }
  const chunks: Chunk[] = Array.from({ length: CHUNK_COUNT }, () => {
    const chunk: Chunk = { group: new T.Group(), index: NaN, seed: NaN,
      strips: [strip(materials.road, -DECK, DECK, .01), strip(materials.shoulder, -DECK - 1.2, -DECK, .05), strip(materials.shoulder, DECK, DECK + 1.2, .05), strip(materials.floor, -420, 420, FLOOR), strip(materials.sheen, -1.4, -.2, .03), strip(materials.sheen, .2, 1.4, .03)],
      towers: inst(box, materials.towers, 48), bands: inst(box, materials.bands, 48), rails: inst(box, materials.rails, 2 * SEGMENTS), lights: inst(box, materials.lights, 2 * SEGMENTS + 24),
      pylons: inst(box, materials.pylons, 2), spires: inst(box, materials.lights, 12), pyramids: inst(pyramid, materials.towers, 1), stacks: inst(box, materials.stacks, 3), flames: inst(plane, materials.flames, 6), screens: [], flameBase: [] }
    for (let k = 0; k < 2; k++) { const screen = new T.Mesh(plane, holo[0]); screen.visible = false; chunk.screens.push(screen) }
    chunk.group.add(...chunk.strips.map(s => s.mesh), chunk.towers, chunk.bands, chunk.rails, chunk.lights, chunk.pylons, chunk.spires, chunk.pyramids, chunk.stacks, chunk.flames, ...chunk.screens)
    group.add(chunk.group); return chunk
  })
  return { group, chunks, materials, holo, lit, ownedTextures: [asphalt, ...holo.map(x => x.map!)], geometries: [box, pyramid, plane] }
}

function fillChunk(chunk: Chunk, index: number, seed: number, holo: T.Material[]) {
  const start = index * CHUNK_LENGTH, anchor = roadSample(start, seed)
  const local = (s: number, lateral = 0) => { const p = roadSample(s, seed); return { x: p.x - anchor.x + Math.cos(p.yaw) * lateral, y: p.y - anchor.y, z: p.z - anchor.z - Math.sin(p.yaw) * lateral, yaw: p.yaw } }
  for (const item of chunk.strips) {
    const position = item.mesh.geometry.getAttribute('position') as T.BufferAttribute, uv = item.mesh.geometry.getAttribute('uv') as T.BufferAttribute
    for (let i = 0; i <= SEGMENTS; i++) for (let edge = 0; edge < 2; edge++) { const p = local(start + i * ROAD_STEP, edge ? item.to : item.from); position.setXYZ(i * 2 + edge, p.x, item.lift === FLOOR ? FLOOR : p.y + item.lift, p.z); uv.setY(i * 2 + edge, ((start % 4) + i * ROAD_STEP) / 4) }
    position.needsUpdate = uv.needsUpdate = true; item.mesh.geometry.computeVertexNormals(); item.mesh.geometry.computeBoundingSphere()
  }
  const r = (k: number) => roadRandom(index * 131 + k, seed)
  // Barriers with continuous light strips: cyan on the left, magenta on the right.
  let rails = 0, lights = 0
  for (let i = 0; i < SEGMENTS; i++) for (const side of [-1, 1]) {
    const p = local(start + i * ROAD_STEP + ROAD_STEP / 2, side * (DECK + 1.25))
    put(chunk.rails, rails++, p.x, p.y + .55, p.z, .35, 1.1, ROAD_STEP + .02, p.yaw)
    put(chunk.lights, lights, p.x - Math.cos(p.yaw) * side * .19, p.y + .95, p.z + Math.sin(p.yaw) * side * .19, .05, .07, ROAD_STEP + .02, p.yaw)
    chunk.lights.setColorAt(lights++, c.set(side < 0 ? '#3fe6ff' : '#ff3fc8').multiplyScalar(1.6))
  }
  // Pylons down into the smog.
  for (let k = 0; k < 2; k++) { const p = local(start + 24 + k * 48); put(chunk.pylons, k, p.x, (p.y + FLOOR) / 2, p.z, 7, p.y - FLOOR, 3.2, p.yaw) }
  chunk.pylons.count = 2
  // Stepped megastructures. Tiers shrink upward; each tier edge carries a horizontal light band.
  let towers = 0, bands = 0, spires = 0
  for (let k = 0; k < 7; k++) for (const side of [-1, 1]) {
    if (towers > 44) break
    const h = r(k * 7 + (side > 0 ? 3 : 0)), along = start + 6 + k * 13 + r(k * 5 + side) * 6
    const width = 16 + r(k * 11 + side) * 26, depth = 16 + r(k * 13 + side) * 22
    // The near face stays at least 16 m off the deck edge so the skyway reads as open air.
    const lateral = side * (DECK + 16 + depth / 2 + h * 110 + (k % 2) * 14), p = local(along, lateral)
    let height = 30 + Math.pow(r(k * 17 + side), 1.6) * 220 * (Math.abs(lateral) > 60 ? 1 : .55), base = FLOOR, scale = 1
    const tiers = 1 + Math.floor(r(k * 19 + side) * 3), chrome = r(k * 23 + side) > .78
    for (let t = 0; t < tiers && towers < 48; t++) {
      const top = base + height * (t === tiers - 1 ? 1 : .55 - t * .1)
      put(chunk.towers, towers, p.x, (base + top) / 2, p.z, depth * scale, top - base, width * scale, p.yaw)
      chunk.towers.setColorAt(towers++, c.set(chrome ? '#5a5d6b' : t % 2 ? '#101118' : '#16151f'))
      put(chunk.bands, bands, p.x, top + .3, p.z, depth * scale + .4, .5, width * scale + .4, p.yaw)
      chunk.bands.setColorAt(bands++, c.set(t === tiers - 1 ? (side < 0 ? '#ff5ab4' : '#5ad8ff') : '#ffd6a8').multiplyScalar(1.4))
      base = top; scale *= .72
    }
    if (base > 120 && spires < 12) { put(chunk.spires, spires, p.x, base + 9, p.z, .5, 18, .5, p.yaw); chunk.spires.setColorAt(spires++, c.set('#ff2a3a').multiplyScalar(2)) }
  }
  chunk.towers.count = towers; chunk.bands.count = bands; chunk.spires.count = spires
  // Holographic ad screens hung on near tower faces.
  chunk.screens.forEach((screen, k) => {
    const show = r(300 + k) > .35; screen.visible = show; if (!show) return
    const side = k ? 1 : -1, along = start + 20 + k * 44, p = local(along, side * (22 + r(310 + k) * 10)), scale = 9 + r(320 + k) * 9
    screen.position.set(p.x, p.y + 12 + r(330 + k) * 26, p.z); screen.rotation.set(0, p.yaw + (side < 0 ? Math.PI / 2 : -Math.PI / 2) + (side < 0 ? -.35 : .35), 0)
    screen.scale.set(scale, scale * 2, 1); screen.material = holo[Math.floor(r(340 + k) * holo.length)]
  })
  // Far landmarks: arcology pyramids and flare stacks in the industrial haze.
  chunk.pyramids.count = 0
  if (index % 7 === 3) { const side = r(400) > .5 ? 1 : -1, p = local(start + 40, side * (300 + r(401) * 80)), s = 220 + r(402) * 100; put(chunk.pyramids, 0, p.x, FLOOR + s * .45, p.z, s, s * .9, s, p.yaw); chunk.pyramids.setColorAt(0, c.set('#2a2433')); chunk.pyramids.count = 1 }
  chunk.stacks.count = 0; chunk.flames.count = 0; chunk.flameBase.length = 0
  if (index % 3 === 1) for (let k = 0; k < 3; k++) {
    const side = (k + index) % 2 ? 1 : -1, p = local(start + 10 + k * 30, side * (160 + r(410 + k) * 160)), hgt = 70 + r(420 + k) * 60
    put(chunk.stacks, k, p.x, FLOOR + hgt / 2, p.z, 5, hgt, 5); chunk.flameBase.push({ x: p.x, y: FLOOR + hgt, z: p.z, s: 10 + r(430 + k) * 8 })
    chunk.stacks.count = k + 1
  }
  chunk.flames.count = chunk.flameBase.length * 2
  for (const mesh of [chunk.towers, chunk.bands, chunk.rails, chunk.lights, chunk.pylons, chunk.spires, chunk.pyramids, chunk.stacks]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere() }
  chunk.lights.count = lights; chunk.rails.count = rails
  chunk.index = index; chunk.seed = seed
}

/** Flying traffic in lanes above the skyway; positions follow the road so lanes bend with it. */
function createFlyers(count: number) {
  const body = new T.InstancedMesh(new T.BoxGeometry(1.8, .7, 4.6), new T.MeshStandardMaterial({ color: '#3a3946', metalness: .8, roughness: .35 }), count)
  const lamp = new T.InstancedMesh(new T.BoxGeometry(1.6, .12, .12), new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), count * 2)
  const lanes = Array.from({ length: count }, (_, i) => { const r = (k: number) => roadRandom(9000 + i * 7 + k, 77); return { offset: r(0) * 900 - 250, lateral: (r(1) > .5 ? 1 : -1) * (14 + r(2) * 140), height: 18 + r(3) * 80, speed: (r(4) > .4 ? -1 : 1) * (18 + r(5) * 40) } })
  body.frustumCulled = lamp.frustumCulled = false
  for (let i = 0; i < count; i++) { lamp.setColorAt(i * 2, c.set('#fff3d6').multiplyScalar(2)); lamp.setColorAt(i * 2 + 1, c.set('#ff2a4a').multiplyScalar(2)) }
  return { body, lamp, lanes }
}

export default function NeonWorld({ state }: { state: MutableRefObject<NightState> }) {
  // Existing repository CC0 asphalt (Poly Haven, see clean-asphalt/provenance.json), tuned wet.
  const asphaltSource = useTexture('/real-miami/materials/clean-asphalt/color.webp')
  const world = useMemo(() => createWorld(asphaltSource), [asphaltSource])
  const flyers = useMemo(() => createFlyers(36), [])
  const rain = useMemo(() => { const mesh = new T.InstancedMesh(new T.BoxGeometry(.012, .9, .012), new T.MeshBasicMaterial({ color: '#b9c9ff', transparent: true, opacity: .32, depthWrite: false, fog: false }), 700); mesh.frustumCulled = false; const drops = Array.from({ length: 700 }, (_, i) => ({ x: (roadRandom(i, 3) - .5) * 60, y: roadRandom(i, 5) * 30, z: (roadRandom(i, 7) - .5) * 70 - 10 })); return { mesh, drops } }, [])
  useEffect(() => () => {
    for (const chunk of world.chunks) { for (const s of chunk.strips) s.mesh.geometry.dispose(); for (const mesh of [chunk.towers, chunk.bands, chunk.rails, chunk.lights, chunk.pylons, chunk.spires, chunk.pyramids, chunk.stacks, chunk.flames]) mesh.dispose() }
    world.geometries.forEach(g => g.dispose()); Object.values(world.materials).forEach(x => x.dispose()); world.holo.forEach(x => x.dispose()); world.ownedTextures.forEach(t => t.dispose())
    flyers.body.geometry.dispose(); (flyers.body.material as T.Material).dispose(); flyers.lamp.geometry.dispose(); (flyers.lamp.material as T.Material).dispose(); rain.mesh.geometry.dispose(); (rain.mesh.material as T.Material).dispose()
  }, [world, flyers, rain])
  useFrame(({ clock }, delta) => {
    const s = state.current, origin = roadSample(s.distance, s.seed), time = clock.elapsedTime, first = Math.floor(s.distance / CHUNK_LENGTH) - CHUNKS_BEHIND
    for (let index = first; index < first + CHUNK_COUNT; index++) {
      const chunk = world.chunks[((index % CHUNK_COUNT) + CHUNK_COUNT) % CHUNK_COUNT]
      if (chunk.index !== index || chunk.seed !== s.seed) { const t0 = performance.now(); fillChunk(chunk, index, s.seed, world.holo); s.generationMs = performance.now() - t0; s.maxGenerationMs = Math.max(s.maxGenerationMs, s.generationMs); s.chunksGenerated++ }
      const anchor = roadSample(index * CHUNK_LENGTH, s.seed); chunk.group.position.set(anchor.x - origin.x, anchor.y - origin.y, anchor.z - origin.z)
      // Flames breathe; two crossed planes per stack, facing nothing in particular (additive).
      chunk.flameBase.forEach((f, k) => { const flick = .75 + .25 * Math.sin(time * 9 + k * 3.1) * Math.sin(time * 3.7 + k), hgt = f.s * (1.4 + .6 * flick); for (let q = 0; q < 2; q++) put(chunk.flames, k * 2 + q, f.x, f.y + hgt / 2, f.z, f.s * .55 * flick, hgt, 1, q * Math.PI / 2) })
      if (chunk.flameBase.length) chunk.flames.instanceMatrix.needsUpdate = true
    }
    world.lit.value = 1.3 + (pulse.source === 'live' ? pulse.energy * .35 : 0)
    world.materials.flames.opacity = .75 + .2 * Math.sin(time * 11)
    // Screens flicker like a weak hologram.
    world.holo.forEach((x, i) => { x.opacity = .78 + .14 * Math.sin(time * (2.3 + i)) * (Math.sin(time * 17 + i) > .97 ? .2 : 1) })
    flyers.lanes.forEach((lane, i) => {
      const d = s.distance + ((lane.offset + lane.speed * time) % 1100 + 1100) % 1100 - 300, p = roadSample(d, s.seed)
      const x = p.x - origin.x + Math.cos(p.yaw) * lane.lateral, y = p.y - origin.y + lane.height, z = p.z - origin.z - Math.sin(p.yaw) * lane.lateral, yaw = p.yaw + (lane.speed > 0 ? 0 : Math.PI)
      put(flyers.body, i, x, y, z, 1, 1, 1, yaw)
      put(flyers.lamp, i * 2, x - Math.sin(yaw) * 2.35, y, z - Math.cos(yaw) * 2.35, 1, 1, 1, yaw)
      put(flyers.lamp, i * 2 + 1, x + Math.sin(yaw) * 2.35, y, z + Math.cos(yaw) * 2.35, 1, 1, 1, yaw)
    })
    flyers.body.instanceMatrix.needsUpdate = flyers.lamp.instanceMatrix.needsUpdate = true
    // Rain around the car, slanted slightly by speed.
    const fall = Math.min(delta, .05) * 26, lean = Math.min(.5, s.speed / 60)
    rain.drops.forEach((d, i) => { d.y -= fall; d.z += fall * lean * 1.4; if (d.y < -1) { d.y += 30; d.z = (roadRandom(i + Math.floor(time), 7) - .5) * 70 - 10 } if (d.z > 30) d.z -= 70; put(rain.mesh, i, d.x, d.y, d.z, 1, 1, 1, 0, lean) })
    rain.mesh.instanceMatrix.needsUpdate = true
  })
  return <>
    <primitive object={world.group} dispose={null} />
    <primitive object={flyers.body} dispose={null} /><primitive object={flyers.lamp} dispose={null} />
    <primitive object={rain.mesh} dispose={null} />
  </>
}
