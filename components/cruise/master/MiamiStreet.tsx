'use client'
import { Suspense, useRef, useState, useEffect, useMemo, useCallback, Component, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as T from 'three'
import StreetEnvironment from './StreetEnvironment'
import StreetSky from './StreetSky'
import DriveController, { type DriveState, type StreetCamera, type StreetVehicleId } from './DriveController'
import StreetMetrics, { event, type StreetSample } from './StreetMetrics'
import ConvertibleCar from './ConvertibleCar'
import HeroCar from '../vehicle/HeroCar'
import ImprovedCockpit from '../cockpit-lab/ImprovedCockpit'
import { CockpitProvider } from '../vehicle/CockpitContext'
import { MIAMI_CRUISE_STATIONS, canPlayCruiseStation } from '@/lib/cruise/stations'
import { useCruiseAudio } from '../audio/useCruiseAudio'
import { MusicAudio } from '@/lib/cruise/music-audio'
import { trackCruiseEvent } from '@/lib/cruise/analytics'
import { HERO_X } from '@/lib/cruise/constants'
import type { CruiseRuntime, CruiseVehicleId, CruiseTimeOfDay } from '@/lib/cruise/types'
import { pulse, updatePulse, reducedMotion } from './pulse'
import { KIND_LABEL, avenuePhase, dollars, priceCents, type Plot } from './plots'
import { AvenueDrawer, AvenueTicker, PlotCard, useAvenue, useDriveBys } from './AvenueUI'
import { canPresent, startCast, tvUrl, isPresentationReceiver, listenAsReceiver, type RemoteMessage } from './cast'
import QrCode from './QrCode'
import './master.css'

const RADIO_PRESETS = MIAMI_CRUISE_STATIONS.filter(canPlayCruiseStation)

const businesses = {
  buena: { name: 'Buena Onda Record Store', line: 'Records · Miami', description: 'Vinyl discoveries, independent music and coastal listening sessions.', station: 95, thumb: '/cruise/places/records.svg', url: '/objects' },
  branches: { name: 'Branches Vintage', line: 'Vintage clothing · Miami', description: 'Vintage clothing and carefully collected pieces from another era.', station: 155, thumb: '/cruise/places/branches.svg', url: 'https://branchesvintage.com' },
}
type Business = keyof typeof businesses
const CAMERAS: StreetCamera[] = ['chase', 'driver', 'side', 'aerial', 'low', 'hood']
const CAMERA_LABEL: Record<StreetCamera, string> = { chase: 'Chase', driver: 'Cockpit', side: 'Side', aerial: 'Crane', low: 'Low', hood: 'Hood' }
const TV_SHOTS: [StreetCamera, number][] = [['chase', 16], ['driver', 22], ['side', 9], ['aerial', 12], ['driver', 18], ['low', 8], ['hood', 10]]

function miamiBucket(): CruiseTimeOfDay {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date())) % 24
  return h >= 7 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'sunset' : 'night'
}
const miamiClock = () => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date())

class Guard extends Component<{ children: ReactNode }, { failed: boolean }> { state = { failed: false }; static getDerivedStateFromError() { return { failed: true } } render() { return this.state.failed ? <p role="alert" className="mm-fail">The 3D scene could not load. <a href="/cruise">Return to Cruise</a>.</p> : this.props.children } }

function PulseDriver({ music, playing }: { music: MusicAudio; playing: boolean }) {
  useFrame((_, dt) => updatePulse(music, playing, Math.min(dt, .1)), -3)
  return null
}

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>

/** Five CSS bars driven by the same spectrum as the city (no React re-render per frame). */
function MiniEq({ on }: { on: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let id = 0
    const loop = () => { const bars = ref.current?.children; if (bars) for (let i = 0; i < bars.length; i++) (bars[i] as HTMLElement).style.transform = `scaleY(${on ? reducedMotion() ? .35 : .18 + pulse.spectrum[2 + i * 4] * .9 : .15})`; id = requestAnimationFrame(loop) }
    id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id)
  }, [on])
  return <span className="mm-eq" ref={ref} aria-hidden>{[0, 1, 2, 3, 4].map(i => <i key={i} />)}</span>
}

export default function MiamiStreet({ previewAuthorized = false }: { previewAuthorized?: boolean }) {
  const [tv] = useState(() => typeof window !== 'undefined' && (new URLSearchParams(location.search).has('tv') || isPresentationReceiver()))
  // The car always drives itself. The experience is the ride, not the driving.
  const drive = useRef<DriveState>({ distance: 0, speed: 3.5, lateral: 2, steer: 0, paused: true, glance: 0, autopilot: true })
  const runtime = useRef<CruiseRuntime>({ distance: 0, time: 0, speed: 0 }), car = useRef<T.Group | null>(null), root = useRef<HTMLElement>(null)
  const music = useMemo(() => new MusicAudio(), [])
  const audio = useCruiseAudio(music, MIAMI_CRUISE_STATIONS)
  const [mode, setMode] = useState<StreetCamera>('chase')
  const [vehicle, setVehicle] = useState<StreetVehicleId>('ocean-convertible')
  const [time, setTime] = useState<CruiseTimeOfDay>(() => tv ? miamiBucket() : 'sunset')
  const [hands, setHands] = useState(true), [high, setHigh] = useState(false), [ready, setReady] = useState(false), [running, setRunning] = useState(false)
  const [phase] = useState(() => avenuePhase(undefined, previewAuthorized))
  const [panel, setPanel] = useState<null | 'radio' | 'avenue' | 'cast' | 'menu'>(() => phase !== 'hidden' && typeof window !== 'undefined' && new URLSearchParams(location.search).has('avenue') ? 'avenue' : null)
  const [detail, setDetail] = useState<Business | null>(null), [plotOpen, setPlotOpen] = useState<number | null>(null)
  const [nearby, setNearby] = useState<{ kind: 'business'; id: Business } | { kind: 'plot'; plot: Plot } | null>(null)
  const [stats, setStats] = useState<StreetSample | null>(null), [visible, setVisible] = useState(true)
  const [remote, setRemote] = useState<null | { send: (m: RemoteMessage) => void; stop: () => void }>(null)
  const [castError, setCastError] = useState<string | null>(null)
  const [tvGate, setTvGate] = useState(true), [loopFade, setLoopFade] = useState(false), [clock, setClock] = useState('')
  const [autoDirector, setAutoDirector] = useState(tv)
  const [largeCanvas, setLargeCanvas] = useState(false)
  useEffect(() => {
    const resize = () => setLargeCanvas(window.innerWidth * window.innerHeight > 1_000_000)
    resize(); window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const [metrics] = useState(() => typeof window !== 'undefined' && new URLSearchParams(location.search).has('metrics'))
  // Back from Stripe Checkout. The redirect proves nothing about payment; only the webhook assigns plots.
  const [returned, setReturned] = useState<number | null>(() => { if (typeof window === 'undefined') return null; const n = Number(new URLSearchParams(location.search).get('claimed')); return Number.isInteger(n) && n > 0 ? n : null })
  const dismissed = useRef(new Set<string>()), appeared = useRef(new Set<string>())
  const avenue = useAvenue()
  const showAds = phase !== 'hidden'
  // TV/autopilot loops run unattended: count each plot once per page session there, not every lap.
  useDriveBys(avenue.plots, drive, running, tv)
  // Sessions + listening time through the existing GA4 contract: the audience proof for opening the Avenue.
  const session = useRef<{ started: number; listened: number; lastTick: number; sent: boolean } | null>(null)
  useEffect(() => {
    if (!running || session.current) return
    session.current = { started: performance.now(), listened: 0, lastTick: performance.now(), sent: false }
    trackCruiseEvent('cruise_start', { route: 'miami-test', tv, camera: mode, station_id: audio.stationId, time_of_day: time, avenue: phase })
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setInterval(() => { const s = session.current; if (!s) return; const now = performance.now(); if (probe.current.audio.playing && !document.hidden) s.listened += now - s.lastTick; s.lastTick = now }, 1000)
    const flush = (reason: string) => { const s = session.current; if (!s || s.sent) return; s.sent = reason === 'pagehide'; trackCruiseEvent('cruise_session', { route: 'miami-test', tv, reason, duration_seconds: Math.round((performance.now() - s.started) / 1000), listening_seconds: Math.round(s.listened / 1000) }) }
    const hide = () => { if (document.hidden) flush('hidden') }, leave = () => flush('pagehide')
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', leave)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', leave) }
  }, [tv])
  // Read-only QA probe (no controls): lets test scripts verify pulse source and playback without scraping the UI.
  const probe = useRef({ audio, mode, vehicle, time, high })
  probe.current = { audio, mode, vehicle, time, high }
  useEffect(() => {
    const w = window as unknown as { __cruise?: () => object }
    w.__cruise = () => { const s = probe.current; return { source: pulse.source, energy: +pulse.energy.toFixed(3), playing: s.audio.playing, requested: s.audio.requested, loading: s.audio.loading, station: s.audio.stationId, error: s.audio.error, track: s.audio.trackTitle, analysis: music.status, camera: s.mode, vehicle: s.vehicle, time: s.time, quality: s.high ? 'desktop' : 'mobile', distance: +drive.current.distance.toFixed(1), running: !drive.current.paused, paused: drive.current.paused } }
    return () => { delete w.__cruise }
  }, [music])

  // ---- Driving lifecycle ----------------------------------------------------
  const resumeAllowed = useRef(false)
  resumeAllowed.current = !tvGate && ready && visible && !detail && plotOpen === null && !remote
  const loopCover = useRef<HTMLDivElement>(null)
  const loopTransition = useRef<'idle' | 'cover' | 'render'>('idle')
  const reset = useCallback(() => {
    if (loopTransition.current !== 'idle') return
    loopTransition.current = 'cover'
    drive.current.paused = true
    setRunning(false); setLoopFade(true)
  }, [])
  const onFinish = reset
  useEffect(() => {
    if (!loopFade) return
    let frame = 0
    const coverThenReset = () => {
      if (loopTransition.current !== 'cover') return
      // Wait for the actual cover opacity, not a timer that can race CSS or a hidden tab.
      if (document.hidden || !loopCover.current || Number(getComputedStyle(loopCover.current).opacity) < .999) {
        frame = requestAnimationFrame(coverThenReset); return
      }
      loopTransition.current = 'render'
      // A deliberate new shot makes this an editorial cut, not a disguised spatial sweep.
      const nextCamera = reducedMotion() ? probe.current.mode : probe.current.mode === 'driver' ? 'chase' : 'driver'
      setMode(nextCamera)
      Object.assign(drive.current, { distance: 0, lateral: 2, speed: 3.5, paused: true, steer: 0, glance: 0, resetCamera: probe.current.vehicle !== 'ocean-convertible' && nextCamera !== 'driver' ? 'chase' : nextCamera, resetRevision: (drive.current.resetRevision ?? 0) + 1 })
      dismissed.current.clear(); appeared.current.clear(); window.__streetSamples = []; event('restart', 'street')
      // Keep the cover until DriveController has rendered a frame at the new camera position.
    }
    frame = requestAnimationFrame(coverThenReset)
    return () => cancelAnimationFrame(frame)
  }, [loopFade])
  const onResetRendered = useCallback((revision: number) => {
    if (loopTransition.current !== 'render' || revision !== drive.current.resetRevision) return
    loopTransition.current = 'idle'; setLoopFade(false)
  }, [])
  useEffect(() => {
    const h = () => { setVisible(!document.hidden); if (document.hidden) { drive.current.paused = true; setRunning(false) } }
    h(); document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [])
  useEffect(() => {
    const resume = resumeAllowed.current && !document.hidden && !loopFade
    drive.current.paused = !resume; setRunning(resume)
  }, [tvGate, ready, visible, detail, plotOpen, remote, loopFade])
  useEffect(() => { if (!detail && plotOpen === null) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDetail(null); setPlotOpen(null) } }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [detail, plotOpen])

  // ---- TV mode: autopilot, director, Miami clock, receiver -------------------
  useEffect(() => { if (!tv) return; setClock(miamiClock()); const id = setInterval(() => { setClock(miamiClock()); setTime(t => t === miamiBucket() ? t : miamiBucket()) }, 30_000); return () => clearInterval(id) }, [tv])
  useEffect(() => {
    if (!autoDirector || tvGate) return
    let i = 0, timer: ReturnType<typeof setTimeout>
    const next = () => { const [shot, secs] = TV_SHOTS[i++ % TV_SHOTS.length]; if (!reducedMotion() && loopTransition.current === 'idle' && (!loopCover.current || Number(getComputedStyle(loopCover.current).opacity) <= .001)) setMode(shot); timer = setTimeout(next, secs * 1000) }
    next(); return () => clearTimeout(timer)
  }, [autoDirector, tvGate])
  const startTv = useCallback(() => {
    if (!ready || !tvGate) return
    setTvGate(false); audio.start()
    if (tv) void root.current?.requestFullscreen?.().catch(() => null)
  }, [audio, tv, ready, tvGate])
  useEffect(() => { if (tv && ready && tvGate && isPresentationReceiver()) startTv() }, [tv, ready, tvGate, startTv])
  // A disabled button drops autoFocus; focus the gate once the street is ready so a remote OK/Enter starts it.
  const gateButton = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (tvGate && ready) gateButton.current?.focus() }, [tvGate, ready])
  const receiver = useMemo(() => tv ? listenAsReceiver(m => applyRemote(m)) : null, [tv]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { receiver?.broadcast({ type: 'state', station: audio.station.name, playing: audio.playing, track: audio.trackTitle, camera: mode }) }, [receiver, audio.station.name, audio.playing, audio.trackTitle, mode])
  // Remote messages arrive from another device: accept only known shapes and values.
  function applyRemote(m: RemoteMessage) {
    if (!m || typeof m !== 'object') return
    if (m.type === 'station') { if (RADIO_PRESETS.some(s => s.id === m.id)) audio.selectStation(m.id) }
    else if (m.type === 'toggle') audio.toggle()
    else if (m.type === 'volume') { if (Number.isFinite(m.value)) audio.setVolume(Math.min(1, Math.max(0, m.value))) }
    else if (m.type === 'camera') { if (loopTransition.current !== 'idle') return; if (m.mode === 'auto') setAutoDirector(true); else if (CAMERAS.includes(m.mode)) { setAutoDirector(false); setMode(m.mode) } }
    else if (m.type === 'time') { if (m.value === 'day' || m.value === 'sunset' || m.value === 'night') setTime(m.value) }
  }
  // Lean-back: keep the TV awake while the Cruise runs, and let remote/media keys drive the radio.
  useEffect(() => {
    if (!tv || tvGate) return
    let lock: { release(): Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } }
    const acquire = () => { if (document.visibilityState === 'visible') void nav.wakeLock?.request('screen').then(l => { lock = l }).catch(() => null) }
    acquire(); document.addEventListener('visibilitychange', acquire)
    return () => { document.removeEventListener('visibilitychange', acquire); void lock?.release().catch(() => null) }
  }, [tv, tvGate])
  const stationStep = useRef((step: number) => { void step })
  stationStep.current = (step: number) => { const i = RADIO_PRESETS.findIndex(s => s.id === audio.stationId); audio.selectStation(RADIO_PRESETS[(i + step + RADIO_PRESETS.length) % RADIO_PRESETS.length].id) }
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined
    if (!ms) return
    const set = (a: MediaSessionAction, fn: MediaSessionActionHandler | null) => { try { ms.setActionHandler(a, fn) } catch { /* unsupported action */ } }
    set('play', () => { if (!probe.current.audio.playing) probe.current.audio.toggle() })
    set('pause', () => { if (probe.current.audio.playing) probe.current.audio.toggle() })
    set('nexttrack', () => stationStep.current(1)); set('previoustrack', () => stationStep.current(-1))
    return () => { (['play', 'pause', 'nexttrack', 'previoustrack'] as const).forEach(a => set(a, null)) }
  }, [])
  useEffect(() => {
    if (!tv) return
    const k = (e: KeyboardEvent) => { if (tvGate) return; if (e.key === 'ChannelUp') stationStep.current(1); else if (e.key === 'ChannelDown') stationStep.current(-1); else if (e.key === 'Enter' || e.key === 'MediaPlayPause') probe.current.audio.toggle() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [tv, tvGate])

  // ---- Optional TV Remote Mode (explicit separate-session action) --------------------------------
  const [remoteState, setRemoteState] = useState<{ station: string; playing: boolean; track: string; camera: string } | null>(null)
  async function cast() {
    setCastError(null)
    try {
      const handle = await startCast(tvUrl(), m => { if (m.type === 'state') setRemoteState(m) }, () => { setRemote(null); setRemoteState(null) })
      if (!handle) { setCastError('This browser cannot cast. Use AirPlay mirroring or open TV mode on the TV.'); return }
      audio.pause(); setRemote(handle); setPanel(null)
    } catch (e) { setCastError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Cast cancelled.' : 'No TV found. Make sure the TV and this device share Wi-Fi.') }
  }

  // ---- Discovery --------------------------------------------------------------
  function sample(s: StreetSample) {
    setStats(s); setRunning(!drive.current.paused)
    // Public listening stays uninterrupted; stores remain available by sign or Garage.
    if (!showAds) { setNearby(null); return }
    const b = (Object.keys(businesses) as Business[]).find(id => { const d = businesses[id].station - s.distance; return d > 3 && d < 40 && !dismissed.current.has(id) })
    if (b) { setNearby({ kind: 'business', id: b }); if (!appeared.current.has(b)) { appeared.current.add(b); event('card-appearance', b) } return }
    const p = !showAds ? undefined : avenue.plots.filter(p => p.status !== 'house').find(p => { const d = p.s - s.distance; return d > 2 && d < 26 && !dismissed.current.has(`plot-${p.number}`) })
    setNearby(p ? { kind: 'plot', plot: p } : null)
  }
  function explore(id: string) { if (!(id in businesses)) return; drive.current.paused = true; setRunning(false); setDetail(id as Business); event('explore', id) }
  function openPlot(n: number) {
    const selected = avenue.plots.find(p => p.number === n)
    if (!selected || (!showAds && (!selected.owner || selected.pending))) return
    drive.current.paused = true; setRunning(false); setPlotOpen(n); event('plot-open', String(n))
  }
  const nextStation = () => { const i = RADIO_PRESETS.findIndex(st => st.id === audio.stationId); audio.selectStation(RADIO_PRESETS[(i + 1) % RADIO_PRESETS.length].id) }
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void root.current?.requestFullscreen?.().catch(() => null) }
  // Mirroring is started through browser/OS controls; never launch a second Cruise.
  const castClick = () => setPanel(panel === 'cast' ? null : 'cast')
  const cycleCamera = () => { if (loopTransition.current !== 'idle') return; setAutoDirector(false); setMode(m => CAMERAS[(CAMERAS.indexOf(m) + 1) % CAMERAS.length]) }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (loopTransition.current !== 'idle' || tvGate || detail || plotOpen !== null || e.repeat || e.code !== 'KeyC' || e.target instanceof HTMLElement && e.target.closest('input,select,textarea')) return; setAutoDirector(false); setMode(m => CAMERAS[(CAMERAS.indexOf(m) + 1) % CAMERAS.length]) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [tvGate, detail, plotOpen])
  const plot = plotOpen !== null ? avenue.plots.find(p => p.number === plotOpen) ?? null : null
  const openCount = avenue.plots.filter(p => p.status === 'open').length
  const legacy = vehicle !== 'ocean-convertible'

  // ---- Remote-control screen (while casting) -----------------------------------
  if (remote) return <main className="miami-master mm-remote">
    <div className="mm-lockup"><b>BUENA ONDA</b><i>Cruise</i><small>REMOTE · CASTING TO TV</small></div>
    <section className="mm-remote-now"><small>{remoteState?.playing ? 'ON AIR' : 'PAUSED'}</small><strong>{remoteState?.station ?? audio.station.name}</strong><span>{remoteState?.track}</span>
      <button className="mm-big" onClick={() => remote.send({ type: 'toggle' })}>{remoteState?.playing ? 'Pause' : 'Play'}</button></section>
    <h3>Stations</h3><div className="mm-chips">{RADIO_PRESETS.map(s => <button key={s.id} aria-pressed={remoteState?.station === s.name} onClick={() => remote.send({ type: 'station', id: s.id })}>{s.name}</button>)}</div>
    <h3>Camera</h3><div className="mm-chips"><button onClick={() => remote.send({ type: 'camera', mode: 'auto' })}>Auto director</button>{CAMERAS.map(c => <button key={c} aria-pressed={remoteState?.camera === c} onClick={() => remote.send({ type: 'camera', mode: c })}>{CAMERA_LABEL[c]}</button>)}</div>
    <h3>Sky</h3><div className="mm-chips">{(['day', 'sunset', 'night'] as const).map(t => <button key={t} onClick={() => remote.send({ type: 'time', value: t })}>{t}</button>)}</div>
    <h3>Volume</h3><input aria-label="TV volume" type="range" min="0" max="1" step=".05" defaultValue=".82" onChange={e => remote.send({ type: 'volume', value: Number(e.target.value) })} />
    <button className="mm-stop" onClick={() => { remote.stop(); setRemote(null) }}>Stop casting</button>
  </main>

  return <main ref={root} className={`miami-master${tv ? ' mm-tv' : ''}${mode === 'driver' ? ' mm-cockpit' : ''}`} data-ready={ready}>
    <section className="mm-stage" aria-label="Playable Miami street">
      <div ref={el => { if (el) el.inert = tvGate }} style={{ display: 'contents' }} aria-hidden={tvGate}>
      <Guard><CockpitProvider stations={MIAMI_CRUISE_STATIONS} audio={audio} vehicleId={vehicle as CruiseVehicleId} autoLights={time === 'night'} instant radioFocused focusRadio={() => setPanel('radio')}>
        <Canvas dpr={high ? [1, 1.25] : time === 'night' && largeCanvas ? .85 : 1} shadows={high} frameloop={visible || tv ? 'always' : 'never'} camera={{ position: [2, 3, 7], fov: 65, near: .04, far: 500 }} gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: T.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
          <PulseDriver music={music} playing={audio.playing} />
          <StreetSky time={time} high={high} />
          <Suspense fallback={null}>
            <StreetEnvironment timeOfDay={time} onAdClick={explore} onPlotClick={openPlot} plots={avenue.plots} avenue={phase} drive={drive} high={high} />
            <group ref={car}>
              <mesh rotation-x={-Math.PI / 2} position={[0, .031, 0]} scale={[1.15, 2.7, 1]}><circleGeometry args={[1, 32]} /><meshBasicMaterial color="#172329" transparent opacity={.28} depthWrite={false} /></mesh>
              {!legacy ? <ConvertibleCar camera={mode} drive={drive} timeOfDay={time} high={high} hands={hands} onReady={() => setReady(true)} />
                : <group position={[-HERO_X, 0, 0]}>{vehicle === 'island-trail'
                  ? <ImprovedCockpit improved parked={false} runtime={runtime} camera={mode === 'driver' ? 'driver' : 'chase'} quality={high ? 'high' : 'low'} timeOfDay={time} onReady={() => setReady(true)} />
                  : <HeroCar vehicleId={vehicle as CruiseVehicleId} runtime={runtime} camera={mode === 'driver' ? 'driver' : 'chase'} quality={high ? 'high' : 'low'} timeOfDay={time} weather="clear" onReady={() => setReady(true)} />}</group>}
            </group>
            <DriveController state={drive} runtime={runtime} vehicle={car} cameraMode={legacy && mode !== 'driver' ? 'chase' : mode} vehicleId={vehicle} onFinish={onFinish} onResetRendered={onResetRendered} />
            <StreetMetrics drive={drive} mode={mode} onSample={sample} />
          </Suspense>
        </Canvas>
      </CockpitProvider></Guard>

      {/* ---------- Overlay HUD ---------- */}
      <div ref={loopCover} className={`mm-fade${loopFade ? ' on' : ''}`} aria-hidden />
      <div className="mm-lockup"><b>BUENA ONDA</b><i>Cruise</i><small>{tv ? `MIAMI · ${clock}` : 'OCEAN DRIVE · MIAMI'}</small></div>
      {showAds && <AvenueTicker plots={avenue.plots} events={avenue.events} />}

      {!tv && <nav className="mm-top" aria-label="Cruise controls">
        {showAds && <button className="mm-avenue" onClick={() => setPanel(panel === 'avenue' ? null : 'avenue')}>The Avenue <em>{openCount} open</em></button>}
        <button onClick={() => setPanel(panel === 'menu' ? null : 'menu')} aria-label="Garage and options">Garage</button>
      </nav>}

      {tv ? <button className="mm-now" onClick={() => audio.toggle()} aria-label="Radio">
        <span className={`mm-disc${audio.playing ? ' spin' : ''}`} aria-hidden />
        <span className="mm-now-text"><b>{audio.station.name}</b><small>{audio.error ? 'Signal lost · tap' : audio.loading && audio.requested ? 'Tuning…' : audio.playing ? (audio.trackTitle || 'Playing') : 'Tap to play'}</small></span>
        <MiniEq on={audio.playing} />
      </button>
      : <div className="mm-dock" role="toolbar" aria-label="Cruise controls">
        <button className="mm-play" onClick={audio.toggle} aria-label={audio.requested ? 'Pause radio' : 'Play radio'}>{audio.requested ? <Icon d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <Icon d="M8 5l11 7-11 7z" />}</button>
        <button className="mm-station" onClick={() => setPanel(panel === 'radio' ? null : 'radio')} aria-label="Radio stations">
          <span className={`mm-disc${audio.playing ? ' spin' : ''}`} aria-hidden />
          <span className="mm-now-text"><small>CH{RADIO_PRESETS.findIndex(s => s.id === audio.stationId) + 1} · {audio.station.name}</small><b>{audio.error ? 'Signal lost · tap to retry' : audio.loading && audio.requested ? 'Tuning…' : audio.playing ? (audio.trackTitle || audio.station.name) : 'Tap play to tune in'}</b></span>
          <MiniEq on={audio.playing} />
        </button>
        <button className="mm-ico" onClick={nextStation} aria-label="Next station"><Icon d="M6 5l9 7-9 7zM17 5h2v14h-2z" /></button>
        <label className="mm-volume"><span className="sr">Volume</span><input aria-label="Volume" type="range" min="0" max="1" step=".05" value={audio.volume} onChange={e => audio.setVolume(Number(e.target.value))} /></label>
        <span className="mm-sep" aria-hidden />
        <button className="mm-ico wide" onClick={cycleCamera} aria-label={`Camera: ${CAMERA_LABEL[mode]}`}><Icon d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z" /><em>{CAMERA_LABEL[mode]}</em></button>
        <button className="mm-ico wide" onClick={() => setTime(t => t === 'day' ? 'sunset' : t === 'sunset' ? 'night' : 'day')} aria-label={`Time of day: ${time}`}><Icon d={time === 'night' ? 'M20 14A8 8 0 1110 4a6 6 0 0010 10z' : 'M12 7a5 5 0 110 10 5 5 0 010-10zM12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2'} /><em>{time}</em></button>
        <button className="mm-ico" onClick={castClick} aria-label="Cast to TV" title="Cast to TV"><Icon d="M2 18a3 3 0 013 3M2 14a7 7 0 017 7M2 10a11 11 0 0111 11M2 7V5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2h-6" /></button>
        <button className="mm-ico" onClick={fullscreen} aria-label="Fullscreen"><Icon d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></button>
      </div>}

      {!tv && nearby && !detail && plotOpen === null && (nearby.kind === 'business'
        ? <aside className="mm-sponsor" aria-label="Nearby business"><img src={businesses[nearby.id].thumb} alt="" /><div><b>{businesses[nearby.id].name}</b><small>{businesses[nearby.id].line}</small>
            <button onClick={() => explore(nearby.id)}>Explore store ↗</button></div><em>On Ocean Drive</em><button className="mm-x" aria-label="Dismiss" onClick={() => { dismissed.current.add(nearby.id); event('card-dismissal', nearby.id); setNearby(null) }}>×</button></aside>
        : <aside className="mm-sponsor" aria-label="Nearby plot"><span className="mm-plotnum" style={{ background: nearby.plot.owner?.color ?? '#16122b' }}>#{nearby.plot.number}</span><div><b>{nearby.plot.owner?.name ?? `${KIND_LABEL[nearby.plot.kind]} · open`}</b><small>{nearby.plot.owner?.tagline ?? `Claim it from ${dollars(priceCents(nearby.plot)!)}`}</small>
            <button onClick={() => openPlot(nearby.plot.number)}>{nearby.plot.owner ? 'View plot ↗' : 'Claim this spot ↗'}</button></div><em>{nearby.plot.owner && !nearby.plot.pending ? 'Sponsored' : 'The Avenue'}</em><button className="mm-x" aria-label="Dismiss" onClick={() => { dismissed.current.add(`plot-${nearby.plot.number}`); setNearby(null) }}>×</button></aside>)}

      {returned !== null && !tv && <aside className="mm-sponsor mm-returned" role="status"><div><b>Thanks for claiming plot #{returned}</b><small>Once Stripe confirms your payment, your sign appears after a quick content review. Your receipt comes by email.</small></div><button className="mm-x" aria-label="Dismiss" onClick={() => setReturned(null)}>×</button></aside>}
      {tv && <TvLowerThird plots={avenue.plots} showAds={showAds} />}

      <div className={`mm-status${metrics ? ' on' : ''}`}>{ready ? `${CAMERA_LABEL[mode].toUpperCase()} · ${stats ? Math.round(stats.speed * 2.237) : 8} MPH` : 'LOADING'}<span>{stats ? `${metrics ? `${stats.fps.toFixed(0)} FPS · ` : ''}${Math.round(stats.distance)} m` : ''}</span></div>

      {/* ---------- Panels ---------- */}
      {panel === 'radio' && <section className="mm-panel" aria-label="Radio">
        <header><b>Buena Onda Radio</b><button aria-label="Close radio" onClick={() => setPanel(null)}>×</button></header>
        <p className="mm-signal" role="status">{audio.error || (audio.loading && audio.requested ? 'Connecting…' : audio.playing ? `On air · ${pulse.source === 'live' ? 'live spectrum' : 'auto rhythm'}` : 'Ready')}</p>
        <button className="mm-big" onClick={audio.toggle}>{audio.requested ? 'Pause radio' : 'Play radio'}</button>
        <div className="mm-chips">{RADIO_PRESETS.map((s, i) => <button key={s.id} aria-pressed={audio.stationId === s.id} onClick={() => audio.selectStation(s.id)}><small>CH{i + 1}</small>{s.name}</button>)}</div>
        {audio.canSkip && <div className="mm-chips"><button onClick={audio.previousTrack}>⏮ Prev</button><button onClick={audio.nextTrack}>Next ⏭</button></div>}
        <label className="mm-vol">Volume<input aria-label="Radio volume" type="range" min="0" max="1" step=".05" value={audio.volume} onChange={e => audio.setVolume(Number(e.target.value))} /></label>
        <p className="mm-fine">Tip: switch to Cockpit and use the head unit. Presets, knobs and the tape deck all work.</p>
      </section>}
      {panel === 'cast' && <section className="mm-panel" aria-label="Cast to TV">
        <header><b>Mirror this Cruise to your TV</b><button aria-label="Close" onClick={() => setPanel(null)}>×</button></header>
        <p className="mm-fine">Keep this Cruise open. Mirror this tab or screen so the TV shows the same camera, Director views and radio.</p>
        <p className="mm-fine"><b>Laptop / desktop Chrome:</b> open Chrome&apos;s menu, choose Cast, then Sources &gt; Cast tab and select your TV. Cast the tab to include its audio.</p>
        <p className="mm-fine"><b>Android:</b> in Google Home, select your TV and choose Cast my screen. Return here and rotate your phone to landscape.</p>
        <p className="mm-fine"><b>iPhone / iPad / Mac:</b> open Control Center, choose Screen Mirroring and select an AirPlay-compatible TV.</p>
        <p className="mm-fine">Use the same Wi-Fi network. Your browser or device starts mirroring; this button opens these instructions.</p>
        <button className="mm-big" onClick={() => setPanel(null)}>Back to the Cruise</button>
        {canPresent() && <details><summary>Optional TV Remote Mode</summary><p className="mm-fine">Starts a separate Cruise on the TV. This device becomes its remote; this is not screen mirroring.</p><button className="mm-big ghost" onClick={() => void cast()}>Start separate TV session</button></details>}
        {castError && <p className="mm-error" role="alert">{castError}</p>}
      </section>}
      {panel === 'menu' && <section className="mm-panel" aria-label="More options">
        <header><b>Garage</b><button aria-label="Close" onClick={() => setPanel(null)}>×</button></header>
        <label>Car<select aria-label="Vehicle" value={vehicle} onChange={e => { setReady(false); setVehicle(e.target.value as StreetVehicleId) }}><option value="ocean-convertible">Ocean Drive convertible</option><option value="island-trail">Island Trail</option><option value="classic-coupe">1967 classic coupe</option><option value="coastal-coupe">Coastal coupe</option></select></label>
        <label>Quality<select aria-label="Quality" value={high ? 'desktop' : 'mobile'} onChange={e => setHigh(e.target.value === 'desktop')}><option value="mobile">Mobile</option><option value="desktop">Desktop (shadows + live mirror)</option></select></label>
        {!legacy && <label className="mm-check"><input type="checkbox" checked={hands} onChange={e => setHands(e.target.checked)} /> Hands on the wheel</label>}
        <label>Speed<input aria-label="Cruising speed" type="range" min="2" max="8" step=".5" defaultValue="3.5" onChange={e => { drive.current.speed = Number(e.target.value) }} /></label>
        <div className="mm-chips"><button aria-pressed={autoDirector} onClick={() => setAutoDirector(a => !a)}>Auto director (cinematic cameras)</button><button onClick={() => setPanel('cast')}>TV &amp; casting options</button><button onClick={() => reset()}>Restart</button>{(Object.keys(businesses) as Business[]).map(id => <button key={id} onClick={() => explore(id)}>{businesses[id].name}</button>)}</div>
        <p className="mm-fine">The car drives itself. Choose your station, camera and sky. C changes camera.</p>
        {/* Credits live here, not below the stage: a taller-than-viewport page scrolled on Space/arrows. */}
        <p className="mm-credits">Ocean Drive convertible: modified Mazda RX-7 by IvOfficial, via Poly Pizza, CC BY 3.0 (roof removed; custom cabin and paint). Traffic: classic-traffic (CC0, see ASSETS). Pedestrians: Quaternius (CC0). Palm: Yughues / Nobiax (CC0). Asphalt: Poly Haven (CC0). Coastal Coupe: Mazda RX-7 by IvOfficial, Poly Pizza, CC BY 3.0. QR: qrcode-generator (MIT).{showAds ? ' All signs on the Avenue are plots; open plots say so.' : ''}</p>
      </section>}
      {panel === 'avenue' && showAds && <AvenueDrawer plots={avenue.plots} live={avenue.live} onSelect={openPlot} onClose={() => setPanel(null)} />}

      {detail && <div className="av-backdrop" onClick={() => setDetail(null)}><div className="av-card" role="dialog" aria-modal="true" aria-label={businesses[detail].name} onClick={e => e.stopPropagation()}>
        <div className="av-card-top" style={{ background: detail === 'buena' ? '#2aa79f' : '#f7b2bb' }}><small>ON OCEAN DRIVE</small><h2>{businesses[detail].name}</h2><p>{businesses[detail].description}</p></div>
        <div className="av-card-body"><p className="av-fine">Cruising is paused. Your radio keeps playing.</p><div className="av-actions"><a className="av-btn" href={businesses[detail].url} target="_blank" rel="noopener">Visit ↗</a><button className="av-btn ghost" autoFocus onClick={() => setDetail(null)}>Back to the street</button></div></div>
      </div></div>}
      {plot && (showAds || (plot.owner && !plot.pending)) && <PlotCard plot={plot} trade={showAds} onClose={() => setPlotOpen(null)} />}

      </div>
      {tvGate && !isPresentationReceiver() && <button ref={gateButton} className="mm-tvgate" autoFocus onClick={startTv} disabled={!ready}><b>{ready ? 'Start the cruise' : 'Loading the street…'}</b><small>{tv ? 'Full screen · radio on · lean back' : 'Radio on · the car drives itself · just ride'}</small></button>}
    </section>
  </main>
}

/** Lean-back lower third: rotates through who's on the street and what's open, with a claim QR. */
function TvLowerThird({ plots, showAds }: { plots: Plot[]; showAds: boolean }) {
  const slides = useMemo(() => {
    const onStreet = plots.filter(p => p.owner && !p.pending && (showAds || p.status === 'house')).map(p => ({ title: p.owner!.name, line: p.owner!.tagline ?? KIND_LABEL[p.kind], tag: p.status === 'house' ? 'ON OCEAN DRIVE' : `PLOT #${p.number}`, color: p.owner!.color ?? '#16122b' }))
    const open = plots.filter(p => p.status === 'open').slice(0, 4).map(p => ({ title: `Plot #${p.number} is open`, line: `${KIND_LABEL[p.kind]} · claim it from ${dollars(priceCents(p)!)}`, tag: 'THE AVENUE', color: '#16122b' }))
    return showAds ? [...onStreet, ...open] : onStreet
  }, [plots, showAds])
  const [i, setI] = useState(0)
  useEffect(() => { const id = setInterval(() => setI(n => n + 1), 9000); return () => clearInterval(id) }, [])
  const s = slides[i % Math.max(1, slides.length)]
  const claim = typeof location === 'undefined' ? '' : `${location.origin}/cruise/miami-test?avenue=preview`
  if (!s) return null
  return <aside className="mm-tvcard"><span className="mm-tvswatch" style={{ background: s.color }} /><div><small>{s.tag}</small><b>{s.title}</b><span>{s.line}</span></div>
    {showAds && <div className="mm-tvqr"><QrCode value={claim} size={92} label="QR code to claim a plot" /><small>Claim a spot</small></div>}</aside>
}
