'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as T from 'three'
import { mat, mergeParts, type Part } from './merge'

/**
 * Lightweight driving gloves on the wheel rim (2 draw calls total):
 *  - both gloves merged into one geometry in the wheel plane, rotating with the wheel
 *    (clamped, so on full lock the grip "slides" instead of the arms crossing);
 *  - both forearms as a 2-instance InstancedMesh, re-aimed from fixed elbows each frame.
 * Coordinates are the steering column frame: wheel plane = XY, +Z towards the driver.
 */
const GRIP = [Math.PI * .86, Math.PI * .14] // ~9:30 and 2:30
const FOLLOW = .85 // max radians the hands follow the wheel before the grip slides

export default function Hands({ rim, tube, base, drive, gain, elbows }: {
  rim: number; tube: number; base: T.Matrix4; gain: number
  drive: MutableRefObject<{ wheel?: number; paused: boolean }>
  /** Elbow points in car-local space. */
  elbows: [[number, number, number], [number, number, number]]
}) {
  const gloves = useMemo(() => {
    const parts: Part[] = []
    const glove = '#c08a58', stitch = '#8a5634'
    for (const a of GRIP) {
      const left = Math.cos(a) < 0
      // Hand frame on the rim: X = radial (outwards), Y = tangent, Z = towards driver.
      const frame = mat([Math.cos(a) * rim, Math.sin(a) * rim, 0], [0, 0, a])
      // Fingers: a flattened torus arc wrapped around the rim tube (axis along the tangent).
      parts.push({ g: new T.TorusGeometry(tube + .011, .0105, 8, 14, Math.PI * 1.3), m: mat([0, 0, 0], [Math.PI / 2, 0, Math.PI * 1.2], [1, 1, 3.3], frame), c: glove })
      // Back of the hand, resting on the driver side of the rim.
      parts.push({ g: new T.SphereGeometry(1, 12, 8), m: mat([-.012, 0, tube + .016], [0, 0, 0], [.034, .046, .019], frame), c: glove })
      // Thumb along the inside of the rim.
      parts.push({ g: new T.CapsuleGeometry(.0085, .03, 3, 8), m: mat([-tube - .006, left ? -.022 : .022, .008], [0, 0, left ? -.5 : .5], 1, frame), c: stitch })
      // Cuff.
      parts.push({ g: new T.CylinderGeometry(.026, .028, .03, 12), m: mat([-.03, 0, tube + .03], [Math.PI / 2, 0, 0], [1, 1, .8], frame), c: stitch })
    }
    return mergeParts(parts)
  }, [rim, tube])

  const forearm = useMemo(() => {
    // Unit-height tapered cylinder, y = 0 at the elbow, y = 1 at the wrist; tan gauntlet cuff, navy linen sleeve.
    const g = new T.CylinderGeometry(.021, .033, 1, 12, 4, false).translate(0, .5, 0)
    const pos = g.getAttribute('position'), col = new Float32Array(pos.count * 3), sleeve = new T.Color('#2f3a58'), cuff = new T.Color('#a8754a')
    for (let i = 0; i < pos.count; i++) (pos.getY(i) > .7 ? cuff : sleeve).toArray(col, i * 3)
    g.setAttribute('color', new T.BufferAttribute(col, 3))
    return g
  }, [])
  useEffect(() => () => { gloves.dispose(); forearm.dispose() }, [gloves, forearm])

  const material = useMemo(() => new T.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: 0 }), [])
  useEffect(() => () => material.dispose(), [material])

  const elbowLocal = useMemo(() => { const inv = base.clone().invert(); return elbows.map(e => new T.Vector3(...e).applyMatrix4(inv)) }, [base, elbows])
  const wristRest = useMemo(() => GRIP.map(a => new T.Vector3(Math.cos(a) * (rim - .03), Math.sin(a) * (rim - .03), tube + .045)), [rim, tube])

  const hands = useRef<T.Group>(null), arms = useRef<T.InstancedMesh>(null)
  const scratch = useMemo(() => ({ w: new T.Vector3(), d: new T.Vector3(), q: new T.Quaternion(), s: new T.Vector3(), m: new T.Matrix4(), up: new T.Vector3(0, 1, 0) }), [])
  useFrame(() => {
    const angle = Math.max(-FOLLOW, Math.min(FOLLOW, -(drive.current.wheel ?? 0) * gain))
    if (hands.current) hands.current.rotation.z = angle
    const im = arms.current; if (!im) return
    const c = Math.cos(angle), s = Math.sin(angle)
    for (let i = 0; i < 2; i++) {
      const r = wristRest[i], e = elbowLocal[i]
      scratch.w.set(r.x * c - r.y * s, r.x * s + r.y * c, r.z)
      scratch.d.subVectors(scratch.w, e); const len = scratch.d.length(); scratch.d.multiplyScalar(1 / len)
      scratch.q.setFromUnitVectors(scratch.up, scratch.d)
      im.setMatrixAt(i, scratch.m.compose(e, scratch.q, scratch.s.set(1, len, 1)))
    }
    im.instanceMatrix.needsUpdate = true
  })

  return <>
    <group ref={hands}><mesh geometry={gloves} material={material} /></group>
    <instancedMesh ref={arms} args={[forearm, material, 2]} frustumCulled={false} />
  </>
}
