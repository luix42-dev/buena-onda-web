'use client'

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { _roots } from '@react-three/fiber'
import CruiseScene from '../CruiseScene'
import { DEFAULT_CRUISE_CAMPAIGN } from '@/lib/cruise/campaigns'
import type { CruiseAdFormat, CruiseCampaign, CruiseDirectorShot, CruiseQuality, CruiseVehicleId } from '@/lib/cruise/types'

export type InteractiveCameraMode = 'driver' | 'director' | 'chase'
export type InteractiveWorldProps = {
  vehicleId?: CruiseVehicleId
  cameraMode: InteractiveCameraMode
  paused: boolean
  radioFocused?: boolean
  campaign?: CruiseCampaign
  paint?: string
  quality?: CruiseQuality
  dprLimit?: number
  onReady?: () => void
  onFailure?: () => void
  onShotChange?: (shot: CruiseDirectorShot) => void
  /** Local details only; no exposure, sponsorship outcome or production event is recorded. */
  onAdActivate?: (placementId: string, campaign: CruiseCampaign, format: CruiseAdFormat) => void
}

const noop = () => {}
class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

/** Realtime Original-world companion, not a movable camera for the native film.
 * Mount inside the shell's existing CockpitProvider. No audio hook/provider is created.
 * Original director uses route-qualified 5–18s shots, including billboardReveal.
 * launch=false retains original house billboards; exposure callbacks are inert.
 */
export default function InteractiveWorld({ vehicleId = 'island-trail', cameraMode, paused, radioFocused = false,
  campaign = DEFAULT_CRUISE_CAMPAIGN, paint, quality = 'low', dprLimit = 1, onReady, onFailure, onShotChange, onAdActivate }: InteractiveWorldProps) {
  const container = useRef<HTMLDivElement>(null)
  const live = useRef(true)
  const broken = useRef(false)
  const controls = useRef({ paused, onReady, onFailure, onShotChange, onAdActivate })
  controls.current = { paused, onReady, onFailure, onShotChange, onAdActivate }
  const redraw = useRef<(() => void) | null>(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [shot, setShot] = useState<CruiseDirectorShot>('driver')
  const failure = useCallback(() => {
    // Original Scene's context-loss listener also fires on intentional R3F disposal.
    if (!live.current || broken.current) return
    broken.current = true
    setFailed(true); controls.current.onFailure?.()
  }, [])
  const sceneReady = useCallback(() => { if (live.current) { setReady(true); controls.current.onReady?.() } }, [])
  const reportShot = useCallback((next: CruiseDirectorShot) => {
    if (!live.current) return
    setShot(next); controls.current.onShotChange?.(next)
  }, [])
  const activate = useCallback((id: string, localCampaign: CruiseCampaign, format: CruiseAdFormat) => {
    if (live.current) controls.current.onAdActivate?.(id, localCampaign, format)
  }, [])

  useEffect(() => {
    live.current = true
    let attachRaf = 0, redrawRaf = 0, unsubscribe: (() => void) | undefined
    let ownedRoot: ReturnType<(typeof _roots)['get']>
    const enforce = () => {
      if (!live.current || broken.current || !ownedRoot) return
      const state = ownedRoot.store.getState()
      const stop = controls.current.paused || document.hidden
      const loop = stop ? 'never' : 'always'
      if (state.frameloop !== loop) state.setFrameloop(loop)
    }
    const draw = () => {
      if (!live.current || broken.current || !ownedRoot || document.hidden) return
      enforce()
      const state = ownedRoot.store.getState()
      // Installed Fiber8.18's never-mode advance uses timestamp−clock.elapsedTime.
      // Same timestamp gives delta0: camera/radio updates draw without driving forward.
      if (controls.current.paused) state.advance(state.clock.elapsedTime, false)
    }
    const scheduleDraw = () => {
      if (!live.current || broken.current || redrawRaf) return
      redrawRaf = requestAnimationFrame(() => { redrawRaf = 0; draw() })
    }
    const attach = () => {
      if (!live.current || broken.current) return
      const canvas = container.current?.querySelector('canvas')
      const root = canvas ? _roots.get(canvas) : undefined
      if (!root) { attachRaf = requestAnimationFrame(attach); return }
      ownedRoot = root
      // Canvas reconfiguration can restore its own frameloop after a camera/shot render.
      // Subscribe only to this component's root and restore our pause contract.
      unsubscribe = root.store.subscribe(() => { enforce(); if (controls.current.paused) scheduleDraw() })
      redraw.current = () => { enforce(); scheduleDraw() }
      enforce(); scheduleDraw()
    }
    attach()
    // Suspense assets and physical-radio state can resolve while drawing is paused.
    // Redraw them at delta0; no driving/director clock or radio playback is advanced.
    const timer = setInterval(() => { if (controls.current.paused) scheduleDraw() }, 250)
    const visibility = () => { enforce(); if (!document.hidden) scheduleDraw() }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      live.current = false; clearInterval(timer); cancelAnimationFrame(attachRaf); cancelAnimationFrame(redrawRaf)
      unsubscribe?.(); document.removeEventListener('visibilitychange', visibility); redraw.current = null
    }
  }, [])
  useEffect(() => { redraw.current?.() }, [paused, radioFocused, cameraMode, vehicleId, paint])

  return <div ref={container} data-interactive-world data-interactive-ready={ready} data-interactive-paused={paused}
    data-interactive-camera={cameraMode} data-interactive-shot={shot} style={{ position: 'absolute', inset: 0 }}>
    {!failed && <SceneBoundary onFailure={failure}>
      <CruiseScene camera={cameraMode === 'driver' ? 'driver' : 'chase'} cinematic={cameraMode === 'director'} tv={false}
        radioFocused={radioFocused} reducedMotion={false} quality={quality} dprLimit={dprLimit} adaptive={false}
        campaign={campaign} timeMode="night" timeOfDay="night" weather="clear" vehicleId={vehicleId} paint={paint}
        onVehicleReady={noop} onVehicleFailure={failure} districtRequest={null} onDistrictChange={noop}
        onShotChange={reportShot} onAdViewabilitySample={noop} onAdActivate={activate}
        onDegrade={noop} onReady={sceneReady} onFailure={failure} launch={false} garage={false} measurementsEnabled={false} />
    </SceneBoundary>}
    {failed && <div role="alert" style={{ position: 'absolute', inset: '30% 12%', padding: 24, background: '#171e24', color: '#f5eee8' }}>The realtime companion could not start. Choose the native film or another comparison.</div>}
  </div>
}
