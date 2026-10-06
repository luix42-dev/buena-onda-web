'use client'
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, ArrowRight, Camera, Maximize, Moon, Pause, Play, Radio, Sun, Volume2, VolumeX, X } from 'lucide-react'
import { LAUNCH_CARS } from '@/lib/cruise/launch'
import { initialQuality } from '@/lib/cruise/quality'
import { getCruisePlace } from '@/lib/cruise/campaigns'
import type { CruiseCamera, CruiseCampaign, CruiseQuality, CruiseVehicleId, CruiseDistrict, CruiseDistrictRequest } from '@/lib/cruise/types'
import { useCruiseAudio } from './audio/useCruiseAudio'
import { CockpitProvider, type RadioAction } from './vehicle/CockpitContext'
import RadioConsole, { type TutorialStep } from './radio/RadioConsole'
import { DISTRICT_LABELS } from '@/lib/cruise/routes'
import RadioPanel from './RadioPanel'
import PlaceDiscovery from './places/PlaceDiscovery'
import { useCruiseAnalytics } from './analytics'
import type { CruiseAdViewabilitySample } from './ads'
import './cruise.css'
import './launch.css'
const Scene=dynamic(()=>import('./CruiseScene'),{ssr:false})
class Boundary extends Component<{children:ReactNode; onFailure:()=>void},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(){this.props.onFailure()}
  render(){return this.state.failed?null:this.props.children}
}
const noop=()=>{}
const DRIVES=[{id:'full',name:'Full Miami drive'},{id:'causeway',name:'Coastal Causeway'},{id:'south-beach',name:'South Beach'},{id:'downtown',name:'Downtown / Bayside'},{id:'biscayne-midtown',name:'MiMo / Biscayne'}] as const
export default function LaunchExperience({campaign,campaignValid}:{campaign:CruiseCampaign;campaignValid:boolean}) {
  const root=useRef<HTMLDivElement>(null)
  const [hydrated,setHydrated]=useState(false)
  const [garage,setGarage]=useState(true)
  const [vehicle,setVehicle]=useState<CruiseVehicleId>('island-trail')
  const [paint,setPaint]=useState('#e3e1d4')
  const [mood,setMood]=useState<'day'|'night'>('day')
  const [camera,setCamera]=useState<CruiseCamera>('chase')
  const [quality,setQuality]=useState<CruiseQuality>('low')
  const [dpr,setDpr]=useState(1)
  const [reduced,setReduced]=useState(false)
  const [vehicleReady,setVehicleReady]=useState(false)
  const [sceneReady,setSceneReady]=useState(false)
  const [failed,setFailed]=useState(false)
  const [radioOpen,setRadioOpen]=useState(false)
  const [radioFocused,setRadioFocused]=useState(false)
  const [tutorial,setTutorial]=useState<TutorialStep>(null)
  const tutorialSeen=useRef(false)
  const [driveChoice,setDriveChoice]=useState('full')
  const routeChanged=useRef(false)
  const [districtRequest,setDistrictRequest]=useState<CruiseDistrictRequest|null>(null)
  const [district,setDistrict]=useState<CruiseDistrict>('south-beach')
  const [credits,setCredits]=useState(false)
  const [placeOpen,setPlaceOpen]=useState(false)
  const [deepLinkPlace,setDeepLinkPlace]=useState<string>()
  const [initialPlaceId,setInitialPlaceId]=useState<string>()
  const [nearbyPlaceId,setNearbyPlaceId]=useState<string|null>(null)
  const hasStarted=useRef(false)
  const [notice,setNotice]=useState(campaignValid?'':'Campaign unavailable. Showing Buena Onda.')
  const [hud,setHud]=useState(true)
  const hideTimer=useRef<ReturnType<typeof setTimeout>>()
  const audio=useCruiseAudio()
  const car=LAUNCH_CARS.find(car=>car.id===vehicle)!
  const {recordAdViewability}=useCruiseAnalytics({active:!garage && sceneReady && !failed,camera,cinematic:false,radioPlaying:audio.playing,stationId:audio.stationId,timeMode:mood,timeOfDay:mood,weather:'clear',campaign})
  const exposures=useRef(new Map<string,{qualified:boolean;duration:number;at:number}>())
  const handleExposure=useCallback((samples:readonly CruiseAdViewabilitySample[])=>{
    if(garage || document.hidden) return
    for(const sample of samples){
      const previous=exposures.current.get(sample.placementId)
      const qualifies=sample.viewable && sample.visibleDurationMs>=2000
      // One continuous approach, qualified after two seconds. Never infer exposure from loading.
      const continuous=previous && sample.sampledAt-previous.at<2000 && sample.visibleDurationMs>=previous.duration
      const duration=qualifies ? (continuous && previous.qualified ? sample.visibleDurationMs-previous.duration : sample.visibleDurationMs) : 0
      if(duration>0)recordAdViewability({placementId:sample.placementId,format:sample.format,campaignId:sample.campaignId,visible:true,durationMs:Math.min(duration,3000),distance:sample.distance,projectedArea:sample.projectedArea})
      exposures.current.set(sample.placementId,{qualified:qualifies,duration:sample.visibleDurationMs,at:sample.sampledAt})
    }
  },[garage,recordAdViewability])
  const reveal=useCallback(()=>{setHud(true);clearTimeout(hideTimer.current);hideTimer.current=setTimeout(()=>{if(!root.current?.querySelector(':focus-visible'))setHud(false)},6500)},[])
  const toggleCamera=useCallback(()=>{setCamera(value=>value==='chase'?'driver':'chase');reveal()},[reveal])
  const finishTutorial=useCallback(()=>{setTutorial(null);tutorialSeen.current=true;try{localStorage.setItem('buena-onda-radio-help-v1','seen')}catch{}},[])
  const focusRadio=useCallback(()=>{if(garage)return;setRadioFocused(true);setRadioOpen(false);setTutorial(value=>value===0?1:value);reveal()},[garage,reveal])
  const closeRadio=useCallback(()=>{setRadioFocused(false);if(tutorial===3)finishTutorial();reveal();requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>('[aria-label="Focus radio"]')?.focus())},[tutorial,finishTutorial,reveal])
  const radioAction=useCallback((action:RadioAction)=>setTutorial(value=>value===1&&(action==='preset'||action==='seek')?2:value===2&&action==='volume'?3:value),[])
  const replayTutorial=useCallback(()=>{setRadioFocused(false);setRadioOpen(false);setTutorial(0);reveal()},[reveal])
  useEffect(()=>{
    const next=initialQuality();setQuality(next==='high'?'medium':next)
    setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches)
    const place=getCruisePlace(new URLSearchParams(window.location.search).get('place'));if(place)setDeepLinkPlace(place.id)
    try{const saved=JSON.parse(localStorage.getItem('buena-onda-cruise-launch')||'{}');if(LAUNCH_CARS.some(car=>car.id===saved.vehicle))setVehicle(saved.vehicle);if(saved.mood==='day'||saved.mood==='night')setMood(saved.mood);if(LAUNCH_CARS.some(car=>car.paints.some(p=>p.color===saved.paint)))setPaint(saved.paint);if(DRIVES.some(d=>d.id===saved.drive))setDriveChoice(saved.drive);tutorialSeen.current=localStorage.getItem('buena-onda-radio-help-v1')==='seen'}catch{}
    setHydrated(true)
    return ()=>clearTimeout(hideTimer.current)
  },[])
  useEffect(()=>{if(hydrated)try{localStorage.setItem('buena-onda-cruise-launch',JSON.stringify({vehicle,mood,paint,drive:driveChoice}))}catch{}},[hydrated,vehicle,mood,paint,driveChoice])
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{if(placeOpen||(e.target as Element)?.closest('dialog'))return;if(e.key==='Escape'){closeRadio();setRadioOpen(false);setCredits(false);reveal();return}if((e.target as Element)?.closest('input,select,textarea,[role=slider]'))return;if(e.key.toLowerCase()==='c'&&!garage&&!radioFocused&&!e.repeat)toggleCamera();if(e.key.toLowerCase()==='r'&&!garage&&!e.repeat)focusRadio()}
    window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key)
  },[garage,toggleCamera,reveal,placeOpen,radioFocused,closeRadio,focusRadio])
  useEffect(()=>{if(!hydrated||vehicleReady||failed)return;const timer=setTimeout(()=>{setNotice('This car could not load. Try reloading Cruise.');setFailed(true)},45000);return ()=>clearTimeout(timer)},[hydrated,vehicle,vehicleReady,failed])
  const ready=useCallback(()=>setVehicleReady(true),[])
  const worldReady=useCallback(()=>{setSceneReady(true);setDistrictRequest(null)},[])
  const failure=useCallback(()=>setFailed(true),[])
  const degrade=useCallback(()=>{if(quality!=='low')setQuality('low');else setDpr(value=>Math.max(.75,value-.15))},[quality])
  function select(id:CruiseVehicleId){if(id===vehicle)return;setVehicleReady(false);setVehicle(id);const paints=LAUNCH_CARS.find(c=>c.id===id)?.paints;if(paints?.length&&!paints.some(p=>p.color===paint))setPaint(paints[0].color)}
  function shift(direction:number){const index=LAUNCH_CARS.findIndex(car=>car.id===vehicle);select(LAUNCH_CARS[(index+direction+LAUNCH_CARS.length)%LAUNCH_CARS.length].id)}
  function start(){const first=!hasStarted.current;if(first){setInitialPlaceId(routeChanged.current?undefined:deepLinkPlace);hasStarted.current=true}else setInitialPlaceId(undefined);if((first&&!deepLinkPlace)||routeChanged.current){setDistrictRequest({id:(driveChoice==='full'?'south-beach':driveChoice) as CruiseDistrict,revision:Date.now()});routeChanged.current=false}if(first&&!audio.playing)audio.start();setGarage(false);setSceneReady(false);setCredits(false);setRadioOpen(false);setRadioFocused(false);if(first&&!tutorialSeen.current)setTutorial(0);exposures.current.clear();reveal()}
  function returnGarage(){setGarage(true);setRadioOpen(false);setRadioFocused(false);setHud(true)}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.current?.requestFullscreen)await root.current.requestFullscreen();else setNotice('Use your browser’s fullscreen or Add to Home Screen.')}catch{setNotice('Fullscreen is unavailable in this browser.')}reveal()}
  const visible=garage||hud||radioOpen||radioFocused||tutorial!==null||credits||placeOpen||!!audio.error||!!notice
  return <CockpitProvider audio={audio} vehicleId={vehicle} autoLights={mood==='night'} instant radioFocused={radioFocused} focusRadio={focusRadio} onRadioAction={radioAction}>
    <div ref={root} className={`cruise-experience launch-experience is-ready ${garage?'in-garage':'in-drive'} ${visible?'':'hud-hidden'}`} data-cruise data-launch data-garage={garage} data-ready={!garage&&sceneReady} data-vehicle={vehicle} data-vehicle-ready={vehicleReady} data-camera={camera} data-time={mood} data-radio-focused={radioFocused} onPointerMove={reveal} onPointerDown={reveal} onFocusCapture={reveal}>
      {hydrated&&!failed&&<Boundary onFailure={failure}><Scene camera={camera} radioFocused={radioFocused} cinematic={false} tv={false} reducedMotion={reduced} quality={quality} dprLimit={dpr} adaptive campaign={campaign} timeMode={mood} timeOfDay={mood} weather="clear" vehicleId={vehicle} onVehicleReady={ready} onVehicleFailure={failure} districtRequest={districtRequest} onDistrictChange={setDistrict} onShotChange={noop} onAdViewabilitySample={handleExposure} onAdActivate={noop} onDegrade={degrade} onReady={worldReady} onFailure={failure} launch garage={garage} paint={paint} initialPlaceId={initialPlaceId} onNearbyPlace={setNearbyPlaceId} measurementsEnabled={!placeOpen&&!radioOpen&&!radioFocused&&!credits} /></Boundary>}
      {!garage&&<><RadioConsole focused={radioFocused} step={tutorial} onClose={closeRadio} onSkip={finishTutorial} onReplay={replayTutorial} hidden={placeOpen||credits}/>{!radioFocused&&<span className="district-now">{DISTRICT_LABELS[district]} / MIAMI DRIVE</span>}</>}
      <PlaceDiscovery garage={garage} ready={vehicleReady&&!failed} initialPlaceId={deepLinkPlace} nearbyPlaceId={nearbyPlaceId} onStart={start} onOpenChange={setPlaceOpen}/>
      <header className="launch-header cruise-hud" aria-hidden={!visible} ref={e=>{if(e)e.inert=!visible}}>
        <a href="/" className="launch-brand">Buena Onda<span>CRUISE / MIAMI · BETA</span></a>
        {garage?<button onClick={()=>setCredits(!credits)} className="launch-small">Credits</button>:<button onClick={returnGarage} className="launch-pill"><ArrowLeft size={16}/> Garage</button>}
      </header>
      {garage&&<div className="launch-garage">
        <div className="launch-garage-heading"><p>BETA — STILL FINDING OUR GROOVE.</p><h1>Your ride. Your rhythm.</h1><a className="launch-support" href="/themes" target="_blank" rel="noopener noreferrer">Support Buena Onda <ArrowRight size={13}/><span className="place-sr-only"> — explore the catalog (opens a new tab)</span></a></div>
        <div className="launch-car-arrows"><button aria-label="Previous car" onClick={()=>shift(-1)}><ArrowLeft/></button><button aria-label="Next car" onClick={()=>shift(1)}><ArrowRight/></button></div>
        <section className="launch-selection" aria-label="Garage">
          <div className="launch-car-copy"><span className="launch-eyebrow">{car.tag}</span><h2>{car.name}</h2><p>{car.description}</p>
            <div className="launch-swatches" aria-label="Paint color">{car.paints.map(p=><button key={p.color} title={p.name} aria-label={`${p.name} paint`} aria-pressed={paint===p.color} onClick={()=>setPaint(p.color)} style={{background:p.color}}/>)}</div>
          </div>
          <div className="launch-departure"><label className="drive-choice">Choose your drive<select aria-label="Choose your drive" value={driveChoice} onChange={e=>{setDriveChoice(e.target.value);routeChanged.current=true}}>{DRIVES.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><div className="launch-moods" aria-label="Drive mood">{(['day','night'] as const).map(value=><button key={value} aria-pressed={mood===value} onClick={()=>setMood(value)}>{value==='day'?<Sun size={17}/>:<Moon size={17}/>} {value==='day'?'Day Drive':'Night Drive'}</button>)}</div><button className="launch-start" onClick={start} disabled={!vehicleReady||failed}>LET’S CRUISE <ArrowRight size={20}/></button><span className="launch-footnote">Automatic cruising · Radio starts with your drive</span></div>
          <div className="launch-lineup" aria-label="Choose your car">{LAUNCH_CARS.map(item=><button key={item.id} aria-pressed={vehicle===item.id} onClick={()=>select(item.id)}><img src={`/cruise/vehicle/${item.id}-thumb.svg`} alt="" width="76" height="32"/>{item.name}</button>)}</div>
        </section>
      </div>}
      {(!vehicleReady||(!garage&&!sceneReady))&&!failed&&<div className="launch-loading" role="status">{garage?'Bringing your car around…':'Heading for the coast…'}</div>}
      {failed&&<div className="launch-failure" role="alert"><h2>We couldn’t start the drive.</h2><p>3D may be unavailable or a car failed to load.</p><button onClick={()=>window.location.reload()}>Reload Cruise</button><a href="/radio">Listen to Buena Onda Radio</a></div>}
      {(!garage||audio.playing||audio.error)&&<footer className="launch-controls cruise-hud" aria-hidden={!visible} ref={e=>{if(e)e.inert=!visible}}>
        <div className="launch-radio"><button className="launch-icon" onClick={audio.toggle} aria-label={audio.playing?'Pause radio':'Play radio'}>{audio.playing?<Pause size={19}/>:<Play size={19}/>}</button><button className="launch-station" aria-label="Radio stations" aria-expanded={radioOpen} onClick={()=>setRadioOpen(!radioOpen)}><span>Buena Onda Radio <Radio size={12}/></span><strong>{audio.loading?'Tuning in…':audio.station.name}</strong></button><button className="launch-icon" onClick={()=>audio.setMuted(!audio.muted)} aria-label={audio.muted?'Unmute radio':'Mute radio'}>{audio.muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><input aria-label="Radio volume" type="range" min="0" max="1" step=".01" value={audio.volume} onChange={e=>{audio.setVolume(Number(e.target.value));audio.setMuted(false)}}/></div>
        {!garage&&<div className="launch-drive-tools"><button onClick={toggleCamera} aria-label={`Change camera: ${camera==='chase'?'Exterior':'Interior'}`}><Camera size={18}/><span>{camera==='chase'?'Exterior':'Interior'}</span></button><button onClick={()=>setMood(mood==='day'?'night':'day')} aria-label={`Switch to ${mood==='day'?'Night':'Day'} Drive`}>{mood==='day'?<Sun size={18}/>:<Moon size={18}/>}<span>{mood==='day'?'Day':'Night'}</span></button><button onClick={()=>void fullscreen()} aria-label="Fullscreen"><Maximize size={18}/></button></div>}
        {radioOpen&&<RadioPanel audio={audio} onClose={()=>setRadioOpen(false)}/>}
        {audio.error&&<div className="launch-message" role="status">{audio.error}<button onClick={audio.start}>Retry radio</button><button onClick={()=>setRadioOpen(true)}>Choose station</button></div>}
      </footer>}
      {notice&&<div className="launch-message launch-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={()=>setNotice('')}><X size={15}/></button></div>}
      {credits&&<section className="launch-credits" aria-label="Asset credits"><button aria-label="Close credits" onClick={()=>setCredits(false)}><X/></button><h2>Made for the long way home.</h2><p>Coastal Coupe uses “Mazda RX-7” by IvOfficial, <a href="https://poly.pizza/m/SnIoWlh7S2" target="_blank" rel="noreferrer">Poly Pizza</a>, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>. Modified paint and original cabin.</p><p>Classic Coupe uses “Pontiac GTO 67” by thecali, CC0, via the <a href="https://benedikt-bitterli.me/resources/" target="_blank" rel="noreferrer">Rendering Resources collection</a>. Modified for this drive.</p><p>Island Trail is an original late-1980s off-roader inspired by supplied Wrangler YJ reference photos, with a matching cabin. It is not an official Jeep model.</p><p>Fictional showroom names; no manufacturer affiliation. Environment asset credits are preserved in the project ledger.</p></section>}
    </div>
  </CockpitProvider>
}
