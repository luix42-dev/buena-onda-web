import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as T from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import manifest from '../../public/real-miami/ocean-drive/manifest.json'
import data from '../../public/real-miami/miami/world.json'
import registry from '../../public/real-miami/miami/landmarks.json'

test('adapted frontages preserve mapped edges, exclude landmarks and overlapping parcels', () => {
  assert.equal(manifest.facades.length, 12)
  const signatures = new Set<string>()
  for (const f of manifest.facades) {
    assert.ok(!registry.landmarks.some(l => String(l.osmBuildingId) === String(f.id)))
    const building = data.buildings.find(b => b.id === f.id)!
    const a = building.points[f.edge], b = building.points[(f.edge + 1) % building.points.length]
    assert.ok(Math.abs((a[0] + b[0]) / 2 - f.x) < .001)
    assert.ok(Math.abs((a[1] + b[1]) / 2 - f.z) < .001)
    assert.ok(Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - .5 - f.width) < .001)
    const signature = [f.x, f.z, f.width, f.height].map(v => Math.round(v * 100)).join(':')
    assert.ok(!signatures.has(signature), 'Overlapping frontages must not be baked twice')
    signatures.add(signature)
    assert.ok(manifest.coveredEdges.includes(f.key))
  }
})

test('baked facade geometry stays finite and clear of every drivable road with a bounded render cost', async () => {
  const file = readFileSync(new URL('../../public/real-miami/ocean-drive/facades.glb', import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')
  const segments = data.roads.filter(r => !['footway', 'path', 'cycleway', 'steps'].includes(r.type)).flatMap(r => r.points.slice(1).map((b, i) => ({ a: r.points[i], b, width: r.width || 8 })))
  const distance = (x: number, z: number, s: typeof segments[number]) => {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1]
    const t = T.MathUtils.clamp(((x - s.a[0]) * dx + (z - s.a[1]) * dz) / Math.max(.001, dx * dx + dz * dz), 0, 1)
    return Math.hypot(x - s.a[0] - dx * t, z - s.a[1] - dz * t)
  }
  let meshes = 0, triangles = 0, cells = 0
  gltf.scene.traverse(o => {
    if (o.name.startsWith('OceanDriveCell_')) { cells++; assert.ok(Number.isFinite(o.userData.x) && Number.isFinite(o.userData.z)) }
    if (!(o instanceof T.Mesh)) return
    meshes++
    const p = o.geometry.getAttribute('position'), n = o.geometry.getAttribute('normal')
    const bounds = new T.Box3().setFromBufferAttribute(p as T.BufferAttribute), center = bounds.getCenter(new T.Vector3())
    const nearby = segments.filter(s => distance(center.x, center.z, s) < bounds.getSize(new T.Vector3()).length() + 15)
    for (let i = 0; i < p.count; i++) {
      assert.ok([p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)].every(Number.isFinite))
      assert.ok(nearby.every(s => distance(p.getX(i), p.getZ(i), s) >= s.width / 2 + .58), 'A facade projection intrudes into a driving lane')
    }
    triangles += (o.geometry.index?.count || p.count) / 3
  })
  assert.ok(cells <= 5)
  assert.ok(meshes <= cells * 5)
  assert.ok(triangles < 35000)
  assert.ok(file.byteLength < 2_200_000)
})
