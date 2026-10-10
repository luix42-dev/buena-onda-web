import * as T from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Static-geometry batching for the cockpit: each part is transformed, tinted with a
 * per-vertex colour and merged so a whole material class costs one draw call.
 */
export type Part = { g: T.BufferGeometry; m?: T.Matrix4; c?: T.ColorRepresentation; uv?: [number, number, number, number] }

const _p = new T.Vector3(), _q = new T.Quaternion(), _s = new T.Vector3(), _e = new T.Euler()
/** Matrix from position / euler rotation / scale, optionally pre-multiplied by a parent matrix. */
export function mat(pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0], scale: number | [number, number, number] = 1, parent?: T.Matrix4) {
  const m = new T.Matrix4().compose(_p.set(...pos), _q.setFromEuler(_e.set(...rot)), typeof scale === 'number' ? _s.setScalar(scale) : _s.set(...scale))
  return parent ? parent.clone().multiply(m) : m
}

const _c = new T.Color()
export function mergeParts(parts: Part[]): T.BufferGeometry {
  const indexed = parts.every(p => p.g.index)
  const prepared = parts.map(({ g, m, c, uv }) => {
    let geo = indexed ? g.clone() : (g.index ? g.toNonIndexed() : g.clone())
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name)
    if (!geo.getAttribute('uv')) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2))
    if (uv) { const a = geo.getAttribute('uv'); for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * uv[2], uv[1] + a.getY(i) * uv[3]) }
    if (m) geo.applyMatrix4(m)
    _c.set(c ?? '#ffffff') // ColorManagement converts sRGB input to the linear working space
    const n = geo.getAttribute('position').count, col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b }
    geo.setAttribute('color', new T.BufferAttribute(col, 3))
    if (geo !== g) g.dispose()
    return geo
  })
  const merged = mergeGeometries(prepared, false)!
  prepared.forEach(g => g.dispose())
  merged.computeBoundingSphere()
  return merged
}
