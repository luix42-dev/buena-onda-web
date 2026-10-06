'use client'

import { useFrame } from '@react-three/fiber'
import { type MutableRefObject, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { moduleZ } from '@/lib/cruise/constants'
import { CRUISE_ROUTE } from '@/lib/cruise/routes'
import { LAUNCH_PLACEMENTS } from '@/lib/cruise/placements'
import { LAUNCH } from '@/lib/cruise/launch'
import type {
  CruiseAdCreative,
  CruiseAdFormat,
  CruiseCampaign,
  CruiseRuntime,
  CruiseTimeOfDay,
  CruiseWeather,
  CruiseQuality,
} from '@/lib/cruise/types'

export interface CruiseAdViewabilitySample {
  placementId: string
  campaignId: string
  analyticsId: string
  format: CruiseAdFormat
  moduleId: string
  visible: boolean
  viewable: boolean
  distance: number
  facing: number
  projectedArea: number
  visibleDurationMs: number
  sampledAt: number
}

export interface CruiseAdsProps {
  runtime: MutableRefObject<CruiseRuntime>
  campaign: CruiseCampaign
  timeOfDay: CruiseTimeOfDay
  weather: CruiseWeather
  quality?: CruiseQuality
  onViewabilitySample?: (samples: readonly CruiseAdViewabilitySample[]) => void
  onActivate?: (placementId: string, campaign: CruiseCampaign, format: CruiseAdFormat) => void
}

interface AdPlacement {
  id: string
  format: CruiseAdFormat
  moduleId: string
  moduleIndex: number
  localZ: number
  x: number
  y: number
  width: number
  height: number
  rotationY: number
  digital?: boolean
}

interface AdAssets {
  face: THREE.PlaneGeometry
  box: THREE.BoxGeometry
  pole: THREE.CylinderGeometry
  frame: THREE.MeshStandardMaterial
  poleMaterial: THREE.MeshStandardMaterial
  faces: Readonly<Record<CruiseAdFormat, THREE.MeshStandardMaterial>>
  textures: readonly THREE.CanvasTexture[]
}

const SAMPLE_INTERVAL_SECONDS = 1
const MIN_PROJECTED_AREA = 0.0015
const MIN_FACING = 0.16
const MAX_VIEW_DISTANCE = 180
const LOCAL_FACE_NORMAL = new THREE.Vector3(0, 0, 1)

function routeIndex(moduleId: string) {
  const index = CRUISE_ROUTE.findIndex(module => module.id === moduleId)
  if (index < 0) throw new Error(`Unknown Cruise ad route module: ${moduleId}`)
  return index
}

const PLACEMENT_DEFINITIONS: readonly Omit<AdPlacement, 'moduleIndex'>[] = LAUNCH_PLACEMENTS

const PLACEMENTS: readonly AdPlacement[] = PLACEMENT_DEFINITIONS.map(placement => ({
  ...placement,
  moduleIndex: routeIndex(placement.moduleId),
}))

function headlineLines(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const words = value.split(' ')
  const lines: string[] = []
  let line = words[0] ?? ''
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${line} ${words[index]}`
    if (context.measureText(candidate).width <= maxWidth) line = candidate
    else {
      lines.push(line)
      line = words[index]
    }
  }
  lines.push(line)
  return lines.slice(0, 2)
}

function createCreativeTexture(format: CruiseAdFormat, creative: CruiseAdCreative) {
  const portrait = format === 'poster'
  const canvas = document.createElement('canvas')
  canvas.width = portrait ? 512 : 1024
  canvas.height = portrait ? 768 : format === 'wall' ? 560 : 480
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is required for Cruise campaign creatives')

  const width = canvas.width
  const height = canvas.height
  const margin = portrait ? 48 : 58
  context.fillStyle = creative.background
  context.fillRect(0, 0, width, height)
  context.fillStyle = creative.accent
  context.fillRect(0, 0, portrait ? 14 : width, portrait ? height : 13)
  context.strokeStyle = creative.accent
  context.lineWidth = portrait ? 6 : 5
  context.strokeRect(margin * 0.45, margin * 0.45, width - margin * 0.9, height - margin * 0.9)

  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = creative.accent
  context.font = `600 ${portrait ? 23 : 24}px "Space Mono", monospace`
  context.fillText(creative.eyebrow.toUpperCase(), margin, portrait ? 122 : 92)

  const headlineSize = portrait ? 68 : format === 'wall' ? 83 : 92
  context.font = `700 ${headlineSize}px Archivo, Arial, sans-serif`
  context.fillStyle = creative.foreground
  const lines = headlineLines(context, creative.headline.toUpperCase(), width - margin * 2)
  const lineHeight = headlineSize * 0.94
  const startY = portrait ? 292 : lines.length > 1 ? 214 : 258
  lines.forEach((line, index) => context.fillText(line, margin, startY + index * lineHeight))

  context.fillStyle = creative.accent
  context.fillRect(margin, height - (portrait ? 150 : 105), portrait ? 78 : 110, portrait ? 7 : 6)
  context.fillStyle = creative.foreground
  context.font = `500 ${portrait ? 21 : 22}px "Space Mono", monospace`
  context.fillText(creative.footer.toUpperCase(), margin, height - (portrait ? 92 : 58), width - margin * 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

function createAssets(campaign: CruiseCampaign): AdAssets {
  const textures = {
    billboard: createCreativeTexture('billboard', campaign.creatives.billboard),
    wall: createCreativeTexture('wall', campaign.creatives.wall),
    poster: createCreativeTexture('poster', campaign.creatives.poster),
  }
  const faces = {
    billboard: new THREE.MeshStandardMaterial({
      map: textures.billboard, emissiveMap: textures.billboard, emissive: 0xffffff,
      emissiveIntensity: 0.08, roughness: 0.7, metalness: 0.02,
    }),
    wall: new THREE.MeshStandardMaterial({
      map: textures.wall, emissiveMap: textures.wall, emissive: 0xffffff,
      emissiveIntensity: 0.08, roughness: 0.64, metalness: 0.03,
    }),
    poster: new THREE.MeshStandardMaterial({
      map: textures.poster, emissiveMap: textures.poster, emissive: 0xffffff,
      emissiveIntensity: 0.12, roughness: 0.48, metalness: 0.04,
    }),
  }
  return {
    face: new THREE.PlaneGeometry(1, 1),
    box: new THREE.BoxGeometry(1, 1, 1),
    pole: new THREE.CylinderGeometry(1, 1, 1, 8),
    frame: new THREE.MeshStandardMaterial({ color: 0x242928, roughness: 0.72, metalness: 0.42 }),
    poleMaterial: new THREE.MeshStandardMaterial({ color: 0x3f4846, roughness: 0.78, metalness: 0.38 }),
    faces,
    textures: [textures.billboard, textures.wall, textures.poster],
  }
}

function BillboardStructure({ placement, assets }: { placement: AdPlacement; assets: AdAssets }) {
  const poleHeight = Math.max(0.4, placement.y - placement.height / 2)
  return (
    <>
      <mesh geometry={assets.box} material={assets.frame} scale={[placement.width + 0.36, placement.height + 0.36, 0.24]} />
      <mesh geometry={assets.pole} material={assets.poleMaterial} position={[-placement.width * 0.3, -placement.height / 2 - poleHeight / 2, -0.08]} scale={[0.14, poleHeight, 0.14]} />
      <mesh geometry={assets.pole} material={assets.poleMaterial} position={[placement.width * 0.3, -placement.height / 2 - poleHeight / 2, -0.08]} scale={[0.14, poleHeight, 0.14]} />
    </>
  )
}

function WallStructure({ placement, assets }: { placement: AdPlacement; assets: AdAssets }) {
  return <>
    <mesh geometry={assets.box} material={assets.frame} scale={[placement.width + 0.3, placement.height + 0.3, 0.2]} />
    {placement.digital && [-0.35, 0.35].map(side => <mesh key={side} geometry={assets.box} material={assets.poleMaterial} position={[placement.width * side, 0, -0.8]} scale={[0.15, placement.height * 0.65, 1.6]} />)}
  </>
}

function PosterStructure({ placement, assets }: { placement: AdPlacement; assets: AdAssets }) {
  return (
    <>
      <mesh geometry={assets.box} material={assets.frame} scale={[placement.width + 0.2, placement.height + 0.2, 0.18]} />
      <mesh geometry={assets.box} material={assets.poleMaterial} position={[0, -placement.height * 0.67, -0.04]} scale={[0.18, 0.9, 0.15]} />
      <mesh geometry={assets.box} material={assets.poleMaterial} position={[0, -placement.height * 0.88, -0.04]} scale={[placement.width * 0.72, 0.12, 0.48]} />
    </>
  )
}

function PlacementStructure({ placement, assets }: { placement: AdPlacement; assets: AdAssets }) {
  if (placement.format === 'billboard') return <BillboardStructure placement={placement} assets={assets} />
  if (placement.format === 'wall') return <WallStructure placement={placement} assets={assets} />
  return <PosterStructure placement={placement} assets={assets} />
}

export default function CruiseAds({
  runtime,
  campaign,
  timeOfDay,
  weather,
  quality = 'medium',
  onViewabilitySample,
  onActivate,
}: CruiseAdsProps) {
  const assets = useMemo(() => createAssets(campaign), [campaign])
  const surfaces = useRef<Array<THREE.Mesh | null>>([])
  const videos = useRef(new Map<number, { video: HTMLVideoElement; texture: THREE.VideoTexture; material: THREE.MeshStandardMaterial; onError: () => void }>())
  const failed = useRef(new Set<number>())
  const fallback = useMemo(() => {
    const material = assets.faces.billboard.clone()
    material.color.set('#ffffff'); material.emissive.set('#ffffff')
    return material
  }, [assets])
  const releaseVideo = (index: number) => {
    const item = videos.current.get(index)
    if (!item) return
    item.video.pause(); item.video.removeEventListener('error', item.onError)
    item.video.removeAttribute('src'); item.video.load()
    item.texture.dispose(); item.material.dispose(); videos.current.delete(index)
    if (surfaces.current[index]) surfaces.current[index]!.material = fallback
  }
  useEffect(() => {
    let alive = true
    const pool = videos.current, failures = failed.current
    const loaded: THREE.Texture[] = []
    for (const [url, material] of [[campaign.billboardImage, assets.faces.billboard], [campaign.wallImage, assets.faces.wall], [campaign.posterImage, assets.faces.poster], [campaign.digitalFallbackImage, fallback]] as const) {
      if (!url || !url.startsWith('/cruise/campaigns/') || url.includes('..')) continue
      new THREE.TextureLoader().load(url, texture => {
        if (!alive) { texture.dispose(); return }
        loaded.push(texture); texture.colorSpace = THREE.SRGBColorSpace
        material.map = texture; material.emissiveMap = texture; material.needsUpdate = true
      })
    }
    const pauseHidden = () => {
      if (!document.hidden) return
      for (const index of videos.current.keys()) releaseVideo(index)
      // A background gap breaks a continuous visible approach, even with RAF paused.
      visibleSeconds.current.fill(0)
      sampleClock.current = 0
    }
    document.addEventListener('visibilitychange', pauseHidden)
    return () => {
      alive = false; document.removeEventListener('visibilitychange', pauseHidden)
      for (const index of pool.keys()) releaseVideo(index)
      failures.clear(); loaded.forEach(texture => texture.dispose()); fallback.dispose()
      delete document.documentElement.dataset.cruiseVideos
    }
    // Each campaign owns its surfaces, image loads and bounded video pool.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, campaign, fallback])
  const groups = useRef<Array<THREE.Group | null>>(Array.from({ length: PLACEMENTS.length }, () => null))
  const visibleSeconds = useRef(new Float32Array(PLACEMENTS.length))
  const sampleClock = useRef(0)
  const frustum = useMemo(() => new THREE.Frustum(), [])
  const projectionView = useMemo(() => new THREE.Matrix4(), [])
  const worldPosition = useMemo(() => new THREE.Vector3(), [])
  const toCamera = useMemo(() => new THREE.Vector3(), [])
  const worldNormal = useMemo(() => new THREE.Vector3(), [])
  const worldQuaternion = useMemo(() => new THREE.Quaternion(), [])

  useEffect(() => () => {
    assets.face.dispose()
    assets.box.dispose()
    assets.pole.dispose()
    assets.frame.dispose()
    assets.poleMaterial.dispose()
    Object.values(assets.faces).forEach(material => material.dispose())
    assets.textures.forEach(texture => texture.dispose())
  }, [assets])

  useFrame(({ camera, clock }, delta) => {
    const distance = runtime.current.distance
    const cappedDelta = Math.min(delta, 0.1)
    const targetEmission = timeOfDay === 'night'
      ? weather === 'rain' ? 0.68 : 0.52
      : timeOfDay === 'sunset' ? weather === 'rain' ? 0.3 : 0.2
      : weather === 'rain' ? 0.14 : 0.06
    const materialBlend = 1 - Math.exp(-cappedDelta * 2.8)
    assets.faces.billboard.emissiveIntensity = THREE.MathUtils.lerp(assets.faces.billboard.emissiveIntensity, targetEmission, materialBlend)
    assets.faces.wall.emissiveIntensity = THREE.MathUtils.lerp(assets.faces.wall.emissiveIntensity, targetEmission * 0.88, materialBlend)
    assets.faces.poster.emissiveIntensity = THREE.MathUtils.lerp(assets.faces.poster.emissiveIntensity, targetEmission * 1.28, materialBlend)

    projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(projectionView)
    sampleClock.current += cappedDelta
    const candidates: { index: number; distance: number }[] = []

    for (let index = 0; index < PLACEMENTS.length; index += 1) {
      const placement = PLACEMENTS[index]
      const group = groups.current[index]
      if (!group) continue
      group.position.z = moduleZ(placement.moduleIndex, distance) + placement.localZ
      group.getWorldPosition(worldPosition)
      group.getWorldQuaternion(worldQuaternion)
      worldNormal.copy(LOCAL_FACE_NORMAL).applyQuaternion(worldQuaternion)
      toCamera.copy(camera.position).sub(worldPosition)
      const viewDistance = toCamera.length()
      const facing = viewDistance > 0 ? Math.max(0, worldNormal.dot(toCamera.multiplyScalar(1 / viewDistance))) : 0
      const projectedArea = viewDistance > 0
        ? Math.min(1, placement.width * placement.height * camera.projectionMatrix.elements[0] * camera.projectionMatrix.elements[5] / (4 * viewDistance * viewDistance) * facing)
        : 0
      const visible = viewDistance <= MAX_VIEW_DISTANCE && facing >= MIN_FACING && frustum.containsPoint(worldPosition)
      const viewable = visible && projectedArea >= MIN_PROJECTED_AREA
      visibleSeconds.current[index] = viewable ? visibleSeconds.current[index] + cappedDelta : 0
      if (placement.digital && visible && viewDistance < 100 && !failed.current.has(index)) candidates.push({ index, distance: viewDistance })
    }

    const url = campaign.digitalVideo
    const allowed = LAUNCH.videoAds && !document.hidden && quality !== 'low' && url?.startsWith('/cruise/campaigns/') && !url.includes('..')
    const selected = new Set(allowed ? candidates.sort((a, b) => a.distance - b.distance).slice(0, quality === 'high' ? 2 : 1).map(item => item.index) : [])
    for (const index of videos.current.keys()) if (!selected.has(index)) releaseVideo(index)
    for (const index of selected) {
      if (!videos.current.has(index)) {
        const video = document.createElement('video')
        video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'auto'; video.src = url!
        const texture = new THREE.VideoTexture(video); texture.colorSpace = THREE.SRGBColorSpace
        const material = fallback.clone(); material.map = texture; material.emissiveMap = texture
        const onError = () => { failed.current.add(index); releaseVideo(index) }
        video.addEventListener('error', onError)
        videos.current.set(index, { video, texture, material, onError })
        void video.play().catch(() => { if (videos.current.get(index)?.video === video) onError() })
      }
      const item = videos.current.get(index)
      if (item && surfaces.current[index]) {
        item.material.emissiveIntensity = targetEmission
        surfaces.current[index]!.material = item.video.readyState >= 2 ? item.material : fallback
      }
    }
    fallback.emissiveIntensity = targetEmission
    document.documentElement.dataset.cruiseVideos = JSON.stringify({ quality, active: videos.current.size, videos: [...videos.current.entries()].map(([index, item]) => ({ placement: PLACEMENTS[index].id, currentTime: item.video.currentTime, paused: item.video.paused, ready: item.video.readyState })), failed: [...failed.current] })

    if (sampleClock.current < SAMPLE_INTERVAL_SECONDS || !onViewabilitySample) return
    sampleClock.current %= SAMPLE_INTERVAL_SECONDS
    const sampledAt = Math.round(clock.elapsedTime * 1000)
    const samples: CruiseAdViewabilitySample[] = []
    for (let index = 0; index < PLACEMENTS.length; index += 1) {
      const placement = PLACEMENTS[index]
      const group = groups.current[index]
      if (!group) continue
      group.getWorldPosition(worldPosition)
      group.getWorldQuaternion(worldQuaternion)
      worldNormal.copy(LOCAL_FACE_NORMAL).applyQuaternion(worldQuaternion)
      toCamera.copy(camera.position).sub(worldPosition)
      const viewDistance = toCamera.length()
      const facing = viewDistance > 0 ? Math.max(0, worldNormal.dot(toCamera.multiplyScalar(1 / viewDistance))) : 0
      const projectedArea = viewDistance > 0
        ? Math.min(1, placement.width * placement.height * camera.projectionMatrix.elements[0] * camera.projectionMatrix.elements[5] / (4 * viewDistance * viewDistance) * facing)
        : 0
      const visible = viewDistance <= MAX_VIEW_DISTANCE && facing >= MIN_FACING && frustum.containsPoint(worldPosition)
      samples.push({
        placementId: placement.id,
        campaignId: campaign.id,
        analyticsId: campaign.analyticsId,
        format: placement.format,
        moduleId: placement.moduleId,
        visible,
        viewable: visible && projectedArea >= MIN_PROJECTED_AREA,
        distance: Math.round(viewDistance * 10) / 10,
        facing: Math.round(facing * 1000) / 1000,
        projectedArea: Math.round(projectedArea * 10000) / 10000,
        visibleDurationMs: Math.round(visibleSeconds.current[index] * 1000),
        sampledAt,
      })
    }
    onViewabilitySample(samples)
  })

  return (
    <group dispose={null}>
      {PLACEMENTS.map((placement, index) => (
        <group
          key={placement.id}
          ref={group => { groups.current[index] = group }}
          position={[placement.x, placement.y, moduleZ(placement.moduleIndex, runtime.current.distance) + placement.localZ]}
          rotation-y={placement.rotationY}
        >
          <PlacementStructure placement={placement} assets={assets} />
          <mesh
            ref={mesh => { surfaces.current[index] = mesh }}
            geometry={assets.face}
            material={placement.digital ? fallback : assets.faces[placement.format]}
            position={[0, 0, 0.14]}
            scale={[placement.width, placement.height, 1]}
            onClick={(event) => {
              event.stopPropagation()
              onActivate?.(placement.id, campaign, placement.format)
            }}
          />
        </group>
      ))}
    </group>
  )
}
