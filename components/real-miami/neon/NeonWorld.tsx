'use client'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as T from 'three'
import type { NightState } from '../nightdrive/state'
import { CHUNK_COUNT, CHUNK_LENGTH, CHUNKS_BEHIND, ROAD_STEP, roadRandom, roadSample, retrowaveRoadSample, retrowaveSkywayMix } from '../nightdrive/road'
import RetroSkyway from './RetroSkyway'
import RetroIsland from './RetroIsland'
import { pulse } from '../master/pulse'
import { CRUISE_CAMPAIGNS } from '@/lib/cruise/campaigns'
import {stationIdForCampaign} from '@/lib/cruise/radio-station-ads'
import type { CruiseCampaign } from '@/lib/cruise/types'
import { createSignAtlas, glowTexture, shopfrontTexture, signMaterial, streakTexture, type SignDesign } from './signAtlas'
import { hideEmpty, ownGeometry, raycastOnly } from './instancing'

/** Neon Run world: a rain-soaked street canyon at night. Mid-rise blocks with lit storefronts,
 * awnings and stacked neon blades line a wet avenue; Syd Mead megastructures, spires, arcology
 * pyramids and flare stacks tower behind; flying traffic crosses overhead. Wet-road neon is a cheap
 * WebGL stand-in for screen-space reflections: per-sign glow cards in the haze plus streaks on the
 * asphalt. Procedural and origin-relative: chunks fill once in chunk-local space, then only move. */
const SEGMENTS = CHUNK_LENGTH / ROAD_STEP
type RoadSampler = typeof roadSample
const ROAD = 6.2, CURB = .16, FACADE = 10.5
const m = new T.Object3D(), c = new T.Color(), supportPart = new T.Object3D()
m.rotation.order = 'YXZ'
type Strip = { mesh: T.Mesh; from: number; to: number; lift: number }
type Sign = { mesh: T.InstancedMesh; rect: T.InstancedBufferAttribute; gain: T.InstancedBufferAttribute; seed: T.InstancedBufferAttribute }
type Chunk = { group: T.Group; index: number; seed: number; strips: Strip[]; blocks: T.InstancedMesh; fronts: T.InstancedMesh; awnings: T.InstancedMesh; towers: T.InstancedMesh; bands: T.InstancedMesh; spires: T.InstancedMesh; pyramids: T.InstancedMesh; stacks: T.InstancedMesh; flames: T.InstancedMesh; signs: Sign; glows: T.InstancedMesh; streaks: T.InstancedMesh; cables: T.InstancedMesh; poles: T.InstancedMesh; heads: T.InstancedMesh; marks: T.InstancedMesh; screens: T.Mesh[]; supports: T.InstancedMesh; flameBase: { x: number; y: number; z: number; s: number }[] }

// instanceColor must exist before the first compile, or the program is built without
// per-instance colour and everything renders white.
function inst(geometry: T.BufferGeometry, material: T.Material, count: number) { const mesh = new T.InstancedMesh(ownGeometry(geometry), material, count); mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3); mesh.count = 0; return mesh }
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

/** Facade windows (and Mead light lines on the megastructures) from chunk-local position. */
function facadeMaterial(lit: { value: number }, bands: boolean) {
  const material = new T.MeshStandardMaterial({ color: '#ffffff', metalness: .45, roughness: .55, envMapIntensity: .35 })
  material.onBeforeCompile = shader => {
    shader.uniforms.uLit = lit
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTP; varying vec3 vTN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvTP = (instanceMatrix * vec4(transformed,1.)).xyz; vTN = normalize(mat3(instanceMatrix) * objectNormal);\n#else\nvTP = transformed; vTN = objectNormal;\n#endif')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vTP; varying vec3 vTN; uniform float uLit;
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)))*15731.743); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ vec3 n = normalize(vTN);
  if (abs(n.y) < .5 && vTP.y > 5.) {
    vec3 t = normalize(cross(vec3(0.,1.,0.), n)); float u = dot(vTP, t), v = vTP.y;
    vec2 cell = vec2(u / 1.9, v / 3.2), f = fract(cell), id = floor(cell);
    float win = step(.2, f.x) * step(f.x, .8) * step(.28, f.y) * step(f.y, .78);
    float r = h21(id + floor(vTP.xz / 37.)), lit = step(.72, h21(id * 1.37 + floor(vTP.xz / 37.) + 11.));
    vec3 col = r > .97 ? vec3(1.,.3,.75) : r > .9 ? vec3(.35,.9,1.) : r > .8 ? vec3(.9,.94,1.) : vec3(1.,.66,.36);
    totalEmissiveRadiance += col * win * lit * uLit;
    ${bands ? 'totalEmissiveRadiance += vec3(1.,.86,.7) * smoothstep(11.78, 11.86, abs(fract(v / 24.) - .5) * 24.) * .9 * uLit;' : ''}
  }
  // Rain streaks darken facades in vertical runs.
  diffuseColor.rgb *= .78 + .22 * h21(vec2(floor(vTP.x * 3. + vTP.z * 3.), 0.));
}`)
  }
  return material
}

/** Wet asphalt: puddles go mirror-smooth and dark; the rest keeps a thin water film. */
function wetRoad(asphalt: T.Texture) {
  const material = new T.MeshStandardMaterial({ color: '#2a2630', map: asphalt, roughness: .3, metalness: .35, envMapIntensity: .9 })
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
float wn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  float a = fract(sin(dot(i, vec2(127.1,311.7)))*43758.5), b = fract(sin(dot(i+vec2(1.,0.), vec2(127.1,311.7)))*43758.5);
  float c2 = fract(sin(dot(i+vec2(0.,1.), vec2(127.1,311.7)))*43758.5), d = fract(sin(dot(i+vec2(1.,1.), vec2(127.1,311.7)))*43758.5);
  return mix(mix(a,b,f.x), mix(c2,d,f.x), f.y); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
float puddle = smoothstep(.52, .6, wn(vMapUv * vec2(.9, .45)) * .65 + wn(vMapUv * 2.3) * .35);
roughnessFactor = mix(roughnessFactor, .04, puddle);
diffuseColor.rgb *= mix(1., .45, puddle);`)
  }
  return material
}

function holoTexture(campaign: CruiseCampaign, i: number) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1024
  const g = canvas.getContext('2d')!, cr = campaign.creatives.wall, accent = stationIdForCampaign(campaign) ? cr.accent : i % 2 ? '#56e3ff' : '#ff4fd1'
  const headline = (top: number, bottom: number, maxSize: number) => {
    const words = cr.headline.trim().split(/\s+/), width = 414
    let lines: string[] = [], size = maxSize
    for (; size >= 48; size -= 2) {
      g.font = `700 ${size}px Outfit, Arial, sans-serif`
      lines = []
      for (const word of words) {
        const current = lines[lines.length - 1]
        if (current && g.measureText(`${current} ${word}`).width <= width) lines[lines.length - 1] = `${current} ${word}`
        else lines.push(word)
      }
      if (lines.length <= 3 && lines.every(line => g.measureText(line).width <= width) && lines.length * size * 1.13 <= bottom - top) break
    }
    const step = size * 1.13, first = top + (bottom - top - lines.length * step) / 2 + size
    g.textAlign = 'center'; g.fillStyle = cr.foreground; g.shadowColor = accent; g.shadowBlur = 12
    lines.forEach((line, index) => g.fillText(line, 256, first + index * step, width))
    g.shadowBlur = 0; g.textAlign = 'start'
  }
  const base = () => {
    const grad = g.createLinearGradient(0, 0, 0, 1024); grad.addColorStop(0,stationIdForCampaign(campaign)?cr.background:'#20152c'); grad.addColorStop(1, '#080b18')
    g.fillStyle = grad; g.fillRect(0, 0, 512, 1024)
    g.strokeStyle = accent; g.lineWidth = 8; g.strokeRect(16, 16, 480, 992)
    g.fillStyle = accent; g.fillRect(34, 34, 444, 6)
    g.font = '700 30px Outfit, Arial, sans-serif'; g.fillStyle = accent; g.fillText(cr.eyebrow, 46, 92, 420)
    g.font = '600 28px Outfit, Arial, sans-serif'; g.fillStyle = cr.foreground; g.fillText(cr.footer, 46, 966, 420)
  }
  base(); headline(230, 690, 94)
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace
  // Catalog products show their photo above a shorter headline once it loads.
  const photo = campaign.billboardImage
  if (photo) {
    const image = new Image()
    image.onload = () => {
      base()
      const box = 420, r = Math.max(box / image.naturalWidth, box / image.naturalHeight)
      g.save(); g.beginPath(); g.rect(46, 126, box, box); g.clip(); g.drawImage(image, 46 + (box - image.naturalWidth * r) / 2, 126 + (box - image.naturalHeight * r) / 2, image.naturalWidth * r, image.naturalHeight * r); g.restore()
      g.strokeStyle = accent; g.lineWidth = 3; g.strokeRect(45, 125, box + 2, box + 2)
      headline(600, 850, 70)
      texture.needsUpdate = true
    }
    image.src = photo
  }
  return texture
}

function createWorld(asphaltSource: T.Texture,radioCampaigns?:readonly CruiseCampaign[]) {
  const group = new T.Group(), box = new T.BoxGeometry(1, 1, 1), pyramid = new T.ConeGeometry(.5, 1, 4, 1), plane = new T.PlaneGeometry(1, 1)
  pyramid.rotateY(Math.PI / 4)
  const asphalt = asphaltSource.clone(); asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping; asphalt.colorSpace = T.SRGBColorSpace; asphalt.needsUpdate = true
  const lit = { value: 1.3 }, time = { value: 0 }, atlas = createSignAtlas(), glowMap = glowTexture(), streakMap = streakTexture(), shopMap = shopfrontTexture()
  const campaigns = radioCampaigns??(CRUISE_CAMPAIGNS as readonly CruiseCampaign[]).filter(x => x.enabled !== false)
  const holo = campaigns.map((x, i) => {const poster=x.id==='gta-vi-official';const map=poster?new T.TextureLoader().load('/cruise/ads/gta-vi-official-cover.jpg'):holoTexture(x,i);if(poster){map.colorSpace=T.SRGBColorSpace;map.anisotropy=8}const material=new T.MeshBasicMaterial({ map, transparent: false, depthWrite: true, toneMapped: false, side: T.DoubleSide });material.userData.destination=x.destination;material.userData.label=x.name;if(poster)material.userData.poster=true;return material})
  const materials = {
    road: wetRoad(asphalt),
    skyroad: new T.MeshStandardMaterial({ color: '#171227', roughness: .26, metalness: .62, emissive: '#15072f', emissiveIntensity: .2 }),
    sidewalk: new T.MeshStandardMaterial({ color: '#2b2a31', roughness: .35, metalness: .3, envMapIntensity: .6 }),
    curb: new T.MeshStandardMaterial({ color: '#4a4850', roughness: .5 }),
    lines: new T.MeshBasicMaterial({ color: '#d9a82a', toneMapped: false }),
    blocks: facadeMaterial(lit, false), towers: facadeMaterial(lit, true),
    lit: new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    fronts: new T.MeshBasicMaterial({ map: shopMap, toneMapped: false }),
    awnings: new T.MeshStandardMaterial({ color: '#ffffff', roughness: .7 }),
    dark: new T.MeshStandardMaterial({ color: '#0d0d10', roughness: .6, metalness: .5 }),
    stacks: new T.MeshStandardMaterial({ color: '#241a1c', metalness: .4, roughness: .7, emissive: '#ff4a10', emissiveIntensity: .08 }),
    flames: new T.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide, fog: false }),
    glows: new T.MeshBasicMaterial({ map: glowMap, transparent: true, opacity: .18, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }),
    streaks: new T.MeshBasicMaterial({ map: streakMap, transparent: true, opacity: .34, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    signs: signMaterial(atlas.texture, time),
  }
  // Each chunk's sign mesh owns a plane clone, so its per-instance attributes are its own.
  const makeSigns = (count: number): Sign => {
    const geometry = plane.clone(), mesh = new T.InstancedMesh(geometry, materials.signs, count); mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.count = 0
    const rect = new T.InstancedBufferAttribute(new Float32Array(count * 4), 4), gain = new T.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3), seed = new T.InstancedBufferAttribute(new Float32Array(count), 1)
    geometry.setAttribute('aRect', rect); geometry.setAttribute('aGain', gain); geometry.setAttribute('aSeed', seed)
    return { mesh, rect, gain, seed }
  }
  const chunks: Chunk[] = Array.from({ length: CHUNK_COUNT }, () => {
    const signs = makeSigns(64)
    const chunk: Chunk = { group: new T.Group(), index: NaN, seed: NaN,
      strips: [strip(materials.road, -ROAD, ROAD, .01), strip(materials.sidewalk, -FACADE - 2, -ROAD - .2, CURB), strip(materials.sidewalk, ROAD + .2, FACADE + 2, CURB), strip(materials.curb, -ROAD - .2, -ROAD, CURB * .6), strip(materials.curb, ROAD, ROAD + .2, CURB * .6), strip(materials.lines, -.2, -.09, .02), strip(materials.lines, .09, .2, .02)],
      blocks: inst(box, materials.blocks, 16), fronts: inst(plane, materials.fronts, 16), awnings: inst(box, materials.awnings, 16), towers: inst(box, materials.towers, 28), bands: inst(box, materials.lit, 28),
      spires: inst(box, materials.lit, 10), pyramids: inst(pyramid, materials.towers, 1), stacks: inst(box, materials.stacks, 3), flames: inst(plane, materials.flames, 6),
      signs, glows: inst(plane, materials.glows, 64), streaks: inst(plane, materials.streaks, 64), cables: inst(box, materials.dark, 12), poles: inst(box, materials.dark, 8), heads: inst(box, materials.lit, 8), marks: inst(box, materials.lit, 24),
      screens: [], supports: inst(box, materials.dark, 9), flameBase: [] }
    // Each screen's frame and two posts live in the chunk's one `supports` instanced draw (was 3 meshes per screen).
    for (let k = 0; k < 3; k++) { const screen = new T.Mesh(plane, holo[0]); screen.visible = false; chunk.screens.push(screen) }
    chunk.group.add(...chunk.strips.map(s => s.mesh), chunk.blocks, chunk.fronts, chunk.awnings, chunk.towers, chunk.bands, chunk.spires, chunk.pyramids, chunk.stacks, chunk.flames, signs.mesh, chunk.glows, chunk.streaks, chunk.cables, chunk.poles, chunk.heads, chunk.marks, ...chunk.screens, chunk.supports)
    group.add(chunk.group); return chunk
  })
  // Linked billboards are the only clickable surfaces; nothing else needs pointer rays.
  raycastOnly(group, object => chunks.some(chunk => chunk.screens.includes(object as T.Mesh)))
  return { group, chunks, materials, holo, lit, time, atlas, ownedTextures: [asphalt, glowMap, streakMap, shopMap, atlas.texture, ...holo.map(x => x.map!)], geometries: [box, pyramid, plane] }
}

function fillChunk(chunk: Chunk, index: number, seed: number, holo: T.Material[], atlas: { vertical: SignDesign[]; horizontal: SignDesign[] }, sample: RoadSampler, future: boolean, skyroad: T.Material, cityroad: T.Material) {
  const start = index * CHUNK_LENGTH, anchor = sample(start, seed), sky = future && retrowaveSkywayMix(start + CHUNK_LENGTH / 2) > .5
  const local = (s: number, lateral = 0) => { const p = sample(s, seed); return { x: p.x - anchor.x + Math.cos(p.yaw) * lateral, y: p.y - anchor.y, z: p.z - anchor.z - Math.sin(p.yaw) * lateral, yaw: p.yaw } }
  chunk.strips[0].mesh.material = sky ? skyroad : cityroad
  chunk.strips.forEach((item, i) => { item.mesh.visible = !sky || i === 0 || i >= 5 })
  for (const item of chunk.strips) {
    const position = item.mesh.geometry.getAttribute('position') as T.BufferAttribute, uv = item.mesh.geometry.getAttribute('uv') as T.BufferAttribute
    for (let i = 0; i <= SEGMENTS; i++) for (let edge = 0; edge < 2; edge++) { const p = local(start + i * ROAD_STEP, edge ? item.to : item.from); position.setXYZ(i * 2 + edge, p.x, p.y + item.lift, p.z); uv.setY(i * 2 + edge, ((start % 4) + i * ROAD_STEP) / 4) }
    position.needsUpdate = uv.needsUpdate = true; item.mesh.geometry.computeVertexNormals(); item.mesh.geometry.computeBoundingSphere()
  }
  const r = (k: number) => roadRandom(index * 131 + k, seed)
  let blocks = 0, signs = 0, glows = 0, streaks = 0
  const sign = (design: SignDesign, x: number, y: number, z: number, w: number, h: number, yaw: number, lateral: number, along: number, k: number) => {
    if (signs >= 64) return
    put(chunk.signs.mesh, signs, x, y, z, w, h, 1, yaw)
    chunk.signs.rect.setXYZW(signs, ...design.rect); const gain = future ? 1.1 + r(k) * .55 : 1.4 + r(k) * 1.4; chunk.signs.gain.setXYZ(signs, gain, gain, gain); chunk.signs.seed.setX(signs, index * 7.31 + k)
    signs++
    // Halo in the rain haze, and the sign's smear on the wet road below.
    if (glows < 64) { put(chunk.glows, glows, x, y, z, w * 1.9 + 1, h * 1.45 + 1, 1, yaw); chunk.glows.setColorAt(glows++, c.copy(design.tint).multiplyScalar(future ? .48 : .9)) }
    if (streaks < 64) { const p = local(along, lateral * .55); put(chunk.streaks, streaks, p.x, p.y + .03, p.z, Math.min(2.2, w * 1.3 + .4), 5 + y * .9, 1, p.yaw, -Math.PI / 2); chunk.streaks.setColorAt(streaks++, c.copy(design.tint).multiplyScalar(future ? .3 : .55 + r(k + 50) * .35)) }
  }
  // Street wall: back-to-back mid-rise blocks on both sides, each with a lit storefront, awning and neon.
  if (!sky) for (const side of [-1, 1]) {
    let along = start + r(side > 0 ? 1 : 2) * 4
    while (along < start + CHUNK_LENGTH - 6 && blocks < 16) {
      const k = Math.round(along * 3.1) + (side > 0 ? 0 : 5000), width = 11 + r(k) * 11, depth = 14 + r(k + 1) * 8, height = 16 + Math.pow(r(k + 2), 1.4) * 40
      const mid = along + width / 2, p = local(mid, side * (FACADE + depth / 2)), face = local(mid, side * FACADE), yaw = face.yaw
      put(chunk.blocks, blocks, p.x, p.y + height / 2, p.z, depth, height, width - .3, yaw)
      chunk.blocks.setColorAt(blocks, c.set(['#1d1b22', '#241e25', '#1a1e24', '#2a2226'][Math.floor(r(k + 3) * 4)]))
      const front = local(mid, side * (FACADE - .04)), warm = r(k + 4), shut = r(k + 17) > .82
      put(chunk.fronts, blocks, front.x, front.y + 1.95, front.z, width * .82, 3.3, 1, yaw - side * Math.PI / 2)
      // Glass tint per shop; a few are closed with the lights low.
      chunk.fronts.setColorAt(blocks, c.set(warm > .7 ? '#ffb27a' : warm > .45 ? '#ff8fd2' : warm > .2 ? '#8eeaff' : '#eef2ff').multiplyScalar(shut ? .12 : .62))
      const aw = local(mid, side * (FACADE - .85))
      put(chunk.awnings, blocks, aw.x, aw.y + 3.85, aw.z, 1.7, .12, width * .82, yaw, 0)
      chunk.awnings.setColorAt(blocks, c.set(['#7a1d2c', '#173f4a', '#3a1d55', '#5a4a1a'][Math.floor(r(k + 5) * 4)]))
      blocks++
      const facing = yaw - side * Math.PI / 2
      // Shop sign over the awning, facing the street.
      const shop = atlas.horizontal[Math.floor(r(k + 6) * atlas.horizontal.length)], sw = Math.min(width * .78, 9), sp = local(mid, side * (FACADE - .1))
      sign(shop, sp.x, sp.y + 4.9, sp.z, sw, sw / 4, facing, side * FACADE, mid, k + 6)
      // Vertical blades sticking out over the sidewalk, readable to the approaching driver.
      const blades = future ? (r(k + 7) > .38 ? 1 : 0) : r(k + 7) > .25 ? (r(k + 8) > .55 ? 2 : 1) : 0
      for (let b = 0; b < blades; b++) {
        const design = atlas.vertical[Math.floor(r(k + 9 + b) * atlas.vertical.length)], at = along + width * (b ? .78 : .22), bh = 3 + r(k + 11 + b) * 3.5, by = 6 + r(k + 13 + b) * (future ? Math.min(8, Math.max(1, height - bh - 9)) : Math.max(1, height - bh - 9))
        const bp = local(at, side * (FACADE - .75))
        sign(design, bp.x, bp.y + by + bh / 2, bp.z, 1.05, bh, bp.yaw, side * (FACADE - .75), at, k + 9 + b)
      }
      // Some blocks carry a big rooftop-level sign on the facade.
      if (height > 30 && r(k + 15) > .55) { const big = atlas.horizontal[Math.floor(r(k + 16) * atlas.horizontal.length)], bw = future ? Math.min(width * .7, 8) : Math.min(width * .85, 12), bp = local(mid, side * (FACADE - .1)); sign(big, bp.x, bp.y + (future ? Math.min(18, height - 3.5) : height - 3.5), bp.z, bw, bw / 4, facing, side * FACADE, mid, k + 16) }
      along += width
    }
  }
  chunk.blocks.count = chunk.fronts.count = chunk.awnings.count = blocks
  chunk.signs.mesh.count = signs; chunk.glows.count = glows; chunk.streaks.count = streaks
  // Overhead cables across the street, street lamps on the curb, centre dashes.
  let cables = 0
  if (!sky) for (let k = 0; k < 4; k++) { const p = local(start + 12 + k * 24 + r(200 + k) * 8); for (let q = 0; q < 3; q++) put(chunk.cables, cables++, p.x, p.y + 8 + k % 2 * 1.4 + q * .5, p.z, FACADE * 2, .035, .035, p.yaw) }
  chunk.cables.count = cables
  let lamps = 0
  if (!sky) for (let k = 0; k < 4; k++) for (const side of [-1, 1]) {
    if (lamps >= 8) break
    const at = start + 8 + k * 24 + (side > 0 ? 12 : 0), pole = local(at, side * (ROAD + .8)), head = local(at, side * (ROAD - .6))
    put(chunk.poles, lamps, pole.x, pole.y + 3.6, pole.z, .14, 7.2, .14, pole.yaw)
    put(chunk.heads, lamps, head.x, head.y + 7.15, head.z, 1.6, .12, .45, head.yaw)
    chunk.heads.setColorAt(lamps, c.set(side > 0 ? '#ffd2a0' : '#cfe6ff').multiplyScalar(1.3)); lamps++
  }
  chunk.poles.count = chunk.heads.count = lamps
  for (let i = 0; i < 24; i++) { const p = local(start + i * 4 + 1, -2.05); put(chunk.marks, i, p.x, p.y + .025, p.z, .12, .015, 1.8, p.yaw); chunk.marks.setColorAt(i, c.set('#e8e4da').multiplyScalar(.8)) }
  chunk.marks.count = 24
  // Megastructures behind the street wall.
  let towers = 0, bands = 0, spires = 0
  for (let k = 0; k < (sky ? 3 : 6); k++) for (const side of [-1, 1]) {
    if (towers > 24) break
    const h = r(k * 7 + (side > 0 ? 3 : 0)), along = start + 8 + k * 16 + r(k * 5 + side) * 6, width = 20 + r(k * 11 + side) * 30, depth = 20 + r(k * 13 + side) * 24
    const lateral = side * (sky ? 220 + h * 160 : FACADE + 26 + depth / 2 + h * 140), p = local(along, lateral)
    let height = sky ? 55 + Math.pow(r(k * 17 + side), 1.5) * 110 : 70 + Math.pow(r(k * 17 + side), 1.5) * 230, base = 0, scale = 1
    const tiers = 1 + Math.floor(r(k * 19 + side) * 3), chrome = r(k * 23 + side) > .8
    for (let t = 0; t < tiers && towers < 28; t++) {
      const top = base + height * (t === tiers - 1 ? 1 : .55 - t * .1)
      put(chunk.towers, towers, p.x, p.y + (base + top) / 2, p.z, depth * scale, top - base, width * scale, p.yaw)
      chunk.towers.setColorAt(towers++, c.set(chrome ? '#4a4d5a' : t % 2 ? '#101118' : '#16151f'))
      put(chunk.bands, bands, p.x, p.y + top + .3, p.z, depth * scale + .4, .5, width * scale + .4, p.yaw)
      chunk.bands.setColorAt(bands++, c.set(t === tiers - 1 ? (side < 0 ? '#ff5ab4' : '#5ad8ff') : '#ffd6a8').multiplyScalar(1.4))
      base = top; scale *= .72
    }
    if (base > 150 && spires < 10) { put(chunk.spires, spires, p.x, p.y + base + 12, p.z, .6, 24, .6, p.yaw); chunk.spires.setColorAt(spires++, c.set('#ff2a3a').multiplyScalar(2)) }
  }
  chunk.towers.count = towers; chunk.bands.count = bands; chunk.spires.count = spires
  // Ground-mounted panels stay below the shortest street-wall roofs. Their posts
  // travel with the same chunk transform as the face, so no unsupported cards float by.
  let supports = 0
  chunk.screens.forEach((screen, k) => {
    // More ads (Luis 2026-10-22): three screens per chunk, most of them lit.
    const posterAvailable=!!holo[holo.length-1]?.userData.poster
    const gtaPoster = posterAvailable&&k === 0 && index % 8 === 0
    const show = !sky && (gtaPoster || r(300 + k) > .2); screen.visible = show; if (!show) return
    const side = k % 2 ? 1 : -1, along = start + (gtaPoster ? 52 : 14 + k * 30), p = local(along, side * (FACADE - 1.4))
    const height=9,width=gtaPoster?7.2:4.5,center=8.5
    screen.position.set(p.x, p.y + center, p.z); screen.rotation.set(0, p.yaw - side * Math.PI / 2 + side * .25, 0)
    screen.scale.set(width,height,1)
    // Frame and posts in the screen's unit space (as when they were its children), then into chunk space.
    const ground=center/height;screen.updateMatrix()
    for (const [x, y, z, sx, sy, sz] of [[0, 0, -.035, 1.04, 1.06, .07], [-.32, -(ground + .5) / 2, -.08, .035, ground - .5, .08], [.32, -(ground + .5) / 2, -.08, .035, ground - .5, .08]]) {
      supportPart.position.set(x, y, z); supportPart.rotation.set(0, 0, 0); supportPart.scale.set(sx, sy, sz); supportPart.updateMatrix()
      chunk.supports.setMatrixAt(supports++, supportPart.matrix.premultiply(screen.matrix))
    }
    screen.material = gtaPoster ? holo[holo.length - 1] : holo[Math.floor(r(340 + k) * (holo.length - (posterAvailable?1:0)))]
    screen.userData.destination=(screen.material as T.Material).userData.destination
    screen.userData.label=(screen.material as T.Material).userData.label
    screen.userData.routeMeters=along
    screen.name = gtaPoster ? 'GtaViBillboard' : screen.userData.destination?'RetrowaveLinkedAd':'RetrowaveBillboard'
  })
  chunk.supports.count = supports
  chunk.pyramids.count = 0
  if (!sky && index % 7 === 3) { const side = r(400) > .5 ? 1 : -1, p = local(start + 40, side * (320 + r(401) * 60)), s = 260 + r(402) * 90; put(chunk.pyramids, 0, p.x, p.y + s * .42, p.z, s, s * .9, s, p.yaw); chunk.pyramids.setColorAt(0, c.set('#2a2433')); chunk.pyramids.count = 1 }
  chunk.stacks.count = 0; chunk.flameBase.length = 0
  if (!sky && index % 3 === 1) for (let k = 0; k < 3; k++) {
    const side = (k + index) % 2 ? 1 : -1, p = local(start + 10 + k * 30, side * (200 + r(410 + k) * 160)), hgt = 120 + r(420 + k) * 70
    put(chunk.stacks, k, p.x, p.y + hgt / 2, p.z, 6, hgt, 6); chunk.flameBase.push({ x: p.x, y: p.y + hgt, z: p.z, s: 12 + r(430 + k) * 8 }); chunk.stacks.count = k + 1
  }
  chunk.flames.count = chunk.flameBase.length * 2
  for (const mesh of [chunk.blocks, chunk.fronts, chunk.awnings, chunk.towers, chunk.bands, chunk.spires, chunk.pyramids, chunk.stacks, chunk.glows, chunk.streaks, chunk.cables, chunk.poles, chunk.heads, chunk.marks, chunk.signs.mesh, chunk.supports]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere() }
  chunk.signs.rect.needsUpdate = chunk.signs.gain.needsUpdate = chunk.signs.seed.needsUpdate = true
  hideEmpty(chunk.blocks, chunk.fronts, chunk.awnings, chunk.towers, chunk.bands, chunk.spires, chunk.pyramids, chunk.stacks, chunk.flames, chunk.glows, chunk.streaks, chunk.cables, chunk.poles, chunk.heads, chunk.marks, chunk.signs.mesh, chunk.supports)
  chunk.index = index; chunk.seed = seed
}

function createFlyers(count: number) {
  const body = new T.InstancedMesh(new T.BoxGeometry(1.8, .7, 4.6), new T.MeshStandardMaterial({ color: '#3a3946', metalness: .8, roughness: .35 }), count)
  const lamp = new T.InstancedMesh(new T.BoxGeometry(1.6, .12, .12), new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), count * 2)
  body.frustumCulled = lamp.frustumCulled = false
  const lanes = Array.from({ length: count }, (_, i) => { const r = (k: number) => roadRandom(9000 + i * 7 + k, 77); return { offset: r(0) * 900 - 250, lateral: (r(1) > .5 ? 1 : -1) * (r(2) * 50), height: 26 + r(3) * 90, speed: (r(4) > .4 ? -1 : 1) * (22 + r(5) * 45) } })
  for (let i = 0; i < count; i++) { lamp.setColorAt(i * 2, c.set('#fff3d6').multiplyScalar(2.4)); lamp.setColorAt(i * 2 + 1, c.set('#ff2a4a').multiplyScalar(2.4)) }
  return { body, lamp, lanes }
}

/** Road traffic from the shared night-drive traffic model, with LED tail bars and headlights. */
function createTraffic(scene: T.Object3D, count: number) {
  const base = scene.clone(true), bounds = new T.Box3().setFromObject(base), size = bounds.getSize(new T.Vector3())
  if (size.x > size.z) base.rotation.y = Math.PI / 2
  base.updateMatrixWorld(true); bounds.setFromObject(base); base.scale.setScalar(4.7 / Math.max(.01, bounds.getSize(size).z)); base.updateMatrixWorld(true); bounds.setFromObject(base)
  const center = bounds.getCenter(new T.Vector3()); base.position.x -= center.x; base.position.y -= bounds.min.y; base.position.z -= center.z
  const owned: T.Material[] = [], tail = new T.MeshBasicMaterial({ color: new T.Color('#ff1c3c').multiplyScalar(3), toneMapped: false }), head = new T.MeshBasicMaterial({ color: new T.Color('#fff4e0').multiplyScalar(3), toneMapped: false }); owned.push(tail, head)
  const bar = new T.BoxGeometry(1.5, .07, .05), lampGeometry = new T.BoxGeometry(.35, .1, .05)
  const cars = Array.from({ length: count }, (_, i) => {
    const car = new T.Group(), body = base.clone(true)
    body.traverse(o => { if (o instanceof T.Mesh) { const tint = (src: T.Material) => { if (!(src instanceof T.MeshStandardMaterial) || !/paint/i.test(src.name)) return src; const mat = src.clone(); mat.color.set(['#151820', '#3a0f1c', '#0f2a33', '#26262a'][i % 4]); mat.roughness = .2; mat.metalness = .6; owned.push(mat); return mat }; o.material = Array.isArray(o.material) ? o.material.map(tint) : tint(o.material) } })
    car.add(body)
    const tb = new T.Mesh(bar, tail); tb.position.set(0, .82, bounds.max.z - center.z + .02); car.add(tb)
    for (const x of [-.6, .6]) { const hl = new T.Mesh(lampGeometry, head); hl.position.set(x, .72, bounds.min.z - center.z - .02); car.add(hl) }
    return car
  })
  return { cars, owned, geometries: [bar, lampGeometry] }
}

/** ?neonfx=noglow,nostreak,norain,nosigns,nofill isolates each effect for performance A/B runs. */
const fxOff = (name: string) => typeof location !== 'undefined' && (new URLSearchParams(location.search).get('neonfx') || '').split(',').includes(name)

/** Rain falls entirely on the GPU: each drop's start point is a static instance attribute and the
 * vertex shader wraps it through a 24 m column around the car, leaning with speed. Drops inside the
 * cabin box are collapsed, so the cockpit stays dry. */
function createRain(count: number) {
  const box = new T.BoxGeometry(.012, 1.1, .012), geometry = new T.InstancedBufferGeometry()
  geometry.setIndex(box.index); geometry.setAttribute('position', box.getAttribute('position'))
  const seeds = new Float32Array(count * 3); for (let i = 0; i < count; i++) seeds.set([(roadRandom(i, 3) - .5) * 36, roadRandom(i, 5) * 24, (roadRandom(i, 7) - .5) * 80 - 15], i * 3)
  geometry.setAttribute('aDrop', new T.InstancedBufferAttribute(seeds, 3)); geometry.instanceCount = count
  const uniforms = { uTime: { value: 0 }, uLean: { value: 0 }, uCar: { value: 2 }, uFade: { value: 1 } }
  const material = new T.ShaderMaterial({ uniforms, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`attribute vec3 aDrop; uniform float uTime, uLean, uCar, uFade; varying float vA;
      void main(){ float y = mod(aDrop.y - uTime * 30., 24.) - .5; float z = mod(aDrop.z + 15. + uTime * 30. * uLean * 1.6 + 40., 80.) - 55.;
        vec3 at = vec3(aDrop.x, y, z); bool cabin = abs(at.x - uCar) < 1.2 && abs(at.z) < 2.6 && at.y < 1.6;
        vec3 p = position; p.z += p.y * uLean; p.y *= 1. + uLean * .4;
        vA = cabin ? 0. : .35 * uFade; gl_Position = projectionMatrix * modelViewMatrix * vec4(at + p * (cabin ? 0. : 1.), 1.); }`,
    fragmentShader: /* glsl */`varying float vA; void main(){ if (vA < .01) discard; gl_FragColor = vec4(.85,.78,1., vA); }` })
  const mesh = new T.Mesh(geometry, material); mesh.frustumCulled = false
  return { mesh, uniforms }
}

export default function NeonWorld({ state, tier = 'high', future = false, radioCampaigns, showAds=true }: { state: MutableRefObject<NightState>; tier?: 'high' | 'medium' | 'low'; future?: boolean;radioCampaigns?:readonly CruiseCampaign[];showAds?:boolean }) {
  // Existing repository CC0 asphalt (Poly Haven, see clean-asphalt/provenance.json), made wet.
  const asphaltSource = useTexture('/real-miami/materials/clean-asphalt/color.webp')
  const trafficAsset = useGLTF('/real-miami/traffic/classic-traffic.glb', false, true)
  const world = useMemo(() => createWorld(asphaltSource,radioCampaigns), [asphaltSource,radioCampaigns])
  useEffect(()=>{for(const chunk of world.chunks)chunk.index=Number.NaN},[showAds,world])
  const cue=useRef<{id:string;label:string;destination:string;until:number}|null>(null),lastCue=useRef(0)
  useEffect(()=>()=>{window.dispatchEvent(new CustomEvent('cruise:retro-ad',{detail:null}))},[])
  useEffect(()=>{if(!new URLSearchParams(location.search).has('diagnostics'))return;const target=window as Window&{__retroAds?:()=>unknown};target.__retroAds=()=>({destinations:world.holo.map(material=>typeof material.userData.destination==='string'?material.userData.destination:null),visibleScreens:world.chunks.reduce((count,chunk)=>count+chunk.screens.filter(screen=>screen.visible).length,0),screens:world.chunks.flatMap(chunk=>chunk.screens.filter(screen=>screen.visible).map(screen=>({meters:screen.userData.routeMeters,destination:screen.userData.destination,supports:chunk.supports.count?2:0,height:screen.scale.y,center:screen.position.y})))});return()=>{delete target.__retroAds}},[world])
  const sample = future ? retrowaveRoadSample : roadSample
  const traffic = useMemo(() => createTraffic(trafficAsset.scene, 5), [trafficAsset.scene])
  const flyers = useMemo(() => createFlyers(40), [])
  // Quality tiers thin the expensive atmosphere: rain density, splash rings, glow halos, flying traffic.
  const rain = useMemo(() => {
    const { mesh, uniforms } = createRain(tier === 'low' ? 700 : tier === 'medium' ? 1400 : 2400)
    const splash = new T.InstancedMesh(new T.RingGeometry(.82, 1, 16).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }), 160)
    splash.instanceColor = new T.InstancedBufferAttribute(new Float32Array(160 * 3), 3); splash.frustumCulled = false
    const rings = Array.from({ length: 160 }, (_, i) => ({ x: 0, z: 0, age: roadRandom(i, 9) * .4 }))
    return { mesh, uniforms, splash, rings }
  }, [tier])
  // Neon spill on the car: one fill light that drifts between magenta and cyan as signs slide past.
  // (One, not two: every extra dynamic light is paid per pixel on a screen-filling car.)
  const spill = useMemo(() => { const a = new T.PointLight('#ff3fa4', 22, 18, 1.6); a.position.set(-5, 4.5, -2); return { a, magenta: new T.Color('#ff3fa4'), cyan: new T.Color('#3fe6ff') } }, [])
  useEffect(() => {
    const s = state.current
    // A busier avenue than the lab: five cars, both lanes, all heading our way.
    while (s.traffic.length < 5) { const id = s.traffic.length; s.traffic.push({ id, distance: s.distance + 120 + id * 140, lateral: id % 2 ? -2 : 2, speed: 18 }) }
  }, [state])
  useEffect(() => () => {
    for (const chunk of world.chunks) { for (const s of chunk.strips) s.mesh.geometry.dispose(); chunk.signs.mesh.geometry.dispose(); for (const mesh of [chunk.blocks, chunk.fronts, chunk.awnings, chunk.towers, chunk.bands, chunk.spires, chunk.pyramids, chunk.stacks, chunk.flames, chunk.glows, chunk.streaks, chunk.cables, chunk.poles, chunk.heads, chunk.marks, chunk.supports]) { mesh.geometry.dispose(); mesh.dispose() } }
    world.geometries.forEach(g => g.dispose()); Object.values(world.materials).forEach(x => x.dispose()); world.holo.forEach(x => x.dispose()); world.ownedTextures.forEach(t => t.dispose())
    traffic.owned.forEach(x => x.dispose()); traffic.geometries.forEach(g => g.dispose())
    for (const mesh of [flyers.body, flyers.lamp, rain.mesh, rain.splash]) { mesh.geometry.dispose(); (mesh.material as T.Material).dispose() }
  }, [world, traffic, flyers, rain])
  useEffect(() => {
    const off = { glow: fxOff('noglow') || tier === 'low', streak: fxOff('nostreak'), signs: fxOff('nosigns') }
    for (const chunk of world.chunks) { chunk.glows.userData.enabled = !off.glow; chunk.streaks.userData.enabled = !off.streak; chunk.signs.mesh.userData.enabled = !off.signs; for (const mesh of [chunk.glows, chunk.streaks, chunk.signs.mesh]) mesh.visible = mesh.userData.enabled && mesh.count > 0 }
    rain.mesh.visible = !future && !fxOff('norain'); rain.splash.visible = !future && !fxOff('norain') && tier !== 'low'; spill.a.visible = !fxOff('nofill')
    flyers.lamp.count = tier === 'low' ? 30 : flyers.lamp.instanceMatrix.count; flyers.body.count = tier === 'low' ? 15 : flyers.lanes.length
  }, [world, rain, spill, flyers, tier, future])
  useFrame(({ clock }, delta) => {
    const s = state.current, origin = sample(s.distance, s.seed), time = clock.elapsedTime, first = Math.floor(s.distance / CHUNK_LENGTH) - CHUNKS_BEHIND
    world.time.value = time
    for (let index = first; index < first + CHUNK_COUNT; index++) {
      const chunk = world.chunks[((index % CHUNK_COUNT) + CHUNK_COUNT) % CHUNK_COUNT]
      if (chunk.index !== index || chunk.seed !== s.seed) { const t0 = performance.now(); fillChunk(chunk, index, s.seed, world.holo, world.atlas, sample, future, world.materials.skyroad, world.materials.road); s.generationMs = performance.now() - t0; s.maxGenerationMs = Math.max(s.maxGenerationMs, s.generationMs); s.chunksGenerated++ }
      const anchor = sample(index * CHUNK_LENGTH, s.seed); chunk.group.position.set(anchor.x - origin.x, anchor.y - origin.y, anchor.z - origin.z)
      chunk.flameBase.forEach((f, k) => { const flick = .75 + .25 * Math.sin(time * 9 + k * 3.1) * Math.sin(time * 3.7 + k), hgt = f.s * (1.4 + .6 * flick); for (let q = 0; q < 2; q++) put(chunk.flames, k * 2 + q, f.x, f.y + hgt / 2, f.z, f.s * .55 * flick, hgt, 1, q * Math.PI / 2) })
      if (chunk.flameBase.length) chunk.flames.instanceMatrix.needsUpdate = true
    }
    if(showAds&&future&&time-lastCue.current>.4){lastCue.current=time;if(!cue.current||time>=cue.current.until){const upcoming=world.chunks.flatMap(chunk=>chunk.screens).filter(screen=>screen.visible&&typeof screen.userData.destination==='string'&&screen.userData.routeMeters>s.distance+12&&screen.userData.routeMeters<s.distance+135).sort((a,b)=>a.userData.routeMeters-b.userData.routeMeters)[0];const next=upcoming?{id:`${upcoming.userData.routeMeters}-${upcoming.userData.destination}`,label:upcoming.userData.label as string,destination:upcoming.userData.destination as string,until:time+9}:null;if(next?.id!==cue.current?.id)window.dispatchEvent(new CustomEvent('cruise:retro-ad',{detail:next?{label:next.label,destination:next.destination}:null}));cue.current=next}}
    world.lit.value = 1.2 + (pulse.source === 'live' ? pulse.energy * .3 : 0)
    world.materials.flames.opacity = .75 + .2 * Math.sin(time * 11)
    world.holo.forEach((x, i) => { x.opacity = .74 + .14 * Math.sin(time * (2.3 + i)) * (Math.sin(time * 17 + i) > .97 ? .2 : 1) })
    { const t = .5 + .5 * Math.sin(s.distance * .045 + time * .4); spill.a.color.copy(spill.magenta).lerp(spill.cyan, t); spill.a.position.x = t > .5 ? 5 : -5; spill.a.intensity = 16 + 10 * Math.sin(time * 1.3 + s.distance * .05) ** 2 }
    s.traffic.forEach((car, i) => { const view = traffic.cars[i]; if (!view) return; const p = sample(car.distance, s.seed); view.position.set(p.x - origin.x + Math.cos(p.yaw) * car.lateral, p.y - origin.y, p.z - origin.z - Math.sin(p.yaw) * car.lateral); view.rotation.y = p.yaw })
    flyers.lanes.forEach((lane, i) => {
      const d = s.distance + ((lane.offset + lane.speed * time) % 1100 + 1100) % 1100 - 300, p = sample(d, s.seed)
      const x = p.x - origin.x + Math.cos(p.yaw) * lane.lateral, y = p.y - origin.y + lane.height, z = p.z - origin.z - Math.sin(p.yaw) * lane.lateral, yaw = p.yaw + (lane.speed > 0 ? 0 : Math.PI)
      put(flyers.body, i, x, y, z, 1, 1, 1, yaw); put(flyers.lamp, i * 2, x - Math.sin(yaw) * 2.35, y, z - Math.cos(yaw) * 2.35, 1, 1, 1, yaw); put(flyers.lamp, i * 2 + 1, x + Math.sin(yaw) * 2.35, y, z + Math.cos(yaw) * 2.35, 1, 1, 1, yaw)
    })
    flyers.body.instanceMatrix.needsUpdate = flyers.lamp.instanceMatrix.needsUpdate = true
    // Heavy rain around the car, slanted by speed, with splash rings on the asphalt.
    const dt = Math.min(delta, .05)
    rain.uniforms.uTime.value = time; rain.uniforms.uLean.value += (Math.min(.7, s.speed / 50) - rain.uniforms.uLean.value) * .05; rain.uniforms.uCar.value = s.lateral
    if(!showAds){for(const chunk of world.chunks)for(const screen of chunk.screens)screen.visible=false; if(cue.current){cue.current=null;window.dispatchEvent(new CustomEvent('cruise:retro-ad',{detail:null}))}}
    rain.uniforms.uFade.value = future ? 0 : 1
    rain.splash.visible = !future && !fxOff('norain') && tier !== 'low'
    if (!rain.splash.visible) return
    rain.rings.forEach((ring, i) => {
      ring.age += dt
      if (ring.age > .42) { ring.age = 0; const along = s.distance - 10 + roadRandom(i + Math.floor(time * 7) * 160, 11) * 40, lat = (roadRandom(i + Math.floor(time * 7) * 160, 13) - .5) * ROAD * 2, p = sample(along, s.seed); ring.x = p.x - origin.x + Math.cos(p.yaw) * lat; ring.z = p.z - origin.z - Math.sin(p.yaw) * lat }
      const t = ring.age / .42; put(rain.splash, i, ring.x, .04, ring.z, .02 + t * .11, 1, .02 + t * .11); rain.splash.setColorAt(i, c.setScalar((1 - t) * .22))
    })
    rain.splash.instanceMatrix.needsUpdate = true; rain.splash.instanceColor!.needsUpdate = true
  })
  return <>
    <primitive object={world.group} dispose={null} onClick={(event:ThreeEvent<MouseEvent>)=>{let target:T.Object3D|null=event.object;while(target&&!target.userData.destination)target=target.parent;const destination=target?.userData.destination;if(typeof destination==='string'){event.stopPropagation();window.open(destination,'_blank','noopener,noreferrer')}}} onPointerOver={(event:ThreeEvent<PointerEvent>)=>{let target:T.Object3D|null=event.object;while(target&&!target.userData.destination)target=target.parent;if(target)document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}/>
    {future&&<RetroSkyway state={state} tier={tier}/>}
    {future&&<RetroIsland state={state} tier={tier}/>}
    {traffic.cars.map((car, i) => <primitive key={i} object={car} dispose={null} />)}
    <primitive object={flyers.body} dispose={null} /><primitive object={flyers.lamp} dispose={null} />
    <primitive object={rain.mesh} dispose={null} /><primitive object={rain.splash} dispose={null} />
    <primitive object={spill.a} />
  </>
}
