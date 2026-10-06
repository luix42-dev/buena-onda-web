import * as THREE from 'three'

type GeometryBuffers = {
  positions: number[]
  uvs: number[]
}

function pushTriangle(
  buffers: GeometryBuffers,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  uvA: readonly [number, number],
  uvB: readonly [number, number],
  uvC: readonly [number, number],
) {
  buffers.positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  buffers.uvs.push(...uvA, ...uvB, ...uvC)
}

function addRibbon(
  buffers: GeometryBuffers,
  centers: readonly THREE.Vector3[],
  halfWidths: readonly number[],
  widthAxes: readonly THREE.Vector3[],
) {
  const left: THREE.Vector3[] = []
  const right: THREE.Vector3[] = []
  for (let index = 0; index < centers.length; index += 1) {
    const offset = widthAxes[index].clone().normalize().multiplyScalar(halfWidths[index])
    left.push(centers[index].clone().sub(offset))
    right.push(centers[index].clone().add(offset))
  }
  for (let index = 0; index < centers.length - 1; index += 1) {
    const v0 = index / (centers.length - 1)
    const v1 = (index + 1) / (centers.length - 1)
    pushTriangle(buffers, left[index], right[index], right[index + 1], [0, v0], [1, v0], [1, v1])
    pushTriangle(buffers, left[index], right[index + 1], left[index + 1], [0, v0], [1, v1], [0, v1])
  }
}

/**
 * A unit palm frond compatible with CruiseWorld's segment transform. The rachis
 * runs from y=-0.5 (crown/base) to y=0.5 (tip), so its local +Y is the long axis.
 */
export function createPalmFrondGeometry(): THREE.BufferGeometry {
  const buffers: GeometryBuffers = { positions: [], uvs: [] }
  const rachisSegments = 8
  const rachisCenters: THREE.Vector3[] = []
  const rachisWidths: number[] = []
  const rachisAxes: THREE.Vector3[] = []
  for (let index = 0; index <= rachisSegments; index += 1) {
    const t = index / rachisSegments
    rachisCenters.push(new THREE.Vector3(0, t - 0.5, Math.sin(t * Math.PI) * 0.18 - t * t * 0.25))
    rachisWidths.push(THREE.MathUtils.lerp(0.045, 0.012, t))
    rachisAxes.push(new THREE.Vector3(1, 0, 0.08 * Math.sin(t * Math.PI * 2)))
  }
  addRibbon(buffers, rachisCenters, rachisWidths, rachisAxes)

  const pairs = 18
  for (let pair = 0; pair < pairs; pair += 1) {
    const t = (pair + 1) / (pairs + 2)
    const y = THREE.MathUtils.lerp(-0.39, 0.39, t)
    const rachisZ = Math.sin((y + 0.5) * Math.PI) * 0.18 - (y + 0.5) ** 2 * 0.25
    const envelope = Math.sin(Math.PI * THREE.MathUtils.clamp(t * 0.94 + 0.03, 0, 1))
    const length = 0.5 + envelope * 1.0
    for (const side of [-1, 1] as const) {
      const stagger = side * (pair % 2 === 0 ? 0.006 : -0.006)
      const droop = 0.045 + t * 0.045
      const sweep = 0.065 + t * 0.04
      const centers = [
        new THREE.Vector3(side * 0.025, y + stagger, rachisZ),
        new THREE.Vector3(side * length * 0.56, y + sweep * 0.35 + stagger, rachisZ - droop * 0.3),
        new THREE.Vector3(side * length, y + sweep + stagger, rachisZ - droop),
      ]
      const twist = side * (pair % 3 - 1) * 0.22
      const axes = [
        new THREE.Vector3(0, 1, twist * 0.2),
        new THREE.Vector3(0, 1, twist),
        new THREE.Vector3(0, 1, twist * 1.5),
      ]
      addRibbon(buffers, centers, [0.009, 0.013 * envelope + 0.004, 0.001], axes)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.name = 'arched-palm-frond-160-triangles'
  geometry.userData.axis = '+Y; base at y=-0.5, tip at y=0.5'
  return geometry
}

/** Unit curb: width X, height Y, length Z, with chamfered roadside top edges. */
export function createCurbGeometry(): THREE.BufferGeometry {
  const buffers: GeometryBuffers = { positions: [], uvs: [] }
  const crossSection = [
    new THREE.Vector2(-0.5, -0.5),
    new THREE.Vector2(0.5, -0.5),
    new THREE.Vector2(0.5, 0.29),
    new THREE.Vector2(0.35, 0.5),
    new THREE.Vector2(-0.35, 0.5),
    new THREE.Vector2(-0.5, 0.29),
  ]

  for (let index = 0; index < crossSection.length; index += 1) {
    const next = (index + 1) % crossSection.length
    const a = new THREE.Vector3(crossSection[index].x, crossSection[index].y, -0.5)
    const b = new THREE.Vector3(crossSection[next].x, crossSection[next].y, -0.5)
    const c = new THREE.Vector3(crossSection[next].x, crossSection[next].y, 0.5)
    const d = new THREE.Vector3(crossSection[index].x, crossSection[index].y, 0.5)
    pushTriangle(buffers, a, b, c, [0, 0], [1, 0], [1, 1])
    pushTriangle(buffers, a, c, d, [0, 0], [1, 1], [0, 1])
  }

  const centerFront = new THREE.Vector3(0, 0, 0.5)
  const centerBack = new THREE.Vector3(0, 0, -0.5)
  for (let index = 0; index < crossSection.length; index += 1) {
    const next = (index + 1) % crossSection.length
    const frontA = new THREE.Vector3(crossSection[index].x, crossSection[index].y, 0.5)
    const frontB = new THREE.Vector3(crossSection[next].x, crossSection[next].y, 0.5)
    const backA = new THREE.Vector3(crossSection[index].x, crossSection[index].y, -0.5)
    const backB = new THREE.Vector3(crossSection[next].x, crossSection[next].y, -0.5)
    pushTriangle(buffers, centerFront, frontA, frontB, [0.5, 0.5], [frontA.x + 0.5, frontA.y + 0.5], [frontB.x + 0.5, frontB.y + 0.5])
    pushTriangle(buffers, centerBack, backB, backA, [0.5, 0.5], [backB.x + 0.5, backB.y + 0.5], [backA.x + 0.5, backA.y + 0.5])
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.name = 'unit-chamfered-curb'
  return geometry
}
