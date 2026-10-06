'use client'

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { CruiseAds, type CruiseAdViewabilitySample } from './ads'
import CruiseAtmosphere from './atmosphere/CruiseAtmosphere'
import CameraRig from './cameras/CameraRig'
import CruisePeople from './people/CruisePeople'
import Runtime from './performance/Runtime'
import { CruiseTraffic } from './traffic'
import CruiseWorld from './world/CruiseWorld'
import WorldBackdrop from './world/WorldBackdrop'
import HeroCar from './vehicle/HeroCar'
import GarageStage from './garage/GarageStage'
import { LAUNCH } from '@/lib/cruise/launch'
import PlaceLandmarks from './places/PlaceLandmarks'
import { getCruisePlace } from '@/lib/cruise/campaigns'
import { CRUISE_ROUTE } from '@/lib/cruise/routes'
import type { MusicAudio } from '@/lib/cruise/music-audio'
import RetrowaveWorld from './music/RetrowaveWorld'
import MiamiChoreographyRuntime from './music/MiamiChoreographyRuntime'
import { CRUISE_SPEED, HERO_X, QUALITY, MODULE_LENGTH, WORLD_LENGTH } from '@/lib/cruise/constants'
import type {
  CruiseAdFormat,
  CruiseCamera,
  CruiseCampaign,
  CruiseDirectorShot,
  CruiseQuality,
  CruiseRuntime,
  CruiseTimeMode,
  CruiseTimeOfDay,
  CruiseWeather,
  CruiseVehicleId,
  CruiseDistrict,
  CruiseDistrictRequest,
} from '@/lib/cruise/types'

class VehicleBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function CruiseScene({ camera, cinematic, tv, reducedMotion, quality, dprLimit, adaptive, campaign, timeMode, timeOfDay, weather, vehicleId, onVehicleReady, onVehicleFailure, districtRequest, onDistrictChange, onShotChange, onAdViewabilitySample, onAdActivate, onDegrade, onReady, onFailure, music, worldMode = 'miami', launch = false, garage = false, paint, initialPlaceId, onNearbyPlace, measurementsEnabled=true, radioFocused=false }: {
  radioFocused?: boolean
  measurementsEnabled?: boolean
  initialPlaceId?: string; onNearbyPlace?: (id: string | null) => void
  launch?: boolean; garage?: boolean; paint?: string
  music?: MusicAudio; worldMode?: 'miami' | 'retrowave'
  camera: CruiseCamera; cinematic: boolean; tv: boolean; reducedMotion: boolean; quality: CruiseQuality; dprLimit: number; adaptive: boolean
  campaign: CruiseCampaign
  timeMode: CruiseTimeMode; timeOfDay: CruiseTimeOfDay; weather: CruiseWeather
  vehicleId: CruiseVehicleId; onVehicleReady: () => void; onVehicleFailure: () => void
  districtRequest: CruiseDistrictRequest | null; onDistrictChange: (district: CruiseDistrict) => void
  onShotChange: (shot: CruiseDirectorShot) => void
  onAdViewabilitySample: (samples: readonly CruiseAdViewabilitySample[]) => void
  onAdActivate: (placementId: string, campaign: CruiseCampaign, format: CruiseAdFormat) => void
  onDegrade: () => void; onReady: () => void; onFailure: () => void
}) {
  const runtime = useRef<CruiseRuntime>({ distance: 0, time: 0, speed: CRUISE_SPEED })
  const approached = useRef(false)
  useEffect(() => {
    if (garage || approached.current) return
    approached.current = true
    const place = getCruisePlace(initialPlaceId)
    if (place) {
      const index = CRUISE_ROUTE.findIndex(module => module.id === place.anchor.moduleId)
      runtime.current.distance = (index * MODULE_LENGTH - place.anchor.localZ - 115 + WORLD_LENGTH) % WORLD_LENGTH
    }
  }, [garage, initialPlaceId])
  const settings = QUALITY[quality]
  const [visible, setVisible] = useState(true)
  const [shot, setShot] = useState<CruiseDirectorShot>(camera)
  const handleShotChange = useCallback((nextShot: CruiseDirectorShot) => {
    setShot(nextShot)
    onShotChange(nextShot)
  }, [onShotChange])
  const glOptions = useMemo(() => ({ antialias: true, alpha: false, powerPreference: 'high-performance' as const, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }), [])
  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return <Canvas
    className="cruise-canvas"
    dpr={[0.75, Math.min(settings.dpr, dprLimit)]}
    shadows={settings.shadows}
    frameloop={visible ? 'always' : 'never'}
    camera={{ position: [HERO_X + 1.5, 2.9, 8.2], fov: 49, near: 0.06, far: 550 }}
    gl={glOptions}
    onCreated={({ gl }) => {
      const lost = (event: Event) => { event.preventDefault(); onFailure() }
      gl.domElement.addEventListener('webglcontextlost', lost, { once: true })
    }}
    fallback={<div className="cruise-canvas-fallback" role="alert">3D is unavailable. Open Video Cruise below.</div>}
  >
    {garage && <color attach="background" args={['#171e24']} />}
    {music && <MiamiChoreographyRuntime music={music} runtime={runtime} active={worldMode === 'miami' && !reducedMotion} />}
    {!garage && worldMode === 'miami' && <CruiseAtmosphere timeOfDay={timeOfDay} weather={weather} quality={quality} />}
    <Suspense fallback={null}>
      {garage ? <GarageStage reducedMotion={reducedMotion}><VehicleBoundary key={vehicleId} onFailure={onVehicleFailure}><Suspense fallback={null}><HeroCar vehicleId={vehicleId} onReady={onVehicleReady} runtime={runtime} quality={quality} camera="chase" timeOfDay="day" weather="clear" paint={paint} parked /></Suspense></VehicleBoundary></GarageStage> : <>
      {worldMode === 'retrowave' && music ? <RetrowaveWorld runtime={runtime} music={music} reducedMotion={reducedMotion} /> : <group>
      <WorldBackdrop runtime={runtime} quality={quality} timeOfDay={timeOfDay} weather={weather} />
      <CruiseWorld runtime={runtime} quality={quality} timeOfDay={timeOfDay} weather={weather} music={reducedMotion ? undefined : music} />
      {(!launch || LAUNCH.people) && <CruisePeople runtime={runtime} quality={quality} timeOfDay={timeOfDay} weather={weather} />}
      {(!launch || LAUNCH.traffic) && <CruiseTraffic runtime={runtime} quality={quality} timeOfDay={timeOfDay} weather={weather} />}
      {launch ? <PlaceLandmarks runtime={runtime} timeOfDay={timeOfDay} onNearbyPlace={onNearbyPlace} enabled={measurementsEnabled} /> : <CruiseAds runtime={runtime} campaign={campaign} timeOfDay={timeOfDay} weather={weather} quality={quality}
        onViewabilitySample={onAdViewabilitySample} onActivate={onAdActivate} />}
      </group>}
      <VehicleBoundary key={vehicleId} onFailure={onVehicleFailure}>
        <Suspense fallback={null}>
          <HeroCar vehicleId={vehicleId} onReady={onVehicleReady} runtime={runtime} quality={quality} camera={radioFocused?'driver':shot} timeOfDay={timeOfDay} weather={weather} paint={paint} />
        </Suspense>
      </VehicleBoundary>
      <Runtime runtime={runtime} camera={camera} shot={shot} cinematic={cinematic} campaign={campaign.id} quality={quality}
        districtRequest={districtRequest} onDistrictChange={onDistrictChange}
        timeMode={timeMode} timeOfDay={timeOfDay} weather={weather} adaptive={adaptive}
        onDegrade={onDegrade} onReady={onReady} />
    <CameraRig vehicleId={vehicleId} mode={camera} radioFocused={radioFocused} tv={tv} cinematic={cinematic} reducedMotion={reducedMotion} runtime={runtime} onShotChange={handleShotChange} />
      </>}
    </Suspense>
  </Canvas>
}
