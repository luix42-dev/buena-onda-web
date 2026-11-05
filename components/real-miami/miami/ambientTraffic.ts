import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { roadRandom } from '../nightdrive/road'

type Road = { name?: string; type?: string; width: number; points: number[][]; drive?: boolean }
const DRIVEN = new Set(['residential', 'tertiary', 'secondary', 'primary', 'trunk', 'living_street'])

/** Side-street life: cars whose position is a pure function of the clock (segment + speed + phase), so the whole
 * fleet is two instanced draws (bodies, lamps) with no per-car CPU work. Cars run along straight OSM segments
 * and loop. Side streets carry them both ways; on the player's own route they only come the other way, in the
 * opposite lane, so they pass the driver and never share its lane. Excluded from ad occlusion (`noOcclusion`).
 * The map is kilometres wide, so `update` re-seats cars that fall beyond RESEAT_FAR onto segments 150-400 m from the
 * player every 1.5 s (a few attribute writes); between re-seats nothing runs on the CPU. */
const RESEAT_FAR = 420, SPAWN_NEAR = 150, SPAWN_FAR = 400, GRID = 200
export function createAmbientTraffic(roads: readonly Road[], avoidPath: readonly number[][], count: number) {
  // The player's route, as 10 m cells with a one-cell margin: segments that run along it are left to the real traffic;
  // cross streets (only a few samples on the route) keep theirs.
  const onPath = new Set<string>(), cell = (x: number, z: number) => `${Math.floor(x / 10)}:${Math.floor(z / 10)}`
  for (let i = 1; i < avoidPath.length; i++) {
    const [ax, az] = avoidPath[i - 1], [bx, bz] = avoidPath[i], steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 5)
    for (let k = 0; k <= steps; k++) { const x = ax + (bx - ax) * k / steps, z = az + (bz - az) * k / steps; for (const dx of [-10, 0, 10]) for (const dz of [-10, 0, 10]) onPath.add(cell(x + dx, z + dz)) }
  }
  const alongPath = (ax: number, az: number, bx: number, bz: number) => { const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 5); let hits = 0; for (let k = 0; k <= steps; k++) if (onPath.has(cell(ax + (bx - ax) * k / steps, az + (bz - az) * k / steps))) hits++; return hits > steps * .4 }
  // [ax, az, bx, bz, lane offset to the right of travel, oncoming (fixed direction)]
  const segments: [number, number, number, number, number, boolean][] = []
  roads.forEach(road => {
    if (road.drive === false || !DRIVEN.has(road.type || '')) return
    for (let i = 1; i < road.points.length; i++) {
      const [ax, az] = road.points[i - 1], [bx, bz] = road.points[i]
      if (Math.hypot(bx - ax, bz - az) >= 30 && !alongPath(ax, az, bx, bz)) segments.push([ax, az, bx, bz, Math.max(1.6, Math.min(3.2, (road.width || 8) * .22)), false])
    }
  })
  // Oncoming traffic on the route itself, checked in the running drive (2026-10-30): reversed point order, 2.6 m to
  // the right of their travel, which is the far side of the centre line from the driver (who holds 2 m on the other).
  for (let i = 1; i < avoidPath.length; i++) {
    const [ax, az] = avoidPath[i - 1], [bx, bz] = avoidPath[i]
    if (Math.hypot(bx - ax, bz - az) >= 15) segments.push([bx, bz, ax, az, 2.6, true])
  }
  const n = Math.min(count, segments.length * 2)
  const seg = new Float32Array(n * 4), motion = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const [ax, az, bx, bz, offset, fixed] = segments[Math.floor(roadRandom(i, 911) * segments.length)], flip = !fixed && roadRandom(i, 912) < .5
    seg.set(flip ? [bx, bz, ax, az] : [ax, az, bx, bz], i * 4)
    motion.set([7 + roadRandom(i, 913) * 7, roadRandom(i, 914), offset], i * 3)
  }
  const segAttr = new T.InstancedBufferAttribute(seg, 4), motionAttr = new T.InstancedBufferAttribute(motion, 3)
  const grid = new Map<string, number[]>(), mid = (i: number) => [(segments[i][0] + segments[i][2]) / 2, (segments[i][1] + segments[i][3]) / 2]
  segments.forEach((_, i) => { const [x, z] = mid(i), key = `${Math.floor(x / GRID)}:${Math.floor(z / GRID)}`; const list = grid.get(key); if (list) list.push(i); else grid.set(key, [i]) })
  let lastReseat = -Infinity, reseats = 0
  const reseat = (seconds: number, px: number, pz: number, near: number) => {
    const gx = Math.floor(px / GRID), gz = Math.floor(pz / GRID), side: number[] = [], oncoming: number[] = []
    for (let x = gx - 2; x <= gx + 2; x++) for (let z = gz - 2; z <= gz + 2; z++) for (const i of grid.get(`${x}:${z}`) || []) { const [mx, mz] = mid(i), d = Math.hypot(mx - px, mz - pz); if (d >= near && d <= SPAWN_FAR) (segments[i][5] ? oncoming : side).push(i) }
    if (!side.length && !oncoming.length) return
    let moved = false
    for (let i = 0; i < n; i++) {
      const o = i * 4, dx = seg[o + 2] - seg[o], dz = seg[o + 3] - seg[o + 1], L = Math.hypot(dx, dz), u = ((seconds * motion[i * 3] / L + motion[i * 3 + 1]) % 1 + 1) % 1
      if (Math.hypot(seg[o] + dx * u - px, seg[o + 1] + dz * u - pz) <= RESEAT_FAR) continue
      // Half the fleet comes down the driver's own road toward them; the rest fills the side streets.
      const pool = oncoming.length && (!side.length || roadRandom(i, 918 + reseats) < .5) ? oncoming : side
      const [ax, az, bx, bz, offset, fixed] = segments[pool[Math.floor(roadRandom(i, 916 + ++reseats) * pool.length)]], flip = !fixed && roadRandom(reseats, 917) < .5
      seg.set(flip ? [bx, bz, ax, az] : [ax, az, bx, bz], o); motion[i * 3 + 2] = offset; moved = true
    }
    if (moved) { segAttr.needsUpdate = true; motionAttr.needsUpdate = true }
  }

  const part = (w: number, h: number, l: number, y: number, z: number) => { const g = new T.BoxGeometry(w, h, l); g.translate(0, y, z); return g }
  const bodyParts = [part(1.8, .62, 4.4, .55, 0), part(1.56, .48, 2.1, 1.1, -.25)]
  const body = mergeGeometries(bodyParts)!; bodyParts.forEach(g => g.dispose())
  const lampQuads: T.BufferGeometry[] = []
  for (const [z, r, g, b, facing] of [[2.21, 1, .93, .8, 0], [-2.21, 1, .015, .01, Math.PI]] as const) for (const x of [-.62, .62]) {
    const q = new T.PlaneGeometry(.34, .16); q.rotateY(facing); q.translate(x, .66, z)
    q.setAttribute('color', new T.Float32BufferAttribute(new Array(q.getAttribute('position').count).fill(0).flatMap(() => [r, g, b]), 3)); lampQuads.push(q)
  }
  const lamps = mergeGeometries(lampQuads)!; lampQuads.forEach(g => g.dispose())
  for (const geometry of [body, lamps]) { geometry.setAttribute('aSeg', segAttr); geometry.setAttribute('aMotion', motionAttr) }

  const time = { value: 0 }
  const drive = (shader: Parameters<T.Material['onBeforeCompile']>[0]) => {
    shader.uniforms.uTrafficTime = time
    // A helper, not shared locals: MeshBasicMaterial only runs beginnormal_vertex with an env map.
    shader.vertexShader = `attribute vec4 aSeg;
attribute vec3 aMotion;
uniform float uTrafficTime;
vec2 trafficForward() { vec2 d = aSeg.zw - aSeg.xy; return d / length(d); }
vec3 trafficTurn(vec3 v, vec2 f) { return vec3(v.x * f.y + v.z * f.x, v.y, -v.x * f.x + v.z * f.y); }
` + shader.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
objectNormal = trafficTurn(objectNormal, trafficForward());`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vec2 trafficD = aSeg.zw - aSeg.xy, trafficF = trafficForward();
float trafficL = length(trafficD), trafficU = fract(uTrafficTime * aMotion.x / trafficL + aMotion.y);
vec2 trafficAt = aSeg.xy + trafficD * trafficU + vec2(-trafficF.y, trafficF.x) * aMotion.z;
transformed = trafficTurn(transformed * clamp(min(trafficU, 1. - trafficU) * trafficL / 3., 0., 1.), trafficF) + vec3(trafficAt.x, .02, trafficAt.y);`)
  }
  const bodyMaterial = new T.MeshStandardMaterial({ roughness: .35, metalness: .45 })
  const lampMaterial = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  bodyMaterial.onBeforeCompile = drive; lampMaterial.onBeforeCompile = drive
  bodyMaterial.customProgramCacheKey = lampMaterial.customProgramCacheKey = () => 'ambient-traffic'

  const palette = ['#e9e4d8', '#151719', '#7fd3c8', '#d9485a', '#f0b6c1', '#3d5a80', '#c8c2b4', '#262a2e'].map(c => new T.Color(c))
  const bodies = new T.InstancedMesh(body, bodyMaterial, n), lights = new T.InstancedMesh(lamps, lampMaterial, n)
  for (let i = 0; i < n; i++) bodies.setColorAt(i, palette[Math.floor(roadRandom(i, 915) * palette.length)])
  const group = new T.Group(); group.name = 'AmbientTraffic'
  for (const mesh of [bodies, lights]) { mesh.frustumCulled = false; mesh.userData.noOcclusion = true; mesh.raycast = () => {}; group.add(mesh) }
  return {
    group, count: n,
    /** `px`, `pz`: the player in the same (world-group) space as the road points. */
    update(seconds: number, darkness: number, px: number, pz: number) {
      time.value = seconds; lampMaterial.color.setScalar(.35 + darkness * 2.4)
      if (n && seconds - lastReseat > 1.5) { reseat(seconds, px, pz, lastReseat === -Infinity ? 30 : SPAWN_NEAR); lastReseat = seconds }
    },
    dispose() { body.dispose(); lamps.dispose(); bodyMaterial.dispose(); lampMaterial.dispose(); bodies.dispose(); lights.dispose() },
  }
}
