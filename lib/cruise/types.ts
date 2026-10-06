export type CruiseCamera = 'chase' | 'hood' | 'driver' | 'side' | 'lowRear'
export type CruiseDirectorShot =
  | CruiseCamera
  | 'rearQuarter'
  | 'wideRear'
  | 'skyline'
  | 'billboardReveal'
export type CruiseQuality = 'low' | 'medium' | 'high'
export type CruiseTimeOfDay = 'day' | 'sunset' | 'night'
export type CruiseTimeMode = CruiseTimeOfDay | 'auto'
export type CruiseWeather = 'clear' | 'rain'
export type CruiseVehicleId = 'coastal-coupe' | 'classic-coupe' | 'island-trail'
export type CruiseVector3 = readonly [number, number, number]
export interface CruiseCameraAnchor {
  position: CruiseVector3
  target: CruiseVector3
}
export interface CruiseVehicleTransform {
  position: CruiseVector3
  rotation?: CruiseVector3
}
export interface VehicleDefinition {
  id: CruiseVehicleId
  label: string
  model: string
  lowModel?: string
  scale: number
  rotation: CruiseVector3
  groundOffset: number
  wheels: readonly { node: string; radius: number; axis: CruiseVector3; steering?: boolean }[]
  cameraAnchors: Readonly<Record<CruiseCamera, CruiseCameraAnchor>>
  driverSeat: CruiseVehicleTransform | null
  cockpitTransform?: CruiseVehicleTransform
  steeringWheelNode: string | null
  radioTargets: { tuning: CruiseVector3; preset: CruiseVector3; volume: CruiseVector3 } | null
  lightControlTarget: CruiseVector3 | null
  popupLidNodes: readonly string[]
  lampNodes: readonly string[]
  materialOverrides?: Readonly<Record<string, { color?: string; roughness?: number; metalness?: number; opacity?: number }>>
  soundProfile: 'coupe' | 'classic'
}
export type CruiseWorldFamily = 'coastal' | 'downtown' | 'causeway' | 'highway' | 'residential'
export type CruiseDistrict = 'south-beach' | 'beach-transition' | 'causeway' | 'waterfront' | 'downtown' | 'brickell' | 'highway' | 'airport-industrial' | 'biscayne-midtown'
export interface CruiseDistrictRequest { id: CruiseDistrict; revision: number }
export type CruiseRouteModuleKind =
  | 'coastal'
  | 'coastal-to-downtown'
  | 'downtown'
  | 'downtown-to-causeway'
  | 'causeway'
  | 'causeway-to-highway'
  | 'highway'
  | 'highway-to-downtown'
  | 'neon'
  | 'downtown-to-residential'
  | 'residential'
  | 'residential-to-coastal'
  | 'beach'
  | 'waterfront'
  | 'brickell'
  | 'industrial'
  | 'midtown'
  | 'family-transition'

export interface CruiseRouteModule {
  id: string
  family: CruiseWorldFamily
  district: CruiseDistrict
  kind: CruiseRouteModuleKind
  transitionTo?: CruiseWorldFamily
  shots: readonly CruiseDirectorShot[]
}

export type CruiseAdFormat = 'billboard' | 'wall' | 'poster'

export interface CruiseAdCreative {
  eyebrow: string
  headline: string
  footer: string
  background: `#${string}`
  foreground: `#${string}`
  accent: `#${string}`
}

export interface CruiseCampaign {
  id: string
  name: string
  analyticsId: string
  destination: `/${string}` | `https://${string}` | null
  activeFrom?: string
  activeUntil?: string
  enabled?: boolean
  priority?: number
  billboardImage?: `/${string}`
  wallImage?: `/${string}`
  posterImage?: `/${string}`
  digitalVideo?: `/${string}`
  digitalFallbackImage?: `/${string}`
  creatives: Readonly<Record<CruiseAdFormat, CruiseAdCreative>>
}

export type CruiseAnalyticsEventName =
  | 'cruise_start'
  | 'cruise_session'
  | 'cruise_camera'
  | 'cruise_cinematic'
  | 'cruise_radio'
  | 'cruise_time'
  | 'cruise_weather'
  | 'cruise_campaign'
  | 'cruise_ad_exposure'
  | 'cruise_ad_cta'
  | 'cruise_place_open'
  | 'cruise_place_outbound'
  | 'cruise_place_share'
  | 'cruise_place_exposure'

export type CruiseAnalyticsValue = string | number | boolean
export type CruiseAnalyticsPayload = Record<string, CruiseAnalyticsValue>

export interface CruiseRuntime {
  /** Meters travelled, wrapped at the fixed world pool length. */
  distance: number
  /** Animation time, bounded to prevent precision loss during long sessions. */
  time: number
  speed: number
}

export interface CruiseQualitySettings {
  dpr: number
  shadows: boolean
  shadowMapSize: number
  palmDetail: number
  trafficCount: number
  pedestriansPerModule: number
  rainParticles: number
}

export type CruiseRadioRights = 'owned' | 'approved' | 'permission-required' | 'external-only'
export type CruiseRadioMood = 'miami-local' | 'leftfield' | 'poolside' | 'night-drive' | 'tropical' | 'ambient' | 'global' | 'guest'
export type CruiseRadioPlayback = 'playlist' | 'stream' | 'hls' | 'embed' | 'external'

export interface CruiseStation {
  id: string
  name: string
  enabled: boolean
  source: string | null
  provider: 'buena-onda' | 'jolt' | 'nts' | 'poolsuite' | 'custom'
  rightsStatus: CruiseRadioRights
  playback: CruiseRadioPlayback
  moods: readonly CruiseRadioMood[]
  externalUrl?: string
  unavailableReason?: string
}

export interface CruiseDiagnostics {
  quality: CruiseQuality
  dpr: number
  geometries: number
  materials: number
  skeletons: number
  environment: string
  textures: number
  programs: number
  calls: number
  triangles: number
  objects: number
  modules: number
  distance: number
  camera: CruiseCamera
  shot: CruiseDirectorShot
  cinematic: boolean
  campaign: string
  timeMode: CruiseTimeMode
  timeOfDay: CruiseTimeOfDay
  weather: CruiseWeather
  worldFamily: CruiseWorldFamily
  district: CruiseDistrict
  routeModule: string
  frames: number
}

declare global {
  interface Window {
    __cruiseDiagnostics?: CruiseDiagnostics
  }
}
