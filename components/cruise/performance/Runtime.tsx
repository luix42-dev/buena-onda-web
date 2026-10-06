'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, SkinnedMesh, type Material, type Skeleton } from 'three'
import { CRUISE_SPEED, MODULE_COUNT, MODULE_LENGTH, WORLD_LENGTH, routeIndexAtDistance } from '@/lib/cruise/constants'
import { CRUISE_ROUTE } from '@/lib/cruise/routes'
import type {
  CruiseCamera,
  CruiseDirectorShot,
  CruiseQuality,
  CruiseRuntime,
  CruiseTimeMode,
  CruiseTimeOfDay,
  CruiseWeather,
  CruiseDistrict,
  CruiseDistrictRequest,
} from '@/lib/cruise/types'

export default function Runtime({ runtime, quality, camera, shot, cinematic, campaign, timeMode, timeOfDay, weather, districtRequest, onDistrictChange, adaptive, onDegrade, onReady }: {
  runtime: MutableRefObject<CruiseRuntime>; quality: CruiseQuality; camera: CruiseCamera
  shot: CruiseDirectorShot; cinematic: boolean; campaign: string
  timeMode: CruiseTimeMode; timeOfDay: CruiseTimeOfDay; weather: CruiseWeather
  adaptive: boolean; onDegrade: () => void; onReady: () => void
  districtRequest: CruiseDistrictRequest | null; onDistrictChange: (district: CruiseDistrict) => void
}) {
  const { gl, scene } = useThree()
  const sample = useRef({ elapsed: 0, frames: 0, warmup: 0, total: 0, ready: false })
  const visible = useRef(true)
  const lastDistrict = useRef<CruiseDistrict | null>(null)
  const resources = useRef({ materials: new Set<Material>(), skeletons: new Set<Skeleton>() })
  useEffect(() => {
    if (!districtRequest) return
    const index = CRUISE_ROUTE.findIndex(module => module.district === districtRequest.id)
    if (index >= 0) runtime.current.distance = index * MODULE_LENGTH
  }, [districtRequest, runtime])
  useEffect(() => {
    const visibility = () => {
      visible.current = !document.hidden
      sample.current.elapsed = 0
      sample.current.frames = 0
    }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => { document.removeEventListener('visibilitychange', visibility); delete window.__cruiseDiagnostics }
  }, [])
  useFrame((_, delta) => {
    if (!visible.current) return
    const step = Math.min(delta, 0.05)
    runtime.current.speed = CRUISE_SPEED
    runtime.current.distance = (runtime.current.distance + CRUISE_SPEED * step) % WORLD_LENGTH
    runtime.current.time = (runtime.current.time + step) % 3600
    const value = sample.current
    value.total++
    value.warmup += delta
    if (!value.ready && value.total > 3) { value.ready = true; onReady() }
    value.elapsed += delta
    value.frames++
    if (value.elapsed < 5) return
    let objects = 0
    const counts = resources.current
    counts.materials.clear()
    counts.skeletons.clear()
    scene.traverse(object => {
      objects++
      if (object instanceof Mesh) {
        if (Array.isArray(object.material)) object.material.forEach(material => counts.materials.add(material))
        else counts.materials.add(object.material)
      }
      if (object instanceof SkinnedMesh) counts.skeletons.add(object.skeleton)
    })
    const routeModule = CRUISE_ROUTE[routeIndexAtDistance(runtime.current.distance)]
    if (lastDistrict.current !== routeModule.district) {
      lastDistrict.current = routeModule.district
      onDistrictChange(routeModule.district)
    }
    window.__cruiseDiagnostics = {
      quality, camera, shot, cinematic, campaign, timeMode, timeOfDay, weather,
      dpr: gl.getPixelRatio(), geometries: gl.info.memory.geometries,
      materials: counts.materials.size, skeletons: counts.skeletons.size,
      environment: scene.environment?.name || 'none',
      textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0,
      calls: gl.info.render.calls, triangles: gl.info.render.triangles, objects,
      modules: MODULE_COUNT, distance: runtime.current.distance, frames: value.total,
      worldFamily: routeModule.family, district: routeModule.district, routeModule: routeModule.id,
    }
    // Sustained samples only; no oscillating upgrades during an unattended session.
    if (adaptive && value.warmup > 15 && value.frames / value.elapsed < 30) onDegrade()
    value.elapsed = 0
    value.frames = 0
  }, -2)
  return null
}
