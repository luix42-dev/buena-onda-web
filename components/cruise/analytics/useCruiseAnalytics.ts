'use client'

import { useCallback, useEffect, useRef } from 'react'
import { trackCruiseEvent } from '@/lib/cruise/analytics'
import type {
  CruiseAdFormat,
  CruiseCamera,
  CruiseCampaign,
  CruiseTimeMode,
  CruiseTimeOfDay,
  CruiseWeather,
} from '@/lib/cruise/types'

const EXPOSURE_FLUSH_MS = 30_000
const MAX_EXPOSURES = 64

export interface CruiseAdViewabilitySample {
  placementId: string
  format: CruiseAdFormat
  campaignId: string
  visible: boolean
  durationMs: number
  projectedArea?: number
  distance?: number
}

export interface CruiseAdCta {
  placementId: string
  format: CruiseAdFormat | 'hud'
  campaignId: string
  destination: string
}

export interface CruiseAnalyticsState {
  active: boolean
  camera: CruiseCamera
  cinematic: boolean
  radioPlaying: boolean
  stationId: string
  timeMode: CruiseTimeMode
  timeOfDay: CruiseTimeOfDay
  weather: CruiseWeather
  campaign: Pick<CruiseCampaign, 'id' | 'analyticsId'>
}

interface ExposureTotal {
  placementId: string
  format: CruiseAdFormat
  campaignId: string
  visibleMs: number
  samples: number
  maxProjectedArea: number
  minDistance: number
}

interface Session {
  startedAt: number
  lastSessionFlushAt: number
  exposures: Map<string, ExposureTotal>
}

type TrackedState = Omit<CruiseAnalyticsState, 'active' | 'campaign'> & {
  campaignId: string
  campaignAnalyticsId: string
}

function nowMs() {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function exposureKey(sample: CruiseAdViewabilitySample) {
  return `${sample.campaignId}:${sample.format}:${sample.placementId}`
}

export function useCruiseAnalytics(state: CruiseAnalyticsState) {
  const latest = useRef(state)
  const session = useRef<Session | null>(null)
  const tracked = useRef<TrackedState | null>(null)
  const pendingUnmount = useRef<ReturnType<typeof setTimeout>>()
  latest.current = state

  const flushExposures = useCallback((reason: string) => {
    const current = session.current
    if (!current || current.exposures.size === 0) return

    for (const exposure of current.exposures.values()) {
      trackCruiseEvent('cruise_ad_exposure', {
        measurement: 'estimated_visible_duration',
        placement_id: exposure.placementId,
        format: exposure.format,
        campaign_id: exposure.campaignId,
        visible_seconds: Math.round(exposure.visibleMs / 100) / 10,
        samples: exposure.samples,
        max_projected_area: Math.round(exposure.maxProjectedArea * 10_000) / 10_000,
        min_distance: Number.isFinite(exposure.minDistance)
          ? Math.round(exposure.minDistance * 10) / 10
          : -1,
        reason,
      })
    }
    current.exposures.clear()
  }, [])

  const flushSession = useCallback((reason: string) => {
    const current = session.current
    if (!current) return
    const at = nowMs()
    if (at - current.lastSessionFlushAt < 250 && reason !== 'unmount') return
    current.lastSessionFlushAt = at
    trackCruiseEvent('cruise_session', {
      duration_seconds: Math.max(0, Math.round((at - current.startedAt) / 100) / 10),
      campaign_id: latest.current.campaign.id,
      reason,
    })
  }, [])

  useEffect(() => {
    if (!state.active) return
    clearTimeout(pendingUnmount.current)

    if (!session.current) {
      const startedAt = nowMs()
      const initial = latest.current
      session.current = { startedAt, lastSessionFlushAt: startedAt, exposures: new Map() }
      trackCruiseEvent('cruise_start', {
        campaign_id: initial.campaign.id,
        campaign_analytics_id: initial.campaign.analyticsId,
        camera: initial.camera,
        cinematic: initial.cinematic,
        station_id: initial.stationId,
        time_mode: initial.timeMode,
        time_of_day: initial.timeOfDay,
        weather: initial.weather,
      })
    }

    const interval = window.setInterval(() => flushExposures('interval'), EXPOSURE_FLUSH_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return
      flushExposures('visibility_hidden')
      flushSession('visibility_hidden')
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      // Deferring distinguishes a real unmount from React Strict Mode's effect replay.
      pendingUnmount.current = setTimeout(() => {
        flushExposures('unmount')
        flushSession('unmount')
        session.current = null
        tracked.current = null
      }, 0)
    }
  }, [state.active, flushExposures, flushSession])

  useEffect(() => {
    if (!state.active || !session.current) return
    const next: TrackedState = {
      camera: state.camera,
      cinematic: state.cinematic,
      radioPlaying: state.radioPlaying,
      stationId: state.stationId,
      timeMode: state.timeMode,
      timeOfDay: state.timeOfDay,
      weather: state.weather,
      campaignId: state.campaign.id,
      campaignAnalyticsId: state.campaign.analyticsId,
    }
    const previous = tracked.current

    if (!previous || previous.camera !== next.camera) {
      trackCruiseEvent('cruise_camera', { camera: next.camera })
    }
    if (!previous || previous.cinematic !== next.cinematic) {
      trackCruiseEvent('cruise_cinematic', { enabled: next.cinematic })
    }
    if (!previous || previous.radioPlaying !== next.radioPlaying || previous.stationId !== next.stationId) {
      trackCruiseEvent('cruise_radio', { playing: next.radioPlaying, station_id: next.stationId })
    }
    if (!previous || previous.timeMode !== next.timeMode || previous.timeOfDay !== next.timeOfDay) {
      trackCruiseEvent('cruise_time', { mode: next.timeMode, time_of_day: next.timeOfDay })
    }
    if (!previous || previous.weather !== next.weather) {
      trackCruiseEvent('cruise_weather', { weather: next.weather })
    }
    if (!previous || previous.campaignId !== next.campaignId) {
      trackCruiseEvent('cruise_campaign', {
        campaign_id: next.campaignId,
        campaign_analytics_id: next.campaignAnalyticsId,
      })
    }
    tracked.current = next
  }, [
    state.active,
    state.camera,
    state.campaign.analyticsId,
    state.campaign.id,
    state.cinematic,
    state.radioPlaying,
    state.stationId,
    state.timeMode,
    state.timeOfDay,
    state.weather,
  ])

  const recordAdViewability = useCallback((sample: CruiseAdViewabilitySample) => {
    const current = session.current
    if (!current || !sample.visible || sample.durationMs <= 0 || !Number.isFinite(sample.durationMs)) return
    const key = exposureKey(sample)
    let total = current.exposures.get(key)
    if (!total) {
      if (current.exposures.size >= MAX_EXPOSURES) flushExposures('capacity')
      total = {
        placementId: sample.placementId,
        format: sample.format,
        campaignId: sample.campaignId,
        visibleMs: 0,
        samples: 0,
        maxProjectedArea: 0,
        minDistance: Number.POSITIVE_INFINITY,
      }
      current.exposures.set(key, total)
    }
    total.visibleMs += Math.min(sample.durationMs, EXPOSURE_FLUSH_MS)
    total.samples += 1
    total.maxProjectedArea = Math.max(total.maxProjectedArea, finiteOr(sample.projectedArea, 0))
    total.minDistance = Math.min(total.minDistance, Math.max(0, finiteOr(sample.distance, Number.POSITIVE_INFINITY)))
  }, [flushExposures])

  const trackAdCta = useCallback((cta: CruiseAdCta) => {
    trackCruiseEvent('cruise_ad_cta', {
      placement_id: cta.placementId,
      format: cta.format,
      campaign_id: cta.campaignId,
      destination: cta.destination,
    })
  }, [])

  return { recordAdViewability, trackAdCta, flushExposures }
}
