'use client'

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Camera, Clapperboard, Maximize, Minimize, Pause, Play, Radio, Settings2, Sunset, Tv, Video, Volume2, VolumeX, X } from 'lucide-react'
import {
  CAMERA_LABELS,
  CAMERA_ORDER,
  HUD_HIDE_MS,
  QUALITY,
  TIME_LABELS,
  TIME_ORDER,
  WEATHER_LABELS,
  WEATHER_ORDER,
} from '@/lib/cruise/constants'
import { MIAMI_TIME_ZONE, resolveCruiseTime } from '@/lib/cruise/environment'
import { initialQuality } from '@/lib/cruise/quality'
import { VEHICLE_OPTIONS } from '@/lib/cruise/vehicles'
import { DISTRICT_LABELS, REQUIRED_DISTRICTS } from '@/lib/cruise/routes'
import type {
  CruiseAdFormat,
  CruiseCamera,
  CruiseCampaign,
  CruiseDirectorShot,
  CruiseQuality,
  CruiseTimeMode,
  CruiseTimeOfDay,
  CruiseWeather,
  CruiseVehicleId,
  CruiseDistrict,
  CruiseDistrictRequest,
} from '@/lib/cruise/types'
import { useCruiseAudio } from './audio/useCruiseAudio'
import RadioPanel from './RadioPanel'
import { CockpitProvider } from './vehicle/CockpitContext'
import { useCruiseAnalytics } from './analytics'
import type { CruiseAdViewabilitySample } from './ads'
import './cruise.css'
import { MusicAudio } from '@/lib/cruise/music-audio'
import MusicDebug from './music/MusicDebug'

const Scene = dynamic(() => import('./CruiseScene'), { ssr: false })

class SceneBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

function miamiClock() {
  return new Intl.DateTimeFormat('en-US', { timeZone: MIAMI_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
}

export default function CruiseExperience({ campaign, campaignValid, visualTestLayer, musicProof = false }: { campaign: CruiseCampaign; campaignValid: boolean; visualTestLayer?: ReactNode; musicProof?: boolean }) {
  const [music] = useState(() => musicProof ? new MusicAudio() : undefined)
  const [worldMode, setWorldMode] = useState<'miami' | 'retrowave'>('miami')
  const root = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const [started, setStarted] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [hud, setHud] = useState(true)
  const [camera, setCamera] = useState<CruiseCamera>('chase')
  const [shot, setShot] = useState<CruiseDirectorShot>('chase')
  const [cinematic, setCinematic] = useState(false)
  const [timeMode, setTimeMode] = useState<CruiseTimeMode>('sunset')
  const [autoTime, setAutoTime] = useState<CruiseTimeOfDay>('sunset')
  const [weather, setWeather] = useState<CruiseWeather>('clear')
  const [quality, setQuality] = useState<CruiseQuality>('low')
  const [adaptive, setAdaptive] = useState(true)
  const [dprLimit, setDprLimit] = useState(1.75)
  const dprLimitRef = useRef(dprLimit)
  dprLimitRef.current = dprLimit
  const [settings, setSettings] = useState(false)
  const [credits, setCredits] = useState(false)
  const [radioOpen, setRadioOpen] = useState(false)
  const [vehicleId, setVehicleId] = useState<CruiseVehicleId>('coastal-coupe')
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [district, setDistrict] = useState<CruiseDistrict>('south-beach')
  const [districtRequest, setDistrictRequest] = useState<CruiseDistrictRequest | null>(null)
  const [tv, setTv] = useState(false)
  const tvRef = useRef(tv)
  tvRef.current = tv
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [clock, setClock] = useState('')
  const [notice, setNotice] = useState('')
  const audio = useCruiseAudio(music)
  const pauseAudio = audio.pause
  const timeOfDay = timeMode === 'auto' ? autoTime : timeMode
  const { recordAdViewability, trackAdCta } = useCruiseAnalytics({
    active: started && !failed,
    camera,
    cinematic,
    radioPlaying: audio.playing,
    stationId: audio.stationId,
    timeMode,
    timeOfDay,
    weather,
    campaign,
  })
  const handleAdViewability = useCallback((samples: readonly CruiseAdViewabilitySample[]) => {
    for (const sample of samples) {
      recordAdViewability({
        placementId: sample.placementId,
        format: sample.format,
        campaignId: sample.campaignId,
        visible: sample.viewable,
        durationMs: sample.viewable ? 1_000 : 0,
        projectedArea: sample.projectedArea,
        distance: sample.distance,
      })
    }
  }, [recordAdViewability])
  const handleAdActivate = useCallback((placementId: string, selectedCampaign: CruiseCampaign, format: CruiseAdFormat) => {
    if (!selectedCampaign.destination) return
    trackAdCta({
      placementId,
      format,
      campaignId: selectedCampaign.id,
      destination: selectedCampaign.destination,
    })
    window.location.assign(selectedCampaign.destination)
  }, [trackAdCta])
  const handleCampaignCta = useCallback(() => {
    if (!campaign.destination) return
    trackAdCta({ placementId: 'hud-campaign', format: 'hud', campaignId: campaign.id, destination: campaign.destination })
  }, [campaign, trackAdCta])
  const failure = useCallback(() => {
    pauseAudio()
    setFailed(true)
    setReady(false)
    setHud(true)
  }, [pauseAudio])
  const sceneReady = useCallback(() => setReady(true), [])
  const vehicleReady = useCallback(() => setVehicleLoading(false), [])
  const vehicleFailure = useCallback(() => {
    setVehicleId('coastal-coupe')
    setVehicleLoading(false)
    setNotice('Car unavailable. Returned to Coastal Coupe.')
  }, [])

  const showHud = useCallback(() => {
    setHud(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (root.current?.querySelector(':focus-visible')) return
      setHud(false)
    }, HUD_HIDE_MS)
  }, [])

  const cycleCamera = useCallback(() => {
    setTv(false)
    setCinematic(false)
    setCamera(value => CAMERA_ORDER[(CAMERA_ORDER.indexOf(value) + 1) % CAMERA_ORDER.length])
    showHud()
  }, [showHud])

  useEffect(() => {
    const initial = initialQuality()
    setQuality(initial)
    setDprLimit(Math.min(window.devicePixelRatio || 1, QUALITY[initial].dpr))
    const updateClock = () => {
      const now = new Date()
      setClock(miamiClock())
      setAutoTime(resolveCruiseTime('auto', now))
    }
    updateClock()
    setFullscreenAvailable(Boolean(document.documentElement.requestFullscreen))
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    updateMotion()
    motion.addEventListener('change', updateMotion)
    const clockTimer = setInterval(updateClock, 30_000)
    const updateFullscreen = () => {
      const active = Boolean(document.fullscreenElement)
      setFullscreen(active)
      if (!active && tvRef.current) {
        setTv(false)
        setCinematic(false)
        showHud()
      }
    }
    document.addEventListener('fullscreenchange', updateFullscreen)
    const onKey = (event: KeyboardEvent) => {
      showHud()
      if ((event.target as Element)?.closest('input, select, textarea, [contenteditable="true"]')) return
      if (event.key.toLowerCase() === 'c' && !event.repeat) cycleCamera()
      if (event.key === 'Escape') {
        const panelOpen = Boolean(root.current?.querySelector('.cruise-settings'))
        const returnTarget = root.current?.querySelector('.cruise-radio-panel') ? '[aria-label="Radio stations"]' : '[aria-label="Settings"]'
        setTv(false); setCinematic(false); setSettings(false); setCredits(false); setRadioOpen(false)
        if (panelOpen) requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(returnTarget)?.focus())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(clockTimer); clearTimeout(timer.current)
      motion.removeEventListener('change', updateMotion)
      document.removeEventListener('fullscreenchange', updateFullscreen)
      window.removeEventListener('keydown', onKey)
    }
  }, [cycleCamera, showHud])

  useEffect(() => {
    if (ready) showHud()
  }, [ready, showHud])

  useEffect(() => {
    if (!campaignValid) setNotice('Campaign unavailable. Showing Buena Onda.')
  }, [campaignValid])

  useEffect(() => {
    if (!started || ready || failed) return
    const timeout = setTimeout(failure, 35_000)
    return () => clearTimeout(timeout)
  }, [started, ready, failed, failure])

  useEffect(() => {
    if (!vehicleLoading) return
    const timeout = setTimeout(vehicleFailure, 35_000)
    return () => clearTimeout(timeout)
  }, [vehicleLoading, vehicleFailure])

  function start() {
    audio.start()
    setStarted(true)
    try {
      const probe = document.createElement('canvas')
      const context = probe.getContext('webgl2')
      if (!context) { failure(); return }
      context.getExtension('WEBGL_lose_context')?.loseContext()
    } catch { failure() }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await root.current?.requestFullscreen()
    } catch { setNotice('Fullscreen is unavailable in this browser.') }
    showHud()
  }

  function toggleTv() {
    if (tv) { setTv(false); setCinematic(false); showHud(); return }
    setTv(true); setCinematic(true); setCamera('chase'); setSettings(false); setCredits(false); setRadioOpen(false)
    audio.start()
    if (!document.fullscreenElement && root.current?.requestFullscreen) {
      void root.current.requestFullscreen().catch(() => setNotice('TV mode is active in this window.'))
    }
    clearTimeout(timer.current)
    setHud(false)
  }

  function toggleCinematic() {
    setTv(false)
    setCinematic(value => !value)
    setSettings(false)
    setCredits(false)
    setRadioOpen(false)
    showHud()
  }

  const degrade = useCallback(() => {
    if (dprLimitRef.current > 1) setDprLimit(value => Math.max(1, value - 0.25))
    else setQuality(value => value === 'high' ? 'medium' : 'low')
  }, [])
  const visible = hud || settings || credits || radioOpen || failed

  return <CockpitProvider audio={audio} vehicleId={vehicleId} autoLights={timeOfDay === 'night' || weather === 'rain'}><div ref={root} data-cruise data-ready={ready} data-camera={camera} data-shot={shot}
    data-cinematic={cinematic} data-campaign={campaign.id} data-campaign-valid={campaignValid}
    data-quality={quality} data-tv={tv}
    data-vehicle={vehicleId} data-vehicle-ready={!vehicleLoading} data-station={audio.stationId} data-district={district}
    data-time-mode={timeMode} data-time={timeOfDay} data-weather={weather}
    className={`cruise-experience ${ready ? 'is-ready' : ''} ${!visible && started ? 'hud-hidden' : ''}`}
    onPointerMove={showHud} onPointerDown={showHud} onFocusCapture={showHud}>
    {started && !failed && <SceneBoundary onFailure={failure}>
      <Scene camera={camera} cinematic={cinematic} tv={tv} reducedMotion={reducedMotion} quality={quality} dprLimit={dprLimit} adaptive={adaptive}
        music={music} worldMode={worldMode}
        campaign={campaign} vehicleId={vehicleId} onVehicleReady={vehicleReady} onVehicleFailure={vehicleFailure}
        districtRequest={districtRequest} onDistrictChange={setDistrict}
        timeMode={timeMode} timeOfDay={timeOfDay} weather={weather}
        onShotChange={setShot} onAdViewabilitySample={handleAdViewability} onAdActivate={handleAdActivate}
        onDegrade={degrade} onReady={sceneReady} onFailure={failure} />
    </SceneBoundary>}

    {!ready && <div className="cruise-opening">
      <Link className="cruise-back" href="/" aria-label="Back to Buena Onda" title="Back to Buena Onda"><ArrowLeft size={20} /></Link>
      <div className="cruise-ident">
        <p className="cruise-time">MIAMI <span aria-hidden="true">·</span> {clock || 'SUNSET'}</p>
        <h1>Buena Onda<span>Cruise TV</span></h1>
        {!started ? <button type="button" className="cruise-start" onClick={start} disabled={!clock}>CRUISE <ArrowRight size={20} /></button>
          : failed ? <div className="cruise-unavailable" role="alert"><p>3D Cruise is unavailable on this device.</p><a href="/cruise?mode=video">VIDEO CRUISE <ArrowRight size={18} /></a></div>
          : <div className="cruise-loading" role="status"><span />TUNING IN</div>}
      </div>
      <div className="cruise-opening-footer"><span>BUENA ONDA RADIO</span><a href="/cruise?mode=video"><Video size={14} /> Video Cruise</a></div>
    </div>}

    {ready && <>
      {music && <MusicDebug music={music} mode={worldMode} setMode={setWorldMode} />}
      {visualTestLayer}
      {vehicleLoading && <div className="cruise-vehicle-loading" role="status">Loading car...</div>}
      <header className="cruise-hud cruise-header" aria-hidden={!visible} ref={element => { if (element) element.inert = !visible }}>
        <Link href="/" className="cruise-wordmark" title="Back to Buena Onda">Buena Onda<span>CRUISE TV</span></Link>
        <div className="cruise-location"><span>MIAMI <span aria-hidden="true">·</span> {clock}</span><span className="cruise-sunset"><Sunset size={15} /> {TIME_LABELS[timeMode].toUpperCase()} <span aria-hidden="true">·</span> {WEATHER_LABELS[weather].toUpperCase()}</span></div>
      </header>
      <div className="cruise-hud cruise-bottom" aria-hidden={!visible} ref={element => { if (element) element.inert = !visible }}>
        {notice && <p className="cruise-notice" role="status">{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={14} /></button></p>}
        {audio.error && <p className="cruise-notice" role="status">{audio.error}<button type="button" onClick={audio.start}>Retry radio</button></p>}
        <div className="cruise-toolbar">
          <div className="cruise-radio">
            <button type="button" className="cruise-icon cruise-radio-toggle" onClick={audio.toggle} title={audio.playing ? 'Pause radio' : 'Play radio'} aria-label={audio.playing ? 'Pause radio' : 'Play radio'}>
              {audio.playing ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <div className="cruise-station"><button type="button" className="cruise-station-name" onClick={() => { setRadioOpen(!radioOpen); setSettings(false); setCredits(false) }} aria-label="Radio stations" aria-expanded={radioOpen} aria-controls="cruise-radio-panel" title="Radio stations"><Radio size={12} /> {audio.station.name.toUpperCase()}</button><p>{audio.loading ? 'Tuning in...' : audio.trackTitle || (audio.available ? 'On air' : 'Signal unavailable')}</p></div>
          </div>
          <div className="cruise-tools">
            <button type="button" className="cruise-camera-button" onClick={cycleCamera} title="Change camera" aria-label={`Change camera: ${CAMERA_LABELS[camera]}`}><Camera size={18} /><span>{CAMERA_LABELS[camera]}</span></button>
            <span className="cruise-divider" />
            <button type="button" className={`cruise-icon ${cinematic && !tv ? 'selected' : ''}`} onClick={toggleCinematic} title="Cinematic director" aria-label="Cinematic director" aria-pressed={cinematic && !tv}><Clapperboard size={19} /></button>
            <button type="button" className={`cruise-icon ${tv ? 'selected' : ''}`} onClick={toggleTv} title="TV mode" aria-label="TV mode" aria-pressed={tv}><Tv size={20} /></button>
            <button type="button" className="cruise-icon" onClick={() => audio.setMuted(!audio.muted)} title={audio.muted ? 'Unmute sound' : 'Mute sound'} aria-label={audio.muted ? 'Unmute sound' : 'Mute sound'}>{audio.muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
            <input className="cruise-volume" type="range" min="0" max="1" step="0.01" value={audio.volume} onChange={event => { audio.setVolume(Number(event.target.value)); audio.setMuted(false) }} aria-label="Radio volume" />
            <button type="button" className={`cruise-icon ${settings ? 'selected' : ''}`} onClick={() => { setSettings(!settings); setCredits(false); setRadioOpen(false) }} title="Settings" aria-label="Settings" aria-expanded={settings}><Settings2 size={18} /></button>
            {fullscreenAvailable && <button type="button" className="cruise-icon" onClick={() => void toggleFullscreen()} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}</button>}
          </div>
        </div>
        {settings && <section className="cruise-settings" aria-label="Cruise settings">
          <div className="cruise-setting-group">
            <span>TIME</span>
            <div className="cruise-segments">
              {TIME_ORDER.map(mode => <button key={mode} type="button" aria-pressed={timeMode === mode}
                className={timeMode === mode ? 'selected' : ''} onClick={() => setTimeMode(mode)}>{TIME_LABELS[mode]}</button>)}
            </div>
          </div>
          <div className="cruise-setting-group">
            <span>WEATHER</span>
            <div className="cruise-segments cruise-segments-short">
              {WEATHER_ORDER.map(mode => <button key={mode} type="button" aria-pressed={weather === mode}
                className={weather === mode ? 'selected' : ''} onClick={() => setWeather(mode)}>{WEATHER_LABELS[mode]}</button>)}
            </div>
          </div>
          <label>QUALITY<select aria-label="Render quality" value={adaptive ? 'auto' : quality} onChange={event => {
            const value = event.target.value
            const nextQuality = value === 'auto' ? initialQuality() : value as CruiseQuality
            setAdaptive(value === 'auto'); setQuality(nextQuality); setDprLimit(Math.min(window.devicePixelRatio || 1, QUALITY[nextQuality].dpr))
          }}><option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label>CAR<select aria-label="Cruise car" value={vehicleId} disabled={vehicleLoading} onChange={event => {
            const next = event.target.value as CruiseVehicleId
            if (next === vehicleId) return
            setVehicleLoading(true); setVehicleId(next)
          }}>{VEHICLE_OPTIONS.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}</select></label>
          <label>DISTRICT<select aria-label="Cruise district" value={district} onChange={event => {
            const id = event.target.value as CruiseDistrict
            setDistrict(id)
            setDistrictRequest(previous => ({ id, revision: (previous?.revision ?? 0) + 1 }))
          }}>{REQUIRED_DISTRICTS.map(id => <option key={id} value={id}>{DISTRICT_LABELS[id]}</option>)}</select></label>
          <a href="/cruise?mode=video"><Video size={16} /> Video / Cast</a>
          <button type="button" onClick={() => { setCredits(true); setSettings(false) }}>Credits <ArrowRight size={15} /></button>
        </section>}
        {radioOpen && <RadioPanel audio={audio} onClose={() => setRadioOpen(false)} />}
        {credits && <section className="cruise-settings cruise-credits" aria-label="Asset credits"><p><a href="https://poly.pizza/m/SnIoWlh7S2" target="_blank" rel="noreferrer">Mazda RX-7 by IvOfficial</a><br /><a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>. Modified materials and cockpit.</p><button type="button" onClick={() => setCredits(false)} aria-label="Close credits"><X size={18} /></button></section>}
        <div className="cruise-bottomline"><span><i /> {tv ? 'TV MODE' : cinematic ? 'CINEMATIC' : 'MIAMI LOOP'}</span>{campaign.destination ? <a href={campaign.destination} onClick={handleCampaignCta}>PRESENTED BY {campaign.name.toUpperCase()}</a> : <span>BUENA ONDA <span aria-hidden="true">·</span> MIAMI</span>}</div>
      </div>
    </>}
  </div></CockpitProvider>
}
