'use client'
import {Component,Suspense,useCallback,useEffect,useMemo,useRef,useState,type ReactNode,type MutableRefObject} from 'react'
import {Canvas,useFrame,useThree} from '@react-three/fiber'
import * as T from 'three'
import StreetSky from '../master/StreetSky'
import {pulse,updatePulse} from '../master/pulse'
import NightWorld from '../nightdrive/NightWorld'
import NeonWorld from '../neon/NeonWorld'
import NeonSky from '../neon/NeonSky'
import HoloHost,{type HostEvent} from '../neon/HoloHost'
import {NeonDirector,type NeonShot} from '../neon/neonDirector'
import {NEON_STATIONS,NEON_WORLD,HOST_NAME} from '@/lib/real-miami/neon'
import MiamiWorld from '../miami/MiamiWorld'
import MiamiAds from '../miami/MiamiAds'
import {MiamiAdCue,useRealMiamiAds,useRealMiamiCampaign} from '../CampaignBridge'
import {DEFAULT_CRUISE_CAMPAIGN} from '@/lib/cruise/campaigns'
import MiamiMap from '../miami/MiamiMap'
import CruiseGlow from '../miami/CruiseGlow'
import {createMiamiRoute,type MiamiGeoData} from '@/lib/real-miami/miami-geo'
import landmarkRegistry from '../../../public/real-miami/miami/landmarks.json'
import {createNightState,type NightState} from '../nightdrive/state'
import {stepNight} from '../nightdrive/dynamics'
import {roadSample} from '../nightdrive/road'
import {CockpitProvider} from '../vehicle/CockpitContext'
import {useCruiseAudio} from '../audio/useCruiseAudio'
import {useRadioLibrary} from '../audio/useRadioLibrary'
import RadioSongPanel from '../audio/RadioSongPanel'
import DiscoveryConsole from '@/components/human-radio/DiscoveryConsole'
import OpeningMinute from '@/components/experience/OpeningMinute'
import PostcardCapture,{type PostcardCaptureRequest} from '@/components/experience/PostcardCapture'
import CruisePostcard from '@/components/experience/CruisePostcard'
import ExperienceMetricsControls from '@/components/experience/ExperienceMetricsControls'
import {useExperienceMetrics} from '@/components/experience/useExperienceMetrics'
import {isFreshHumanRadioTrack} from '@/lib/human-radio/metadata'
import {experienceCameraProfile,nightBlend,sunsetDurationSeconds} from '@/lib/experience/atmosphere'
import {useHumanMetadata} from '@/components/human-radio/useHumanMetadata'
import {chooseInitialStation,readRememberedStation} from '@/lib/human-radio/station-memory'
import {HUMAN_RADIO_STATIONS} from '@/lib/human-radio/stations'
import {MIAMI_CRUISE_STATIONS,canPlayCruiseStation} from '@/lib/real-miami/stations'
import {WRANGLER_CAMERA_PROFILE,type RideCameraProfile,type RideVehicleId} from '@/lib/real-miami/ride-vehicles'
import {MusicAudio} from '@/lib/real-miami/music-audio'
import Wrangler from './Wrangler'
import Countach,{COUNTACH_CAMERA_PROFILE,COUNTACH_ATTRIBUTION} from './Countach'
import EightiesCar,{EIGHTIES_CAMERA_PROFILE,EIGHTIES_ATTRIBUTION} from './EightiesCar'
import CastControl from './CastControl'
import RidePicker from './RidePicker'
import GarageEnvironment from './GarageEnvironment'
import Delorean,{DELOREAN_CAMERA_PROFILE,DELOREAN_ATTRIBUTION} from './Delorean'
import ClassicConvertible,{CLASSIC_CAMERA_PROFILE,CLASSIC_ATTRIBUTION} from './ClassicConvertible'
import {CruiseDirector,SHOT_LABEL,type DirectorShotId} from '../director/director'
import DirectorOverlay from '../director/DirectorOverlay'
import MiamiCrowd from '../people/MiamiCrowd'
import LiveCruisers from '../presence/LiveCruisers'
import {readShared,shareUrl,type SharedDrive} from '@/lib/real-miami/share'
import {readChoice,resolve,saveChoice,type QualityChoice} from '@/lib/real-miami/quality'
import {createMiamiAdPlacements} from '@/lib/real-miami/advertising'
import './jeep.css'

type View='driver'|'chase'|'director'
type Snapshot={speed:number;rpm:number;distance:number;paused:boolean;camera:View;radioFocused:boolean;district:string;fps:number;station:string;playing:boolean;muted:boolean;volume:number;analysis:string;spectrum:number;drawCalls:number;ready:boolean;vehicle:RideVehicleId;garage:boolean;timeMode:'night'|'sunset'}
declare global{interface Window{__director?:()=>ReturnType<CruiseDirector['snapshot']>;__directorForce?:(shot:DirectorShotId|null)=>void;__jeepNight?:()=>Snapshot;__miamiGeo?:()=>Record<string,unknown>;__miamiInspect?:(meters:number)=>void}}
class Guard extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}render(){return this.state.failed?<div className="jn-failure"><h1>The road could not load.</h1><p>Please reload to try again.</p><button onClick={()=>location.reload()}>Reload</button></div>:this.props.children}}

type GeoRoute=ReturnType<typeof createMiamiRoute>
type Landmark=typeof landmarkRegistry.landmarks[number]
function Ride({state,car,view,radioFocused,landmark,music,playing,report,route,blend,cycleStart,night,garage,vehicle,profile=WRANGLER_CAMERA_PROFILE,director=null,neonDirector=null,fast=false,motion,speedFx,transitionSeconds=2400}:{transitionSeconds?:number;fast?:boolean;neonDirector?:NeonDirector|null;speedFx?:MutableRefObject<boolean>;motion?:MutableRefObject<number>;director?:CruiseDirector|null;state:MutableRefObject<NightState>;car:MutableRefObject<T.Group|null>;view:View;radioFocused:boolean;landmark:Landmark|null;music:MusicAudio;playing:boolean;report:MutableRefObject<{fps:number;drawCalls:number}>;route:GeoRoute|null;blend:MutableRefObject<number>;cycleStart:MutableRefObject<number>;night:boolean;garage:boolean;vehicle:RideVehicleId;profile?:RideCameraProfile}){
 const {camera,gl}=useThree(),p=useMemo(()=>new T.Vector3(),[]),target=useMemo(()=>new T.Vector3(),[]),frames=useRef(0),duration=useRef(0)
 const focusMix=useRef(0),radioPosition=useMemo(()=>new T.Vector3(),[]),radioTarget=useMemo(()=>new T.Vector3(),[])
 const carBounds=useMemo(()=>({box:new T.Box3(),age:0,vehicle:''}),[]),directing=useRef(false)
 useFrame((_,delta)=>{
  const s=state.current;if(!garage)stepNight(s,Math.min(delta,.1),route?{sample:route.sample,touring:true}:fast?{sample:d=>roadSample(d,s.seed),fast:true}:undefined);updatePulse(music,playing&&music.analysisActive,Math.min(delta,.05))
  if(garage){
    const cam=camera as T.PerspectiveCamera,canvas=gl.domElement.getBoundingClientRect(),stage=document.querySelector('.rp-showcase')?.getBoundingClientRect()
    const width=canvas.width||1,height=canvas.height||1,stageWidth=Math.max(140,(stage?.width||width)*.8),stageHeight=Math.max(100,(stage?.height||height)*.95)
    const fov=40,vertical=Math.tan(fov*Math.PI/360),span=vehicle==='cadillac'?6.5:vehicle==='eighties'||vehicle==='countach'||vehicle==='delorean'?4.8:4.9
    const projectedHeight=vehicle==='wrangler'?2.4:vehicle==='eighties'||vehicle==='countach'||vehicle==='delorean'?1.8:2.0
    const distance=Math.max(span/(2*vertical*cam.aspect)*width/stageWidth,projectedHeight/(2*vertical)*height/stageHeight)
    cam.fov=fov;cam.setViewOffset(width,height,width/2-((stage?.left||canvas.left)-canvas.left+(stage?.width||width)/2),height/2-((stage?.top||canvas.top)-canvas.top+(stage?.height||height)/2),width,height)
    target.set(0,.85,0);p.set(-.65,.22,-.76).normalize().multiplyScalar(distance).add(target);camera.position.copy(p);camera.lookAt(target)
    if(car.current){car.current.position.set(0,0,0);car.current.rotation.set(0,0,0)}
    focusMix.current=0;blend.current=night?1:0
    frames.current++;duration.current+=delta;if(duration.current>=1){report.current={fps:frames.current/duration.current,drawCalls:gl.info.render.calls};frames.current=0;duration.current=0}
    return
  }
  const driveCamera=camera as T.PerspectiveCamera;if(driveCamera.view?.enabled)driveCamera.clearViewOffset()
  blend.current=nightBlend(s.elapsed,cycleStart.current,night,transitionSeconds)
  const road=route?route.sample(s.distance):roadSample(s.distance,s.seed),yaw=road.yaw,cx=s.lateral*Math.cos(yaw),cz=-s.lateral*Math.sin(yaw)
  if(car.current){car.current.position.set(cx,0,cz);car.current.rotation.set(route?0:Math.atan(('dy' in road?road.dy:0)/Math.sqrt(1+('dx' in road?road.dx:0)**2)),yaw,0,'YXZ')}
  const cam=camera as T.PerspectiveCamera,driver=view==='driver',portrait=cam.aspect<1
  focusMix.current=s.reduced?(radioFocused?1:0):T.MathUtils.damp(focusMix.current,radioFocused?1:0,6,Math.min(delta,.1));if(Math.abs(focusMix.current-(radioFocused?1:0))<.001)focusMix.current=radioFocused?1:0
  // Speed feel (FOV widening + edge blur) is off: Luis 2026-10-13, the real speed reads fine. ?speedfx=on for A/B only.
  const rush=s.reduced||s.paused||landmark||speedFx?.current===false?0:T.MathUtils.clamp((s.speed-9)/19,0,1)
  if(motion)motion.current=T.MathUtils.damp(motion.current,radioFocused?0:rush,3,Math.min(delta,.1))
  const kick=(motion?.current??0)*(driver?(portrait?5:8):(portrait?6:10))
  const fov=landmark&&!radioFocused?(portrait?70:58):T.MathUtils.lerp((driver?(portrait?90:62):(portrait?64:58))+kick,portrait?(profile.radioPortraitFov||58):(profile.radioFov||43),focusMix.current);if(Math.abs(cam.fov-fov)>.001){cam.fov=fov;cam.updateProjectionMatrix()}
  if(driver){p.fromArray(portrait?(profile.driverPortrait||profile.driver):profile.driver);target.fromArray(portrait?(profile.targetPortrait||profile.target):profile.target)}else{p.fromArray(portrait?(profile.chasePortrait||profile.chase):profile.chase);target.fromArray(profile.chaseTarget||[0,1.05,0])}
  radioPosition.fromArray(profile.radioPosition);radioTarget.fromArray(profile.radioTarget);p.lerp(radioPosition,focusMix.current);target.lerp(radioTarget,focusMix.current)
  for(const v of[p,target]){if(car.current)v.applyEuler(car.current.rotation);v.x+=cx;v.z+=cz}
  if(landmark&&route&&!radioFocused){
    const n=landmark.streetFacing.normal,offset=landmark.kind==='clevelander'?-10:0
    const x=landmark.position.x+n[1]*offset-road.x,z=landmark.position.z-n[0]*offset-road.z
    const width=landmark.kind==='clevelander'?44:landmark.streetFacing.width
    const distance=portrait?Math.max(26,width/(2*Math.tan(35*Math.PI/180)*cam.aspect)*1.2):32
    p.set(x+n[0]*distance,Math.max(5,landmark.bodyHeight*.6),z+n[1]*distance);target.set(x,landmark.bodyHeight*.52,z)
  }
  // Director mode: the existing driver/chase math above is untouched; the director
  // replaces the final pose only when no radio/landmark focus owns the camera.
  const directorActive=view==='director'&&!!director&&!!route&&!landmark&&focusMix.current===0
  if(directorActive&&director&&car.current){
   if(carBounds.vehicle!==vehicle||--carBounds.age<=0){const r=car.current.rotation.clone(),q=car.current.position.clone();car.current.rotation.set(0,0,0);car.current.position.set(0,0,0);car.current.updateMatrixWorld(true);carBounds.box.setFromObject(car.current);car.current.rotation.copy(r);car.current.position.copy(q);car.current.updateMatrixWorld(true);if(carBounds.box.isEmpty())carBounds.box.set(new T.Vector3(-1,0,-2.1),new T.Vector3(1,1.1,2.1));carBounds.vehicle=vehicle;carBounds.age=120}
   if(!directing.current)director.reset()
   const frame=director.update({dt:delta,distance:s.distance,speed:s.speed,lateral:s.lateral,aspect:cam.aspect,reduced:s.reduced,carMin:carBounds.box.min,carMax:carBounds.box.max,traffic:s.traffic,kick:pulse.kick,phrase:music.director.signal.phrase,beatLive:pulse.source==='live',night:blend.current})
   p.copy(frame.position);target.copy(frame.target)
   // Radial speed blur belongs to car-near shots; far/static shots stay crisp.
   if(motion&&(frame.shot==='aerial'||frame.shot==='landmarkPass'||frame.shot==='oceanSide'||frame.shot==='sideTrack'))motion.current=0
   if(Math.abs(cam.fov-frame.fov)>.001){cam.fov=frame.fov;cam.updateProjectionMatrix()}
  }
  // Neon Run has no OSM route; its director is car-relative and needs no occlusion index.
  const neonActive=view==='director'&&!!neonDirector&&!route&&!landmark&&focusMix.current===0
  if(neonActive&&neonDirector&&car.current){
   const origin=roadSample(s.distance,s.seed)
   const frame=neonDirector.update(Math.min(delta,.1),car.current.position,yaw,s.speed,s.distance,(d,lateral,up,out)=>{const q=roadSample(d,s.seed);return out.set(q.x-origin.x+Math.cos(q.yaw)*lateral,q.y-origin.y+up,q.z-origin.z-Math.sin(q.yaw)*lateral)})
   p.copy(frame.position);target.copy(frame.target);if(motion)motion.current=0
   if(Math.abs(cam.fov-frame.fov)>.001){cam.fov=frame.fov;cam.updateProjectionMatrix()}
  }
  if(neonDirector&&!neonActive)neonDirector.reset()
  directing.current=directorActive
  camera.position.copy(p);camera.lookAt(target)
  frames.current++;duration.current+=delta;if(duration.current>=1){report.current={fps:frames.current/duration.current,drawCalls:gl.info.render.calls};frames.current=0;duration.current=0}
 },-2)
 return null
}

function Equalizer({music,active}:{music:MusicAudio;active:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{let raf=0;const draw=()=>{const c=canvas.current?.getContext('2d');if(c){const w=576,h=100;c.clearRect(0,0,w,h);let signal=0;for(let i=0;i<24;i++){const value=active&&music.analysisActive?pulse.spectrum[i]:0;signal+=value;c.fillStyle=i<14?'#89dac0':i<20?'#e2b971':'#ee8b6f';const segments=Math.round(value*13);for(let j=0;j<13;j++){c.globalAlpha=j<segments?1:.10;c.fillRect(i*24+3,h-j*7-8,15,4)}c.globalAlpha=1;if(active&&music.analysisActive){c.fillStyle='#e8e6bf';c.fillRect(i*24+3,h-pulse.peaks[i]*91-9,15,2)}}canvas.current!.dataset.signal=String(signal)}raf=requestAnimationFrame(draw)};draw();return()=>cancelAnimationFrame(raf)},[active,music])
 return <canvas ref={canvas} width={576} height={100} className="jn-spectrum" aria-label="Live radio spectrum equalizer"/>
}

function HostCaption({line,onOpen}:{line:{text:string;cta:string};onOpen:()=>void}){
 return <aside className="jn-host" role="status" aria-live="polite"><span>{HOST_NAME} <i>· holographic message</i></span><p>“{line.text}”</p><button onClick={onOpen}>{line.cta} ↗</button></aside>
}
export default function JeepNight({humanRadio=false,experienceFirst=false}:{humanRadio?:boolean;experienceFirst?:boolean}={}){
 const [listeningOnly,setListeningOnly]=useState(()=>humanRadio&&new URLSearchParams(location.search).get('listen')==='1'),[presence,setPresence]=useState(false),[mapOpen,setMapOpen]=useState(false)
 const campaign=useRealMiamiCampaign()||DEFAULT_CRUISE_CAMPAIGN,advertising=useRealMiamiAds()
 const [enhanced,setEnhanced]=useState(true)
 const [vehicle,setVehicle]=useState<RideVehicleId>(()=>{const q=new URLSearchParams(location.search),v=q.get('car');return experienceFirst&&['countach','wrangler','eighties','cadillac','delorean'].includes(v||'')?v as RideVehicleId:q.get('world')==='neon'?'delorean':'countach'})
 const baseProfile=vehicle==='delorean'?DELOREAN_CAMERA_PROFILE:vehicle==='countach'?COUNTACH_CAMERA_PROFILE:vehicle==='cadillac'?CLASSIC_CAMERA_PROFILE:vehicle==='eighties'?EIGHTIES_CAMERA_PROFILE:WRANGLER_CAMERA_PROFILE
 useEffect(()=>{if(new URLSearchParams(location.search).get('look')==='original')setEnhanced(false)},[])
 const profile=useMemo(()=>experienceCameraProfile(baseProfile,vehicle,experienceFirst),[baseProfile,vehicle,experienceFirst])
 const [transitionSeconds]=useState(()=>experienceFirst?sunsetDurationSeconds(new URLSearchParams(location.search).get('sunsetMinutes')):2400)
 const speedFx=useRef(false),motion=useRef(0),state=useRef(createNightState()),car=useRef<T.Group|null>(null),report=useRef({fps:0,drawCalls:0}),music=useMemo(()=>new MusicAudio(),[])
 const [neon]=useState(()=>!humanRadio&&new URLSearchParams(location.search).get('world')==='neon'),STATIONS=humanRadio?HUMAN_RADIO_STATIONS:neon?NEON_STATIONS:MIAMI_CRUISE_STATIONS,RADIO_PRESETS=useMemo(()=>STATIONS.filter(canPlayCruiseStation),[STATIONS])
 const [host,setHost]=useState<HostEvent>({phase:'gone'}),[hostOff]=useState(()=>new URLSearchParams(location.search).get('host')==='off')
 const [geo,setGeo]=useState<MiamiGeoData|null>(null),[geoError,setGeoError]=useState(''),[baseline,setBaseline]=useState(false),[duskNight,setDuskNight]=useState(false),blend=useRef(1),cycleStart=useRef(0)
 const shared=useRef<SharedDrive|null>(null);if(shared.current===null&&typeof window!=='undefined')shared.current=readShared(location.search)
 const route=useMemo(()=>geo?createMiamiRoute(geo):null,[geo])
 const director=useMemo(()=>{if(!geo||!route)return null;let ads:[number,number][]=[];try{ads=createMiamiAdPlacements(geo,route,campaign).map(a=>[a.x,a.z])}catch{}const seed=Number(new URLSearchParams(location.search).get('directorSeed'))||Date.now();return new CruiseDirector(route,geo,landmarkRegistry.landmarks as never,ads,seed)},[geo,route,campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps -- one director per drive; a new campaign object identity must not reset the edit
 const [crowd,setCrowd]=useState(true),[qualityChoice,setQualityChoice]=useState<QualityChoice>('auto')
 useEffect(()=>{setQualityChoice(readChoice())},[])
 const quality=useMemo(()=>resolve(qualityChoice),[qualityChoice])
 useEffect(()=>{director?.setTier(quality.directorTier);document.documentElement.dataset.cruiseQuality=quality.tier},[director,quality])
 useEffect(()=>{if(new URLSearchParams(location.search).get('npcs')==='off')setCrowd(false)},[])
 const [letterbox,setLetterbox]=useState(true),[shot,setShot]=useState<DirectorShotId|null>(null),[neonShot,setNeonShot]=useState<NeonShot|null>(null)
 const neonDirector=useMemo(()=>neon?new NeonDirector(Number(new URLSearchParams(location.search).get('directorSeed'))||7):null,[neon])
 useEffect(()=>{if(!neonDirector)return;window.__director=()=>neonDirector.snapshot() as never;if(new URLSearchParams(location.search).get('diagnostics')==='1')window.__directorForce=shot=>neonDirector.force(shot as unknown as NeonShot|null);const timer=setInterval(()=>setNeonShot(neonDirector.shot),250);return()=>{clearInterval(timer);delete window.__director;delete window.__directorForce}},[neonDirector])
 useEffect(()=>{if(neon||(!humanRadio&&new URLSearchParams(location.search).get('world')==='baseline')){setBaseline(true);return}const abort=new AbortController();fetch('/real-miami/miami/world.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error(`Map unavailable (${r.status})`);return r.json()}).then(data=>{state.current.distance=shared.current?.startMeters??landmarkRegistry.initialRouteMeters;state.current.traffic.forEach((car,i)=>{car.distance=state.current.distance+65+i*115;car.lateral=2});setGeo(data)}).catch(e=>{if(e.name!=='AbortError')setGeoError(e.message)});return()=>abort.abort()},[])
 const audio=useCruiseAudio(music,STATIONS),library=useRadioLibrary({...audio,requested:humanRadio?false:audio.requested}),humanMetadata=useHumanMetadata(audio.stationId,humanRadio&&audio.requested),activeNowPlaying=humanRadio?{stationId:audio.stationId,title:humanMetadata?.title||humanMetadata?.show||null,artist:humanMetadata?.artist||null,source:humanMetadata?.source||null,observedAt:humanMetadata?.observedAt||new Date().toISOString(),available:humanMetadata?.available||false,kind:humanMetadata?.kind||'unavailable' as const}:library.nowPlaying,displayTitle=humanRadio?[humanMetadata?.artist,humanMetadata?.title||humanMetadata?.show].filter(Boolean).join(' - '):library.displayTitle,radioAudio=useMemo(()=>({...audio,trackTitle:displayTitle}),[audio,displayTitle]),[ready,setReady]=useState(false),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[view,setView]=useState<View>(experienceFirst?'chase':'driver'),[radio,setRadio]=useState(false),[night,setNight]=useState(!humanRadio),[visible,setVisible]=useState(true),[speed,setSpeed]=useState(0),[district,setDistrict]=useState('Coastal boulevard'),[tone,setTone]=useState<'cruise'|'night-drive'|'midnight-run'>('night-drive')
 const current=useRef({audio,view,ready,radio,vehicle,started});current.current={audio,view,ready,radio,vehicle,started}
 const [radioPanel,setRadioPanel]=useState(false),[openingElapsed,setOpeningElapsed]=useState(0),manualCamera=useRef(false),openingStart=useRef(0)
 const metrics=useExperienceMetrics({active:experienceFirst,started:started||audio.requested,playing:audio.playing&&!audio.loading,muted:audio.muted,volume:audio.volume,elapsed:openingElapsed})
 const lastPlaybackError=useRef<string|null>(null)
 useEffect(()=>{if(experienceFirst&&audio.error&&audio.error!==lastPlaybackError.current)metrics.record('playback_failure');lastPlaybackError.current=audio.error},[experienceFirst,audio.error,metrics.record])
 const captureRequest=useRef<PostcardCaptureRequest|null>(null)
 const capturePostcard=useCallback(()=>new Promise<Blob>((resolve,reject)=>{if(captureRequest.current){reject(new Error('A capture is already in progress.'));return}const timeout=setTimeout(()=>{captureRequest.current=null;reject(new Error('The scene is not drawing. Return to the visible scenery and try again.'))},10000);captureRequest.current={resolve:blob=>{clearTimeout(timeout);resolve(blob)},reject:error=>{clearTimeout(timeout);reject(error)}}}),[])
 const [landmark,setLandmark]=useState<Landmark|null>(null),[nearbyLandmark,setNearbyLandmark]=useState<Landmark|null>(null),landmarkRef=useRef<Landmark|null>(null),priorPark=useRef(false)
 landmarkRef.current=landmark
 const closeLandmark=useCallback(()=>{if(landmarkRef.current){setLandmark(null);setPaused(priorPark.current);landmarkRef.current=null}},[])
 const openRadio=useCallback(()=>{if(!started)return;closeLandmark();setRadioPanel(false);setRadio(true)},[closeLandmark,started])
 const toggleRadio=()=>{closeLandmark();setRadioPanel(false);setRadio(v=>!v)}
 const inspectLandmark=()=>{if(nearbyLandmark){priorPark.current=paused;setRadio(false);setRadioPanel(false);setPaused(true);setLandmark(nearbyLandmark)}}
 const getDistance=useCallback(()=>state.current.distance,[])
 useEffect(()=>{if(!route)return;const update=()=>{const p=route.sample(state.current.distance);const nearest=landmarkRegistry.landmarks.reduce((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)<Math.hypot(b.position.x-p.x,b.position.z-p.z)?a:b);setNearbyLandmark(Math.hypot(nearest.position.x-p.x,nearest.position.z-p.z)<180?nearest:null)};update();const timer=setInterval(update,200);return()=>clearInterval(timer)},[route])
 const onReady=useCallback(()=>setReady(true),[])
 useEffect(()=>{if(!baseline||new URLSearchParams(location.search).get('diagnostics')!=='1')return;window.__miamiInspect=meters=>{state.current.distance=meters;state.current.traffic.forEach((t,i)=>{t.distance=meters+65+i*115})};return()=>{delete window.__miamiInspect}},[baseline])
 useEffect(()=>{if(!route||!geo)return;window.__miamiGeo=()=>{const s=state.current,p=route.sample(s.distance);return{latitude:p.lat,longitude:p.lon,street:p.streetName,routeMeters:s.distance%route.length,routeLength:route.length,worldExtentMeters:geo.extentMeters,totalChunks:Object.keys(geo.chunks).length,chunksGenerated:s.chunksGenerated,generationMs:s.generationMs,maxGenerationMs:s.maxGenerationMs,chunkState:document.documentElement.dataset.miamiChunks,elapsed:s.elapsed,nightBlend:blend.current,transitionSeconds,position:{x:p.x,z:p.z,yaw:p.yaw}}};if(new URLSearchParams(location.search).get('diagnostics')==='1'){window.__miamiInspect=meters=>{state.current.distance=meters;state.current.traffic.forEach((t,i)=>{t.distance=meters+65+i*115})}}return()=>{delete window.__miamiGeo;delete window.__miamiInspect}},[route,geo,transitionSeconds])
 useEffect(()=>{if(!director)return;window.__director=()=>director.snapshot();if(new URLSearchParams(location.search).get('diagnostics')==='1')window.__directorForce=shot=>director.force(shot);const timer=setInterval(()=>setShot(director.snapshot().shot as DirectorShotId|null),250);return()=>{clearInterval(timer);delete window.__director;delete window.__directorForce}},[director])
 // VESPER whispers: the radio ducks under the line, then returns to the listener's own level.
 const duck=useRef<{to:number;from:number}|null>(null)
 useEffect(()=>{
  if(host.phase!=='speak'){window.speechSynthesis?.cancel();return}
  const restore=()=>{const d=duck.current;duck.current=null;if(d&&Math.abs(audio.volume-d.to)<.02)audio.setVolume(d.from)}
  if(audio.playing&&!audio.muted&&!duck.current){duck.current={from:audio.volume,to:audio.volume*.3};audio.setVolume(duck.current.to)}
  const synth=window.speechSynthesis
  if(!synth||audio.muted){const t=setTimeout(restore,4200);return()=>{clearTimeout(t);restore()}}
  const say=new SpeechSynthesisUtterance(host.line.text),voices=synth.getVoices().filter(v=>/^en/i.test(v.lang))
  say.voice=voices.find(v=>/aria|jenny|zira|samantha|female|libby|sonia/i.test(v.name))||voices[0]||null;say.rate=.84;say.pitch=1.12;say.volume=.95
  say.onend=say.onerror=()=>setTimeout(restore,500)
  synth.cancel();synth.speak(say)
  return()=>{synth.cancel();restore()}
 },[host]) // eslint-disable-line react-hooks/exhaustive-deps -- one whisper per appearance; audio identity changes every render
 useEffect(()=>{const id=shared.current?.station;if(experienceFirst){const playable=RADIO_PRESETS.map(s=>s.id);let remembered:string|null=null;try{remembered=readRememberedStation(localStorage,playable)}catch{}audio.selectStation(chooseInitialStation(id,remembered,playable));return}audio.selectStation(id&&RADIO_PRESETS.some(s=>s.id===id)?id:neon?RADIO_PRESETS[0].id:'jolt-radio')},[])
 useEffect(()=>{if(shared.current?.time)setNight(shared.current.time==='night')},[]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>{state.current.reduced=media.matches};changed();media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed)},[])
 useEffect(()=>{const q=new URLSearchParams(location.search),pace=q.get('pace');if(pace==='cruise'||pace==='night-drive'||pace==='midnight-run')setTone(pace);if(q.get('speedfx')==='on')speedFx.current=true},[])
 useEffect(()=>{state.current.mood=tone},[tone])
 useEffect(()=>{const changed=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed)},[])
 useEffect(()=>{state.current.paused=!started||paused||!visible||(experienceFirst&&(!ready||!route))||(humanRadio&&listeningOnly)},[started,paused,visible,humanRadio,listeningOnly,experienceFirst,ready,route])
 useEffect(()=>{const timer=setInterval(()=>{if(experienceFirst)setOpeningElapsed(Math.max(0,state.current.elapsed-openingStart.current));setSpeed(Math.round(state.current.speed*3.6));setDuskNight(blend.current>=.5);setDistrict(route?route.sample(state.current.distance).streetName:neon?NEON_WORLD.district:(state.current.district==='coast'?'Coastal boulevard':'Neon quarter'))},200);window.__jeepNight=()=>{const s=state.current,c=current.current;return{speed:s.speed*3.6,rpm:s.paused?0:800+s.speed*75,distance:s.odometer,paused:s.paused,camera:c.view,radioFocused:c.radio,district:s.district,fps:report.current.fps,station:c.audio.stationId,playing:c.audio.playing,muted:c.audio.muted,volume:c.audio.volume,analysis:music.status,spectrum:Array.from(pulse.spectrum).reduce((a,b)=>a+b,0),drawCalls:report.current.drawCalls,ready:c.ready,vehicle:c.vehicle,garage:!c.started,timeMode:blend.current>=.5?'night':'sunset'}};return()=>{clearInterval(timer);delete window.__jeepNight}},[music,route])
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){closeLandmark();setRadio(false);return}if(!started)return;if((e.target as HTMLElement).matches('input,select,button')||(humanRadio&&(e.target as HTMLElement).closest('.hr-radio')))return;if(e.key.toLowerCase()==='v'){manualCamera.current=true;closeLandmark();setView(v=>v==='driver'?'chase':'driver')}if(e.key.toLowerCase()==='d'){manualCamera.current=true;closeLandmark();setRadio(false);setView(v=>v==='director'?'driver':'director')}if(e.key.toLowerCase()==='r'){closeLandmark();setRadioPanel(false);setRadio(v=>!v)}if(e.key==='Escape'){closeLandmark();setRadio(false)}if(e.key===' '){e.preventDefault();if(landmarkRef.current){closeLandmark();setPaused(false)}else setPaused(v=>!v)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[closeLandmark,started])
 const selectVehicle=(next:RideVehicleId)=>{if(next===vehicle)return;closeLandmark();setRadio(false);setRadioPanel(false);setReady(false);setVehicle(next)}
 const returnToGarage=()=>{closeLandmark();setRadio(false);setRadioPanel(false);setStarted(false);setPaused(true);state.current.paused=true}
 const start=()=>{openingStart.current=state.current.elapsed;audio.start();setPaused(false);state.current.paused=false;cycleStart.current=state.current.elapsed;setStarted(true);if(shared.current?.cam){manualCamera.current=true;setView(shared.current.cam);shared.current.cam=undefined}}
 const [shareNote,setShareNote]=useState('')
 const share=async()=>{const url=shareUrl(location.origin,{station:audio.stationId,at:nearbyLandmark?.kind||String(Math.round(state.current.distance%(route?.length||1))),time:night?'night':'sunset',cam:view}).replace('/cruise?',experienceFirst?'/cruise/experience?':humanRadio?'/cruise/human-radio?':'/cruise?');const title='Buena Onda Cruise',text=`Cruising Ocean Drive${nearbyLandmark?` past ${nearbyLandmark.name}`:''} with ${audio.station.name} on.`;try{if(navigator.share){await navigator.share({title,text,url});return}await navigator.clipboard.writeText(url);setShareNote('Link copied')}catch(e){if((e as Error)?.name!=='AbortError')setShareNote(url)}setTimeout(()=>setShareNote(''),2600)}
 useEffect(()=>{if(experienceFirst&&started&&openingElapsed>=12&&openingElapsed<13&&!manualCamera.current&&!state.current.reduced)setView('driver')},[experienceFirst,started,openingElapsed])
 const chooseCamera=(next:View)=>{manualCamera.current=true;closeLandmark();setRadio(false);setView(next)}
 const seek=(direction:number)=>{const i=RADIO_PRESETS.findIndex(s=>s.id===audio.stationId);audio.selectStation(RADIO_PRESETS[(i+direction+RADIO_PRESETS.length)%RADIO_PRESETS.length].id)}
 return <main className={`jn ${humanRadio?`human-radio ${listeningOnly?'hr-listening':''}`:''} ${experienceFirst?'experience-first':''} ${!started?'jn-garage':''} ${started&&view==='director'&&!radio&&!landmark?'jn-directing':''}`} data-ready={ready} data-started={started} data-view={view} data-vehicle={vehicle}>
  <Guard><CockpitProvider audio={radioAudio} stations={STATIONS} nowPlaying={activeNowPlaying} vehicleId="island-trail" autoLights={night||duskNight} instant radioFocused={radio} focusRadio={openRadio}>
   {!listeningOnly&&<Canvas className="jn-world" dpr={quality.dpr} frameloop={visible?'always':'never'} camera={{position:[-.43,1.64,.43],fov:60,near:.04,far:500}} gl={{antialias:true,powerPreference:'high-performance',toneMapping:T.ACESFilmicToneMapping}}>
    <Suspense fallback={null}>
     {(started||experienceFirst)?neon?<><NeonSky/><NeonWorld state={state} tier={quality.tier}/><Suspense fallback={null}><HoloHost state={state} enabled={!radio&&!landmark&&!hostOff} onEvent={setHost}/></Suspense></>:<><StreetSky time={night?'night':'sunset'} high={false} blend={baseline?undefined:blend}/>{route&&geo?<MiamiWorld state={state} night={night} data={geo} route={route} blend={blend} enhanced={enhanced}/>:baseline?<NightWorld state={state} night={night}/>:null}</>:<GarageEnvironment/>}
     {started&&route&&geo&&crowd&&<Suspense fallback={null}><MiamiCrowd state={state} route={route} blend={blend} density={quality.crowdDensity}/></Suspense>}
     {started&&(!experienceFirst||openingElapsed>=60)&&route&&geo&&<MiamiAds night={blend} video={quality.tier!=='low'} vehicleId={vehicle} vehicleReady={ready} state={state} data={geo} route={route} campaign={campaign} measurementsEnabled={!radio&&!landmark&&visible&&view!=='director'} onSamples={advertising?.reportSamples||(()=>{})} onActivate={placement=>advertising?.activate(placement)}/>}
     <group ref={car}><Suspense fallback={null}>{vehicle==='countach'?<Countach state={state} cockpit={(started||experienceFirst)&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>:vehicle==='delorean'?<Delorean state={state} cockpit={(started||experienceFirst)&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>:vehicle==='cadillac'?<ClassicConvertible state={state} cockpit={(started||experienceFirst)&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>:vehicle==='eighties'?<EightiesCar state={state} cockpit={(started||experienceFirst)&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>:<Wrangler state={state} cockpit={(started||experienceFirst)&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>}</Suspense></group>
     <Ride transitionSeconds={transitionSeconds} state={state} car={car} view={view} radioFocused={radio} landmark={landmark} music={music} playing={audio.playing} report={report} route={route} blend={blend} cycleStart={cycleStart} night={night} profile={profile} garage={!started&&!experienceFirst} vehicle={vehicle} director={director} neonDirector={neonDirector} fast={neon} motion={motion} speedFx={speedFx}/><CruiseGlow neon={neon} enabled={(started||experienceFirst)&&enhanced} blend={blend} radioFocused={radio} director={started&&view==='director'&&!radio&&!landmark} filmic={quality.filmic} motion={quality.filmic&&view!=='driver'?motion:undefined}/>
     {experienceFirst&&<PostcardCapture requestRef={captureRequest}/>}
    </Suspense>
   </Canvas>}
  </CockpitProvider></Guard>
  {started&&view==='director'&&!radio&&!landmark&&<DirectorOverlay station={audio.station.name} letterbox={letterbox} onLetterbox={setLetterbox}/>}
  {started&&<header className="jn-brand"><a href="/" aria-label="Buena Onda">BUENA ONDA<span>{humanRadio?'NO ALGORITHMS. JUST FREQUENCIES.':neon?`${NEON_WORLD.label} / ${NEON_WORLD.subtitle}`:'MIAMI / GEOGRAPHIC EXPERIMENT'}</span></a><p>{district}<span className="jn-dot"/> {profile.label.toUpperCase()}</p><LiveCruisers enabled={!experienceFirst&&started&&visible&&(!humanRadio||presence)&&!listeningOnly} className="jn-live"/></header>}
  {!started&&!experienceFirst&&<><RidePicker humanRadio={humanRadio} driveLabel={neon?'Neon Run / Rain-soaked avenue':undefined} only={neon?['delorean']:undefined} vehicle={vehicle} onSelect={selectVehicle} night={night} onNightChange={setNight} onStart={start} ready={ready} routeReady={!!route||baseline} castControl={<CastControl/>}/>{geoError&&<p className="rp-error" role="alert">{geoError}</p>}</>}
  {started&&<>
   {!radio&&!landmark&&view!=='director'&&!neon&&(!experienceFirst||openingElapsed>=60)&&<MiamiAdCue/>}
   {neon&&host.phase==='speak'&&<HostCaption line={host.line} onOpen={()=>window.open(host.line.destination,'_blank','noopener,noreferrer')}/>}
   {nearbyLandmark&&!landmark&&!radio&&<button className="jn-landmark-peek" onClick={inspectLandmark} aria-label={`View landmark: ${nearbyLandmark.name}`}>View {nearbyLandmark.name}</button>}
   {landmark&&<div className="jn-radio-focus"><span>{landmark.name} / PARKED</span><button onClick={closeLandmark} aria-label="Back from landmark">Back to drive</button></div>}
   {geo&&route&&!radio&&view!=='director'&&(!experienceFirst||mapOpen)&&<MiamiMap data={geo} route={route} getDistance={getDistance}/>}
   {radio&&<div className="jn-radio-focus"><span>IN THE DASH / LIVE RADIO</span><button onClick={()=>setRadioPanel(v=>!v)} aria-expanded={radioPanel}>Station controls</button><button onClick={()=>setRadio(false)} aria-label="Back to drive">Back to drive</button></div>}
   <div className="jn-top"><button onClick={()=>setEnhanced(v=>!v)} aria-label="Toggle cinematic glow" aria-pressed={enhanced}>{enhanced?'Glow on':'Glow off'}</button><button onClick={()=>{cycleStart.current=state.current.elapsed;setNight(v=>!v)}} aria-label="Toggle night and sunset"><span>{night?'☾':'☀'}</span><span className="jn-time-label"> {night?'Night':'Sunset'}</span></button><button onClick={()=>void share()} aria-label="Share this drive">Share</button><CastControl/><button onClick={()=>{void document.documentElement.requestFullscreen?.().catch(()=>{})}} aria-label="Fullscreen">⛶</button></div>
   {shareNote&&<p className="jn-share-note" role="status">{shareNote}</p>}
   <aside className="jn-readout"><span>{landmark?'03 / LANDMARK VIEW':view==='driver'?'01 / IN THE CABIN':view==='director'?`04 / DIRECTOR${neon?(neonShot?' · '+neonShot.replace(/([A-Z])/g,' $1').toUpperCase():''):shot?' · '+SHOT_LABEL[shot].toUpperCase():''}`:'02 / ON THE ROAD'}</span><b>{landmark?0:speed}<small>KM/H</small></b><p>{paused?'Parked for a moment':'AUTOMATIC CRUISE'}<span> {night?'23:48':'19:42'}</span></p></aside>
   <div className="jn-dock" role="toolbar" aria-label="Drive and radio controls">
    <button className="jn-power" aria-label={audio.requested?'Pause radio':'Play radio'} aria-pressed={audio.requested} onClick={audio.toggle}>{audio.requested?'Ⅱ':'▶'}</button>
    <button className="jn-now" onClick={toggleRadio} aria-label="Open radio controls" aria-expanded={radio}><span>{audio.error?'SIGNAL UNAVAILABLE':audio.tuning||audio.loading?'TUNING IN':audio.playing?'ON AIR':'RADIO OFF'} / {audio.station.name}</span><b>{library.displayTitle||audio.station.name}</b></button>
    <div className="jn-mini-eq"><Equalizer music={music} active={audio.playing&&!audio.muted}/></div>
    <button onClick={toggleRadio} aria-pressed={radio}>Radio</button>
    <button onClick={()=>{closeLandmark();setRadio(false);setView(v=>v==='driver'?'chase':'driver')}} aria-label="Switch cockpit and chase camera">{view==='driver'?'Chase view':'Cockpit'}</button>
    <button className="jn-director-toggle" onClick={()=>{closeLandmark();setRadio(false);setView(v=>v==='director'?'driver':'director')}} aria-label="Director camera" aria-pressed={view==='director'}>Director</button>
    <button onClick={()=>{if(landmark){closeLandmark();setPaused(false)}else setPaused(v=>!v)}} aria-label={paused?'Resume drive':'Pause drive'}>{paused?'Resume':'Park'}</button>
   </div>
   {radio&&radioPanel&&<section className="jn-radio" aria-label="Radio controls"><header><span>BUENA ONDA <small>HIGH FIDELITY / STEREO</small></span><button aria-label="Close radio controls" onClick={()=>setRadioPanel(false)}>×</button></header>
    <div className="jn-headunit"><button className={`jn-knob ${audio.requested?'on':''}`} aria-label="Radio power" aria-pressed={audio.requested} onClick={audio.toggle}><i/><small>POWER</small></button><div className="jn-lcd" role="status"><span>{audio.error?'CHECK SIGNAL':audio.tuning||audio.loading?'TUNING':audio.playing?(library.nowPlaying.kind==='show'?'ON AIR / LIVE SHOW':'STEREO / LIVE'):'STANDBY'}</span><strong>{audio.station.name}</strong><p>{audio.error||library.displayTitle||(audio.playing?'Track information unavailable':'Independent radio. Endless road.')}</p></div><label className="jn-volume">VOLUME<b>{Math.round(audio.volume*100)}</b><input aria-label="Radio volume" type="range" min={0} max={1} step={.01} value={audio.volume} onChange={e=>audio.setVolume(Number(e.target.value))}/></label></div>
    <Equalizer music={music} active={audio.playing&&!audio.muted}/><div className="jn-band-labels"><span>60</span><span>250</span><span>1K</span><span>4K</span><span>16K Hz</span></div>
    <div className="jn-presets">{RADIO_PRESETS.map((s,i)=><button key={s.id} aria-label={`Preset ${i+1}: ${s.name}`} aria-pressed={audio.stationId===s.id} onClick={()=>audio.selectStation(s.id)}><span>0{i+1}</span>{s.id==='buena-onda-radio'?'ONDA':s.name}</button>)}</div>
    <footer><button aria-label="Previous station" onClick={()=>seek(-1)}>← SEEK</button><button aria-label={audio.muted?'Unmute radio':'Mute radio'} aria-pressed={audio.muted} onClick={()=>audio.setMuted(!audio.muted)}>{audio.muted?'UNMUTE':'MUTE'}</button><button aria-label="Next station" onClick={()=>seek(1)}>SEEK →</button></footer>
    <p className="jn-signal">{audio.playing?(audio.muted?'Muted':music.analysisActive?'Live spectrum':'Listening • spectrum available when the stream allows it'):'Turn the power on to listen.'}</p>
    <RadioSongPanel library={library} tune={audio.selectStation}/>
   </section>}
   <div className="jn-mood"><button className="jn-choose-ride" type="button" aria-label="Return to garage" onClick={returnToGarage}>Choose ride</button><label>CAR<select aria-label="Cruise vehicle" value={vehicle} onChange={e=>selectVehicle(e.target.value as RideVehicleId)}>{neon?<option value="delorean">DeLorean DMC-12</option>:<><option value="countach">Countach 5000QV</option><option value="eighties">Fiero GT 1987</option><option value="cadillac">Cadillac 1959</option><option value="delorean">DeLorean DMC-12</option>{humanRadio&&<option value="wrangler">Wrangler 2012</option>}</>}</select></label><label>PACE<select aria-label="Driving pace" value={tone} onChange={e=>setTone(e.target.value as typeof tone)}><option value="cruise">Easy</option><option value="night-drive">Cruise</option><option value="midnight-run">Midnight</option></select></label><label>QUALITY<select aria-label="Render quality" value={qualityChoice} onChange={e=>{const v=e.target.value as QualityChoice;saveChoice(v);setQualityChoice(v)}}><option value="auto">Auto ({resolve('auto').tier})</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>{!ready&&<span role="status">Preparing {profile.label}...</span>}</div>
  </>}
  {experienceFirst&&started&&nearbyLandmark&&!landmark&&!radio&&!listeningOnly&&<button className="ex-landmark" onClick={inspectLandmark} aria-label={`View landmark: ${nearbyLandmark.name}`}><small>OCEAN DRIVE</small>{nearbyLandmark.name}<span>Take a closer look</span></button>}
  {experienceFirst&&started&&ready&&!listeningOnly&&openingElapsed>=65&&<CruisePostcard capture={capturePostcard} carLabel={profile.label} location={nearbyLandmark?.name||district} station={audio.station.name} verifiedTrack={isFreshHumanRadioTrack(humanMetadata)?`${humanMetadata.artist} - ${humanMetadata.title}`:null} url={shareUrl(location.origin,{station:audio.stationId,at:String(Math.round(state.current.distance%(route?.length||1))),time:night?'night':'sunset',cam:view}).replace('/cruise?','/cruise/experience?')+`&car=${vehicle}&sunsetMinutes=${transitionSeconds/60}`} onShared={()=>metrics.record('postcard_share')}/>}
  {experienceFirst&&presence&&<div className="ex-presence"><LiveCruisers enabled={started&&visible&&!listeningOnly} leased/></div>}
  {experienceFirst&&geoError&&<p role="alert" className="ex-load-error">Miami could not load. The radio is still here. <button onClick={()=>setListeningOnly(true)}>Listen without 3D</button></p>}
  {experienceFirst&&!listeningOnly&&<OpeningMinute extraControls={<><CastControl/><ExperienceMetricsControls metrics={metrics}/></>} paused={paused} onPark={()=>setPaused(v=>!v)} showMap={mapOpen} onMap={()=>setMapOpen(v=>!v)} ready={ready&&!!route} started={started} elapsed={openingElapsed} onStart={start} vehicle={vehicle} onVehicle={selectVehicle} view={view} onView={chooseCamera} night={night} onNight={()=>{cycleStart.current=state.current.elapsed;setNight(v=>!v)}} onListen={()=>setListeningOnly(true)} quality={qualityChoice} onQuality={choice=>{saveChoice(choice);setQualityChoice(choice)}}/>}
  {humanRadio&&<>
   {listeningOnly&&<div className="hr-listening-scene"><span className="hr-eyebrow">BUENA ONDA CRUISE / HUMAN RADIO</span><h1>Take the long way<br/>to good music.</h1><p>Real stations. Human selectors. Your own discoveries.<br/>The scenery is resting. The radio stays with you.</p><button onClick={()=>setListeningOnly(false)}>Return to scenery</button></div>}
   {!listeningOnly&&<div className="hr-scene-actions"><button onClick={()=>setListeningOnly(true)}>Listen without 3D</button>{started&&<><button onClick={()=>setView(v=>v==='driver'?'chase':'driver')}> {view==='driver'?'Chase view':'Cockpit'}</button><button onClick={()=>setView(v=>v==='director'?'driver':'director')}>Director</button><button onClick={()=>setPaused(v=>!v)}>{paused?'Resume drive':'Park'}</button></>}</div>}
   <DiscoveryConsole onAction={experienceFirst?metrics.record:undefined} experienceMode={experienceFirst} sharePath={experienceFirst?'/cruise/experience':undefined} audio={audio} metadata={humanMetadata} credits={<><p>Wrangler Jeep 2012 by <a href="https://sketchfab.com/3d-models/wrangler-jeep-2012-fd41538dbb6744b38d7037c4cc8b058f" target="_blank" rel="noreferrer">funassets</a>, CC BY 4.0. Repaired windows, scaled exterior, custom cabin.</p>{[COUNTACH_ATTRIBUTION,EIGHTIES_ATTRIBUTION,CLASSIC_ATTRIBUTION,DELOREAN_ATTRIBUTION].map(item=><p key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.name}</a> by {item.creator}, <a href={item.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Adapted materials, fitted cabin and interactive radio.</p>)}</>} listeningOnly={listeningOnly} onListeningOnly={()=>setListeningOnly(v=>!v)} presence={presence} onPresence={()=>setPresence(v=>!v)} onFocusRadio={()=>{setListeningOnly(false);openRadio()}}/>
  </>}
  <a className="jn-map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap contributors &middot; ODbL</a><details className="jn-credits"><summary>Credits & controls</summary><p>V: camera · R: radio · Space: park. The drive follows the road automatically.</p><p>Wrangler Jeep 2012 by <a href="https://sketchfab.com/3d-models/wrangler-jeep-2012-fd41538dbb6744b38d7037c4cc8b058f" target="_blank" rel="noreferrer">funassets</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Repaired windows, scaled exterior, custom interactive cabin.</p><p>Asphalt: Dimitrios Savva / Poly Haven, CC0. Plaster and paving: <a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">Poly Haven, CC0</a>. Radio plays directly from its stations.</p></details>
  <div className="jn-extra-credit"><details><summary>Car credits</summary><p><a href={DELOREAN_ATTRIBUTION.url} target="_blank" rel="noreferrer">{DELOREAN_ATTRIBUTION.name}</a> by {DELOREAN_ATTRIBUTION.creator}, <a href={DELOREAN_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Retuned materials, fitted cabin and interactive radio.</p><p><a href={COUNTACH_ATTRIBUTION.url} target="_blank" rel="noreferrer">{COUNTACH_ATTRIBUTION.name}</a> by {COUNTACH_ATTRIBUTION.creator}, <a href={COUNTACH_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Original cabin, compatible materials, fitted interactive radio.</p><p><a href={EIGHTIES_ATTRIBUTION.url} target="_blank" rel="noreferrer">{EIGHTIES_ATTRIBUTION.name}</a> by {EIGHTIES_ATTRIBUTION.creator}, <a href={EIGHTIES_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Original cabin, fitted interactive radio.</p><p><a href={CLASSIC_ATTRIBUTION.url} target="_blank" rel="noreferrer">{CLASSIC_ATTRIBUTION.name}</a> by {CLASSIC_ATTRIBUTION.creator}, <a href={CLASSIC_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Original convertible cabin, fitted interactive radio.</p></details></div>
 </main>
}
