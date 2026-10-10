'use client'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import ConvertibleCar from '../master/ConvertibleCar'
import StreetSky from '../master/StreetSky'
import { pulse, updatePulse } from '../master/pulse'
import { CockpitProvider } from '../vehicle/CockpitContext'
import { useCruiseAudio } from '../audio/useCruiseAudio'
import { MusicAudio } from '@/lib/cruise/music-audio'
import { MIAMI_CRUISE_STATIONS, canPlayCruiseStation } from '@/lib/cruise/stations'
import type { CruiseRuntime } from '@/lib/cruise/types'
import NightWorld from './NightWorld'
import NightDrive from './NightDrive'
import { NightAmbience } from './NightAmbience'
import { createNightState, type NightCamera, type DrivingMood } from './state'
import './nightdrive.css'

const cameras: NightCamera[] = ['la', 'chase', 'driver', 'side', 'aerial', 'low', 'hood']
const names: Record<NightCamera, string> = { la: 'LA Night Drive', chase: 'Chase', driver: 'Cockpit', side: 'Side', aerial: 'Crane', low: 'Low', hood: 'Hood' }
const stations = MIAMI_CRUISE_STATIONS.filter(canPlayCruiseStation)

function ScenePulse({ music, playing, report }: { music: MusicAudio; playing: boolean; report: React.MutableRefObject<Record<string, unknown>> }) {
  const { gl, scene } = useThree()
  const sampleAt = useRef(0)
  useFrame((_, dt) => {
    // No synthetic beat is presented as musical input in this lab.
    updatePulse(music, playing && music.analysisActive, Math.min(dt, .05))
    if (scene.fog instanceof T.Fog) { scene.fog.near = 130; scene.fog.far = 340 }
    sampleAt.current += dt
    if (sampleAt.current >= .1) {
      sampleAt.current = 0
      const info = gl.info
      report.current = { drawCalls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures, dpr: gl.getPixelRatio(), buffer: [gl.domElement.width, gl.domElement.height] }
    }
  }, -3)
  return null
}

export default function NightLab() {
  const state = useRef(createNightState()), runtime = useRef<CruiseRuntime>({ distance: 0, time: 0, speed: 0 })
  const car = useRef<T.Group | null>(null), render = useRef<Record<string, unknown>>({})
  const music = useMemo(() => new MusicAudio(), []), ambience = useMemo(() => new NightAmbience(), [])
  const audio = useCruiseAudio(music, MIAMI_CRUISE_STATIONS)
  const [ready, setReady] = useState(false), [started, setStarted] = useState(false)
  const [camera, setCamera] = useState<NightCamera>('la'), [director, setDirector] = useState(true)
  const [sky, setSky] = useState<'night' | 'sunset'>('night'), [mood, setMood] = useState<DrivingMood>('night-drive')
  const [ambientOn, setAmbientOn] = useState(true), [ambientGain, setAmbientGain] = useState(.2)
  const [panel, setPanel] = useState<'radio' | 'options' | 'cast' | null>(null)
  const [district, setDistrict] = useState('Coastal boulevard'), [ambientError, setAmbientError] = useState('')
  const [large, setLarge] = useState(false), [metrics, setMetrics] = useState(false)
  const current = useRef({ audio, camera, started, director, ambientOn, ambientGain, sky })
  current.current = { audio, camera, started, director, ambientOn, ambientGain, sky }
  const onReady = useCallback(() => setReady(true), [])

  useEffect(() => { audio.selectStation('jolt-radio') }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { state.current.reduced = media.matches; setLarge(innerWidth * innerHeight > 1_000_000) }
    update(); media.addEventListener('change', update); window.addEventListener('resize', update)
    setMetrics(new URLSearchParams(location.search).has('metrics'))
    return () => { media.removeEventListener('change', update); window.removeEventListener('resize', update) }
  }, [])
  useEffect(() => { state.current.mood = mood }, [mood])
  useEffect(() => { ambience.setEnabled(ambientOn); ambience.setGain(ambientGain) }, [ambience, ambientOn, ambientGain])
  useEffect(() => {
    const tick = () => {
      const c = current.current, s = state.current
      s.paused = !c.started || document.hidden
      ambience.update({ speed: s.speed, moving: !s.paused, visible: !document.hidden, musicPlaying: c.audio.playing, musicMuted: c.audio.muted || c.audio.volume === 0, camera: c.camera, districtMix: s.districtMix, reduced: s.reduced, traffic: s.traffic, distance: s.distance })
      setAmbientError(ambience.snapshot().error || '')
      setDistrict(s.district === 'coast' ? 'Coastal boulevard' : 'Neon quarter')
    }
    const timer = window.setInterval(tick, 100)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); ambience.dispose() }
  }, [ambience])
  useEffect(() => {
    const w = window as unknown as { __nightdrive?: () => object; __nightAmbience?: NightAmbience }
    w.__nightdrive = () => {
      const c = current.current, s = state.current
      return { ...s, minTrafficGap: Number.isFinite(s.minTrafficGap) ? s.minTrafficGap : null, traffic: s.traffic.map(t => ({ ...t })), camera: c.camera, director: c.director, sky: c.sky, playing: c.audio.playing, requested: c.audio.requested, station: c.audio.stationId, audioError: c.audio.error, analysis: music.status, source: pulse.source, ambience: ambience.snapshot(), render: render.current }
    }
    // Own synthesized sound only; QA can export a demo without touching the radio graph.
    if (new URLSearchParams(location.search).has('profile')) w.__nightAmbience = ambience
    return () => { delete w.__nightdrive; delete w.__nightAmbience }
  }, [music, ambience])
  const unlockAmbience = () => { void ambience.unlock().catch(() => setAmbientError('Ambiance unavailable in this browser; radio is unaffected.')) }
  const start = () => { audio.start(); if (ambientOn) unlockAmbience(); setStarted(true); state.current.paused = false }
  const changeCamera = (mode: NightCamera) => { setDirector(false); setCamera(mode) }
  const toggleAmbience = () => { if (!ambientOn) unlockAmbience(); setAmbientOn(!ambientOn) }

  return <main className="nd-lab" data-ready={ready} data-started={started}>
    {!started && <div className="nd-gate"><h1>A radio. An open road.</h1><p>Coastal calm, neon nights. The car takes you there.</p><button disabled={!ready} onClick={start}>{ready ? 'Start the Cruise' : 'Preparing the road...'}</button><small>Local experience lab - sound starts when you do</small></div>}
    <div ref={element => { if (element) element.inert = !started }} aria-hidden={!started} style={{ display: 'contents' }}>
    <CockpitProvider audio={audio} stations={MIAMI_CRUISE_STATIONS} vehicleId="coastal-coupe" autoLights={sky === 'night'} instant>
      <Canvas className="nd-stage" dpr={large && sky === 'night' ? .85 : 1} camera={{ position: [0, 5, 10], fov: 60, near: .04, far: 450 }} gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: T.ACESFilmicToneMapping }}>
        <Suspense fallback={null}>
          <StreetSky time={sky} high={false} />
          <ScenePulse music={music} playing={audio.playing} report={render} />
          <NightWorld state={state} night={sky === 'night'} />
          <group ref={car}><ConvertibleCar camera={camera} drive={state} timeOfDay={sky} high={false} onReady={onReady} /></group>
          <NightDrive state={state} runtime={runtime} vehicle={car} cameraMode={camera} director={director} onCamera={setCamera} />
        </Suspense>
      </Canvas>
    </CockpitProvider>
    <header className="nd-brand"><b>BUENA ONDA</b><i>Nightdrive</i><small>{district}</small></header>
    <button className="nd-options" onClick={() => setPanel(panel === 'options' ? null : 'options')}>Options</button>
    <div className="nd-dock" role="toolbar" aria-label="Cruise controls">
      <button aria-label={audio.requested ? 'Pause radio' : 'Play radio'} onClick={() => { if (!audio.requested && ambientOn) unlockAmbience(); audio.toggle() }}>{audio.requested ? 'Pause' : 'Play'}</button>
      <button className="nd-station" aria-label="Radio stations" onClick={() => setPanel(panel === 'radio' ? null : 'radio')}><small>{audio.error ? 'Signal unavailable' : audio.loading ? 'Tuning...' : audio.playing ? 'On air' : 'Tap play'}</small><b>{audio.station.name}</b></button>
      <button aria-label={`Camera: ${names[camera]}`} onClick={() => changeCamera(cameras[(cameras.indexOf(camera) + 1) % cameras.length])}>{camera === 'la' ? 'LA view' : names[camera]}</button>
      <button aria-label="Auto Director" aria-pressed={director} onClick={() => setDirector(!director)}>Director</button>
      <button aria-label="Sky" onClick={() => setSky(sky === 'night' ? 'sunset' : 'night')}>{sky === 'night' ? 'Night' : 'Sunset'}</button>
      <button aria-label="Cast to TV" onClick={() => setPanel(panel === 'cast' ? null : 'cast')}>Cast</button>
    </div>
    {panel && <section className="nd-panel" aria-label={panel}><header><b>{panel === 'radio' ? 'Choose your soundtrack' : panel === 'cast' ? 'Mirror this drive' : 'Your drive'}</b><button aria-label="Close panel" onClick={() => setPanel(null)}>x</button></header>
      {panel === 'radio' && <><label>Station<select aria-label="Station" value={audio.stationId} onChange={e => audio.selectStation(e.target.value)}>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Music volume<input aria-label="Music volume" type="range" min="0" max="1" step=".05" value={audio.volume} onChange={e => audio.setVolume(Number(e.target.value))} /></label><p role="status">{audio.error || (pulse.source === 'live' ? 'City lights follow the live spectrum.' : 'Natural lighting rhythm. Live analysis is unavailable or paused.')}</p></>}
      {panel === 'options' && <><label>Driving mood<select aria-label="Driving mood" value={mood} onChange={e => setMood(e.target.value as DrivingMood)}><option value="cruise">Cruise</option><option value="night-drive">Night Drive</option><option value="midnight-run">Midnight Run</option></select></label><label>Camera<select aria-label="Camera" value={camera} onChange={e => changeCamera(e.target.value as NightCamera)}>{cameras.map(c => <option key={c} value={c}>{names[c]}</option>)}</select></label><label className="nd-check"><input aria-label="Ambiance" type="checkbox" checked={ambientOn} onChange={toggleAmbience} />Ambiance {ambientOn ? 'On' : 'Off'}</label><label>Ambiance level<input aria-label="Ambiance level" type="range" min="0" max="1" step=".05" value={ambientGain} onChange={e => setAmbientGain(Number(e.target.value))} /></label>{ambientError && <p role="status">{ambientError}</p>}<button onClick={() => { void document.documentElement.requestFullscreen?.().catch(() => {}) }}>Fullscreen</button><p><a href="/cruise/miami-test">Back to Miami Test</a> - <a href="/cruise">Original Cruise</a></p><small>Prototype exterior: modified Mazda RX-7 by <a href="https://poly.pizza/m/SnIoWlh7S2" target="_blank" rel="noreferrer">IvOfficial</a>, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>. Roof removed; custom cockpit and paint. Procedural ambiance is an audition draft.</small></>}
      {panel === 'cast' && <><p><b>Chrome desktop:</b> browser menu &gt; Cast &gt; Sources &gt; Cast tab, to include this scene and its sound.</p><p><b>Android:</b> Google Home &gt; your TV &gt; Cast my screen.</p><p><b>iPhone / iPad / Mac:</b> Control Center &gt; Screen Mirroring &gt; compatible TV.</p><p>Keep this page playing. Your device starts mirroring; a website cannot start it universally.</p><small>Separate TV Remote Mode remains in <a href="/cruise/miami-test">Miami Test</a>; it does not stream this experimental world.</small></>}
    </section>}
    {metrics && <output className="nd-metrics">{district} - {mood} - {Math.round(state.current.speed * 3.6)} km/h - {Math.round(state.current.odometer)} m</output>}
    </div>
  </main>
}
