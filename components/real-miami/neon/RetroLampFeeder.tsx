'use client'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, type MutableRefObject } from 'react'
import * as T from 'three'
import type { NightState } from '../nightdrive/state'
import { CHUNK_LENGTH, retrowaveRoadSample, retrowaveSkywayMix } from '../nightdrive/road'
import { paintLamps, setPaintLamps } from '../vehicle/nightPaint'

/** Retrowave has no registered lamp grid (that is the OSM route's), so the black paint had nothing to
 * mirror. This feeds the same virtual-lamp glints from NeonWorld's own layout: the curb lamp heads
 * (exact positions, same per-chunk spacing and colours) plus a band of magenta/cyan sign light along
 * each facade. Recentred on the car like the world is. */
const ROAD = 6.2, FACADE = 10.5, RANGE = 150
const WARM = new T.Color('#ffd2a0'), COOL = new T.Color('#cfe6ff'), PINK = new T.Color('#ff4fb0'), CYAN = new T.Color('#4fe3ff')
type Lamp = { x: number; y: number; z: number; color: T.Color; intensity: number; d: number }

export default function RetroLampFeeder({ state, enabled }: { state: MutableRefObject<NightState>; enabled: boolean }) {
  const scratch = useMemo(() => ({ lamps: Array.from({ length: 96 }, () => ({ x: 0, y: 0, z: 0, color: WARM, intensity: 0, d: 0 })) as Lamp[], eye: new T.Vector3() }), [])
  useEffect(() => () => { paintLamps.uLampCount.value = 0 }, [])
  useFrame(({ camera }) => {
    const s = state.current, origin = retrowaveRoadSample(s.distance, s.seed)
    camera.getWorldPosition(scratch.eye)
    let n = 0
    const add = (at: number, lateral: number, y: number, color: T.Color, intensity: number) => {
      if (n >= scratch.lamps.length) return
      const p = retrowaveRoadSample(at, s.seed), lamp = scratch.lamps[n++]
      lamp.x = p.x - origin.x + Math.cos(p.yaw) * lateral; lamp.y = p.y - origin.y + y; lamp.z = p.z - origin.z - Math.sin(p.yaw) * lateral
      lamp.color = color; lamp.intensity = intensity; lamp.d = scratch.eye.distanceToSquared(lamp)
    }
    const first = Math.floor((s.distance - RANGE) / CHUNK_LENGTH), last = Math.floor((s.distance + RANGE) / CHUNK_LENGTH)
    for (let index = first; index <= last; index++) {
      const start = index * CHUNK_LENGTH
      if (retrowaveSkywayMix(start + CHUNK_LENGTH / 2) > .5) {
        for (let k = 0; k < 8; k++) for (const side of [-1, 1]) add(start + k * 12, side * 6.35, .95, side > 0 ? PINK : CYAN, 1.3)
        continue
      }
      // NeonWorld: four lamp pairs per chunk, the right-hand head 12 m after the left, heads 0.6 m inside the curb.
      for (let k = 0; k < 4; k++) for (const side of [-1, 1]) add(start + 8 + k * 24 + (side > 0 ? 12 : 0), side * (ROAD - .6), 7.15, side > 0 ? WARM : COOL, 1.1)
      // Sign light: storefront blades and awnings, alternating colours along both facades.
      for (let k = 0; k < 6; k++) for (const side of [-1, 1]) add(start + 6 + k * 16 + (side > 0 ? 8 : 0), side * (FACADE - .4), 4.2, (k + (side > 0 ? 1 : 0)) % 2 ? PINK : CYAN, .7)
    }
    const nearest = scratch.lamps.slice(0, n).sort((a, b) => a.d - b.d)
    setPaintLamps(camera, nearest, enabled)
  }, -1)
  return null
}
