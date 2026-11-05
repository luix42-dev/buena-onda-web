'use client'
import {createVehicleFeel,stepVehicleFeel} from '@/lib/cruise-os/vehicle-feel'
import {Component,Suspense,useCallback,useEffect,useMemo,useRef,useState,type ReactNode,type MutableRefObject} from 'react'
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber'
import * as T from 'three'
import StreetSky from '../master/StreetSky'
import {pulse,updatePulse} from '../master/pulse'
import NightWorld from '../nightdrive/NightWorld'
import NeonWorld from '../neon/NeonWorld'
import NeonSky from '../neon/NeonSky'
import HoloHost,{type HostEvent} from '../neon/HoloHost'
import GiantNova from '../neon/GiantNova'
import BridgeNova from '../neon/BridgeNova'
import RetroLampFeeder from '../neon/RetroLampFeeder'
import {NeonDirector,type NeonShot} from '../neon/neonDirector'
import {NEON_STATIONS,NEON_WORLD,HOST_NAME,RETRO_LINE_ORDER} from '@/lib/real-miami/neon'
import MiamiWorld from '../miami/MiamiWorld'
import OceanDriveGame,{type OceanDriveState} from '../miami/OceanDriveGame'
import SourceRadioEnvironment from '../miami/SourceRadioEnvironment'
import OceanDrivePlaces from '../miami/OceanDrivePlaces'
import MiamiAds from '../miami/MiamiAds'
import {MiamiAdCue,useRealMiamiAds,useRealMiamiCampaign} from '../CampaignBridge'
import {CRUISE_CAMPAIGNS,DEFAULT_CRUISE_CAMPAIGN} from '@/lib/cruise/campaigns'
import MiamiMap from '../miami/MiamiMap'
import CruiseGlow from '../miami/CruiseGlow'
import {createMiamiRoute,type MiamiGeoData} from '@/lib/real-miami/miami-geo'
import landmarkRegistry from '../../../public/real-miami/miami/landmarks.json'
import {createNightState,type NightState} from '../nightdrive/state'
import {stepNight} from '../nightdrive/dynamics'
import {roadSample,retrowaveRoadSample} from '../nightdrive/road'
import {CockpitProvider} from '../vehicle/CockpitContext'
import {useCruiseAudio} from '../audio/useCruiseAudio'
import {useRadioLibrary} from '../audio/useRadioLibrary'
import RadioSongPanel from '../audio/RadioSongPanel'
import DiscoveryConsole from '@/components/human-radio/DiscoveryConsole'
import {useDiscoveries} from '@/components/human-radio/useDiscoveries'
import {useRadioMemories} from '@/components/human-radio/useRadioMemories'
import {randomStation} from '@/lib/human-radio/explore'
import OpeningMinute from '@/components/experience/OpeningMinute'
import CruiseOS from '@/components/cruise-os/CruiseOS'
import {useFrequencyGuide} from '@/components/cruise-os/useFrequencyGuide'
import AdaptiveScenery from '@/components/experience/AdaptiveScenery'
import FrameProfiler from '../diagnostics/FrameProfiler'
import SceneWarmUp,{WorldMounted} from './SceneWarmUp'
import {renderHold} from '@/lib/cruise/render-hold'
import DriveLoading from '@/components/cruise-os/DriveLoading'
import PostcardCapture,{type PostcardCaptureRequest} from '@/components/experience/PostcardCapture'
import CruisePostcard from '@/components/experience/CruisePostcard'
import ExperienceMetricsControls from '@/components/experience/ExperienceMetricsControls'
import {useExperienceMetrics} from '@/components/experience/useExperienceMetrics'
import {isFreshHumanRadioTrack} from '@/lib/human-radio/metadata'
import {cruiseCockpitProfile} from '@/lib/cruise-os/cockpit'
import {experienceCameraProfile,nightBlend,sunsetDurationSeconds} from '@/lib/experience/atmosphere'
import {useHumanMetadata} from '@/components/human-radio/useHumanMetadata'
import {chooseInitialStation,readRememberedStation} from '@/lib/human-radio/station-memory'
import {HUMAN_RADIO_STATIONS} from '@/lib/human-radio/stations'
import {MIAMI_CRUISE_STATIONS,canPlayCruiseStation} from '@/lib/real-miami/stations'
import {WRANGLER_CAMERA_PROFILE,type RideCameraProfile,type RideVehicleId} from '@/lib/real-miami/ride-vehicles'
import {MusicAudio} from '@/lib/real-miami/music-audio'
import Wrangler from './Wrangler'
import LaunchCar,{launchCameraProfile} from './LaunchCar'
import VehicleChassis from '../vehicle/VehicleChassis'
import VehicleFinish from '../vehicle/VehicleFinish'
import Countach,{COUNTACH_CAMERA_PROFILE,COUNTACH_ATTRIBUTION} from './Countach'
import EightiesCar,{EIGHTIES_CAMERA_PROFILE,EIGHTIES_ATTRIBUTION} from './EightiesCar'
import CastControl from './CastControl'
import {isTvSession,serveTvRemote} from '@/lib/cruise/tv-cast'
import {useEngineSound} from '../audio/useEngineSound'
import RidePicker from './RidePicker'
import GarageEnvironment from './GarageEnvironment'
import Delorean,{DELOREAN_CAMERA_PROFILE,DELOREAN_ATTRIBUTION} from './Delorean'
import ClassicConvertible,{CLASSIC_CAMERA_PROFILE,CLASSIC_ATTRIBUTION} from './ClassicConvertible'
import {CruiseDirector,SHOT_LABEL,type DirectorShotId} from '../director/director'
import DirectorOverlay from '../director/DirectorOverlay'
import MiamiCrowd from '../people/MiamiCrowd'
import LiveCruisers from '../presence/LiveCruisers'
import {readShared,shareUrl,type SharedDrive} from '@/lib/real-miami/share'
import {readChoice,resolve,saveChoice,stepDown,type QualityChoice} from '@/lib/real-miami/quality'
import {createMiamiAdPlacements} from '@/lib/real-miami/advertising'
import {cruiseLookEnabled,LOW_CHASE,lowChaseSway,LOOK,cinemaRig,wheelShake,type CinemaShot} from '@/lib/cruise-os/look'
import {cruiseCityVariant} from '@/lib/cruise-os/city-variant'
import type {CameraView} from '@/components/experience/OpeningMinute'
import {createWetStreaks} from '../miami/wetStreaks'
import PaintLampFeeder from '../vehicle/PaintLampFeeder'
import HoodReflection from '../vehicle/HoodReflection'
import HighwayWorld from '../highway/HighwayWorld'
import CausewayWorld from '../highway/CausewayWorld'
import {useNovaCompanion} from '@/components/cruise-os/useNovaCompanion'
import {useGiantAds} from '@/components/cruise-os/useGiantAds'
import {createHighwayRoute,HIGHWAY} from '@/lib/real-miami/highway'
import {createConnectedHighwayRoute,createCausewayRoute,CAUSEWAY,type CausewayDirection} from '@/lib/real-miami/connected-drive'
import {createHighwayAdPlacements} from '@/lib/real-miami/advertising'
import {GTA_VI_CAMPAIGN} from '@/lib/cruise/gta-vi-campaign'
import {createRadioStationCampaigns} from '@/lib/cruise/radio-station-ads'
import {cityInterchangeMeters,HIGHWAY_CITY_EXIT_METERS} from '@/lib/cruise-os/interchange'
import DriveInterchange from './DriveInterchange'
import './jeep.css'
import '@/components/cruise-os/radio-first.css'

type View=CameraView
type Snapshot={speed:number;rpm:number;distance:number;paused:boolean;camera:View;radioFocused:boolean;district:string;fps:number;station:string;playing:boolean;muted:boolean;volume:number;analysis:string;spectrum:number;drawCalls:number;renderDpr:number;ready:boolean;vehicle:RideVehicleId;garage:boolean;timeMode:'night'|'sunset'}
declare global{interface Window{__director?:()=>ReturnType<CruiseDirector['snapshot']>;__directorForce?:(shot:DirectorShotId|null)=>void;__jeepNight?:()=>Snapshot;__miamiGeo?:()=>Record<string,unknown>;__miamiInspect?:(meters:number)=>void;__retroInspect?:(meters:number)=>void}}
class Guard extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}render(){return this.state.failed?<div className="jn-failure"><h1>The road could not load.</h1><p>Please reload to try again.</p><button onClick={()=>location.reload()}>Reload</button></div>:this.props.children}}

type GeoRoute=ReturnType<typeof createMiamiRoute>
type Landmark=typeof landmarkRegistry.landmarks[number]
function Ride({sourceDriven=false,highway=false,cinematicRoute=false,feel=false,state,car,view,radioFocused,landmark,music,playing,report,route,blend,cycleStart,night,garage,vehicle,profile=WRANGLER_CAMERA_PROFILE,director=null,neonDirector=null,fast=false,retro=false,motion,speedFx,transitionSeconds=2400}:{sourceDriven?:boolean;highway?:boolean;cinematicRoute?:boolean;feel?:boolean;transitionSeconds?:number;fast?:boolean;retro?:boolean;neonDirector?:NeonDirector|null;speedFx?:MutableRefObject<boolean>;motion?:MutableRefObject<number>;director?:CruiseDirector|null;state:MutableRefObject<NightState>;car:MutableRefObject<T.Group|null>;view:View;radioFocused:boolean;landmark:Landmark|null;music:MusicAudio;playing:boolean;report:MutableRefObject<{fps:number;drawCalls:number;dpr:number}>;route:GeoRoute|null;blend:MutableRefObject<number>;cycleStart:MutableRefObject<number>;night:boolean;garage:boolean;vehicle:RideVehicleId;profile?:RideCameraProfile}){
 const {camera,gl}=useThree(),p=useMemo(()=>new T.Vector3(),[]),target=useMemo(()=>new T.Vector3(),[]),frames=useRef(0),duration=useRef(0)
 const focusMix=useRef(0),radioPosition=useMemo(()=>new T.Vector3(),[]),radioTarget=useMemo(()=>new T.Vector3(),[])
 const response=useMemo(()=>createVehicleFeel(),[]),chassisRotation=useMemo(()=>new T.Euler(),[])
 const carBounds=useMemo(()=>({box:new T.Box3(),age:0,vehicle:''}),[]),directing=useRef(false),wheelInsert=useRef<{shot:CinemaShot|null;until:number;next:number;index:number}>({shot:null,until:0,next:14,index:0})
 // Car-space bounds (nose -Z), refreshed every 120 frames; the director and the cinema rigs frame from them.
 const refreshBounds=(group:T.Group)=>{if(carBounds.vehicle===vehicle&&--carBounds.age>0)return;const r=group.rotation.clone(),q=group.position.clone();group.rotation.set(0,0,0);group.position.set(0,0,0);group.updateMatrixWorld(true);carBounds.box.setFromObject(group);group.rotation.copy(r);group.position.copy(q);group.updateMatrixWorld(true);if(carBounds.box.isEmpty())carBounds.box.set(new T.Vector3(-1,0,-2.1),new T.Vector3(1,1.1,2.1));carBounds.vehicle=vehicle;carBounds.age=120}
 const chaseYaw=useRef<number|null>(null),chaseEuler=useMemo(()=>new T.Euler(),[]),pathEuler=useMemo(()=>new T.Euler(),[]),roll=useRef(0)
 useEffect(()=>{
  if(!feel||!new URLSearchParams(location.search).has('diagnostics'))return
  const w=window as Window&{__vehicleFeel?:()=>unknown;__cinematicInsert?:()=>unknown}
  w.__cinematicInsert=()=>({...wheelInsert.current})
  w.__vehicleFeel=()=>{const body=car.current?.getObjectByName('VehicleSuspensionBody'),wheels:T.Object3D[]=[];car.current?.traverse(node=>{if(/^(RollingWheel|[FR][LR]_WHEEL)$/.test(node.name))wheels.push(node)});return {vehicle,response:{...state.current.vehicleFeel},body:body?{pitch:body.rotation.x,roll:body.rotation.z,heave:body.position.y-.55}:null,wheels:wheels.length}}
  return()=>{delete w.__vehicleFeel;delete w.__cinematicInsert}
 },[feel,vehicle,car,state])
 useFrame((_,delta)=>{
  const s=state.current,sample=retro?retrowaveRoadSample:roadSample;if(!garage&&!sourceDriven)stepNight(s,Math.min(delta,.1),route?{sample:route.sample,touring:true,highway}:fast?{sample:d=>sample(d,s.seed),fast:true}:retro?{sample:d=>sample(d,s.seed)}:undefined);updatePulse(music,playing&&music.analysisActive,Math.min(delta,.05))
  if(garage){
    if(feel){stepVehicleFeel(response,{distance:s.distance,speed:0,acceleration:0,curvature:0,wheel:0,paused:true,reduced:s.reduced,focused:false},delta);s.vehicleFeel=response}
    const cam=camera as T.PerspectiveCamera,canvas=gl.domElement.getBoundingClientRect(),stage=document.querySelector('.rp-showcase')?.getBoundingClientRect()
    const width=canvas.width||1,height=canvas.height||1,stageWidth=Math.max(140,(stage?.width||width)*.8),stageHeight=Math.max(100,(stage?.height||height)*.95)
    const fov=40,vertical=Math.tan(fov*Math.PI/360),span=vehicle==='cadillac'?6.5:vehicle==='classic-coupe'?5.4:vehicle==='eighties'||vehicle==='countach'||vehicle==='delorean'?4.8:4.9
    const projectedHeight=vehicle==='wrangler'||vehicle==='island-trail'?2.4:vehicle==='eighties'||vehicle==='countach'||vehicle==='delorean'?1.8:2.0
    const distance=Math.max(span/(2*vertical*cam.aspect)*width/stageWidth,projectedHeight/(2*vertical)*height/stageHeight)
    cam.fov=fov;cam.setViewOffset(width,height,width/2-((stage?.left||canvas.left)-canvas.left+(stage?.width||width)/2),height/2-((stage?.top||canvas.top)-canvas.top+(stage?.height||height)/2),width,height)
    target.set(0,.85,0);p.set(-.65,.22,-.76).normalize().multiplyScalar(distance).add(target);camera.position.copy(p);camera.lookAt(target)
    if(car.current){car.current.position.set(0,0,0);car.current.rotation.set(0,0,0)}
    focusMix.current=0;blend.current=night?1:0
    frames.current++;duration.current+=delta;if(duration.current>=1){report.current={fps:frames.current/duration.current,drawCalls:gl.info.render.calls,dpr:gl.getPixelRatio()};frames.current=0;duration.current=0}
    return
  }
  const driveCamera=camera as T.PerspectiveCamera;if(driveCamera.view?.enabled)driveCamera.clearViewOffset()
  blend.current=nightBlend(s.elapsed,cycleStart.current,night,transitionSeconds)
  const road=route?route.sample(s.distance):sample(s.distance,s.seed),yaw=road.yaw,cx=s.lateral*Math.cos(yaw),cz=-s.lateral*Math.sin(yaw)
  if(feel){stepVehicleFeel(response,{distance:s.distance,speed:s.speed,acceleration:s.acceleration,curvature:road.curvature,wheel:s.wheel||0,paused:s.paused,reduced:s.reduced,focused:radioFocused||!!landmark},delta);s.vehicleFeel=response}else{s.vehicleFeel=undefined}
  // Tail-out: the whole car (wheels included) yaws about the path by the feel model's slip angle.
  if(car.current){car.current.position.set(cx,0,cz);car.current.rotation.set(route?0:Math.atan(('dy' in road?road.dy:0)/Math.sqrt(1+('dx' in road?road.dx:0)**2)),yaw+(feel?response.yaw:0),0,'YXZ')}
  const cam=camera as T.PerspectiveCamera,driver=view==='driver',low=view==='low',portrait=cam.aspect<1
  const cinema:CinemaShot|null=view==='hood'||view==='wheel'||view==='wheelClose'?view:null
  if(cinema&&car.current&&vehicle!=='countach')refreshBounds(car.current)
  // Poses are authored on the Countach; other cars scale from their bounds.
  const override=cinema?(window as Window&{__cinemaPose?:ReturnType<typeof cinemaRig>}).__cinemaPose:undefined
  const rig=cinema?override??cinemaRig(cinema,vehicle!=='countach'&&carBounds.vehicle===vehicle?carBounds.box:undefined):null
  focusMix.current=s.reduced?(radioFocused?1:0):T.MathUtils.damp(focusMix.current,radioFocused?1:0,6,Math.min(delta,.1));if(Math.abs(focusMix.current-(radioFocused?1:0))<.001)focusMix.current=radioFocused?1:0
  // Speed feel (FOV widening + edge blur) is off: Luis 2026-10-13, the real speed reads fine. ?speedfx=on for A/B only.
  const rush=s.reduced||s.paused||landmark||speedFx?.current===false?0:T.MathUtils.clamp((s.speed-9)/19,0,1)
  if(motion)motion.current=T.MathUtils.damp(motion.current,radioFocused?0:rush,3,Math.min(delta,.1))
  const kick=(motion?.current??0)*(driver?(portrait?5:8):(portrait?6:10))
  const fov=landmark&&!radioFocused?(portrait?70:58):T.MathUtils.lerp((rig?(portrait?rig.fovPortrait:rig.fov):driver?(portrait?90:(profile.driverFov||62)):low?(portrait?LOW_CHASE.fovPortrait:LOW_CHASE.fov):(portrait?64:58))+kick,portrait?(profile.radioPortraitFov||58):(profile.radioFov||43),focusMix.current);if(Math.abs(cam.fov-fov)>.001){cam.fov=fov;cam.updateProjectionMatrix()}
  // Low chase (The Look): centred behind the car, slight hand-held sway, no cuts.
  const sway=lowChaseSway(s.elapsed,s.reduced)
  if(rig){p.fromArray(rig.position);target.fromArray(rig.target);if(cinema!=='hood'){const shake=wheelShake(s.elapsed,s.speed,s.reduced);p.y+=shake;target.y+=shake*.4}}
  else if(low){p.fromArray(portrait?LOW_CHASE.positionPortrait:LOW_CHASE.position);target.fromArray(LOW_CHASE.target);p.x+=sway.x;p.y+=sway.y;target.x+=sway.x*.3}
  else if(driver){p.fromArray(portrait?(profile.driverPortrait||profile.driver):profile.driver);target.fromArray(portrait?(profile.targetPortrait||profile.target):profile.target)}else{p.fromArray(portrait?(profile.chasePortrait||profile.chase):profile.chase);target.fromArray(profile.chaseTarget||[0,1.05,0])}
  radioPosition.fromArray(profile.radioPosition);radioTarget.fromArray(profile.radioTarget);p.lerp(radioPosition,focusMix.current);target.lerp(radioTarget,focusMix.current)
  if(feel&&(driver||cinema==='hood')){chassisRotation.set(response.pitch*.35,0,response.roll*.35);for(const v of[p,target]){v.y-=.55;v.applyEuler(chassisRotation);v.y+=.55+response.heave}}
  // OSM polylines change heading at vertices; 6 m back that reads as a jolt, so the chase rig trails the car's yaw.
  // Chase rigs follow the road, not the body: the tail-out (response.yaw) must read against the camera.
  const pathYaw=car.current?car.current.rotation.y-(feel?response.yaw:0):0
  if(low&&car.current){const y=pathYaw;if(chaseYaw.current===null)chaseYaw.current=y;const d=Math.atan2(Math.sin(y-chaseYaw.current),Math.cos(y-chaseYaw.current));chaseYaw.current+=s.reduced?d:d*(1-Math.exp(-Math.min(delta,.1)*3.2));chaseEuler.set(0,chaseYaw.current,0,'YXZ')}else chaseYaw.current=null
  for(const v of[p,target]){if(low&&car.current&&focusMix.current===0)v.applyEuler(chaseEuler);else if(car.current){if(feel&&!driver&&!cinema&&!radioFocused){pathEuler.set(retro?0:car.current.rotation.x,pathYaw,0,'YXZ');v.applyEuler(pathEuler)}else v.applyEuler(car.current.rotation)}v.x+=cx;v.z+=cz}
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
   refreshBounds(car.current)
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
   const origin=sample(s.distance,s.seed)
   const frame=neonDirector.update(Math.min(delta,.1),car.current.position,yaw,s.speed,s.distance,(d,lateral,up,out)=>{const q=sample(d,s.seed);return out.set(q.x-origin.x+Math.cos(q.yaw)*lateral,q.y-origin.y+up,q.z-origin.z-Math.sin(q.yaw)*lateral)})
   p.copy(frame.position);target.copy(frame.target);if(motion)motion.current=0
   if(Math.abs(cam.fov-frame.fov)>.001){cam.fov=frame.fov;cam.updateProjectionMatrix()}
  }
  if(neonDirector&&!neonActive)neonDirector.reset()
  // Hood is temporarily hidden; Cinematic keeps the two wheel inserts.
  const highwayActive=view==='director'&&(highway||cinematicRoute)&&!landmark&&focusMix.current===0
  const directed=(directorActive||neonActive||highwayActive)&&!!car.current,insert=wheelInsert.current
  if(insert.shot==='hood')insert.shot=null
  if(!directed){insert.shot=null;insert.next=s.elapsed+14}
  else if(insert.shot&&s.elapsed>insert.until){insert.shot=null;insert.next=s.elapsed+20+Math.random()*20}
  else if(!insert.shot&&s.elapsed>insert.next){insert.shot=(['wheel','wheelClose'] as const)[insert.index++%2];insert.until=s.elapsed+5.5}
  if(directed&&insert.shot&&car.current){
   if(vehicle!=='countach')refreshBounds(car.current)
   const pose=cinemaRig(insert.shot,vehicle!=='countach'&&carBounds.vehicle===vehicle?carBounds.box:undefined),shake=wheelShake(s.elapsed,s.speed,s.reduced)
   p.fromArray(pose.position);target.fromArray(pose.target);p.y+=shake;target.y+=shake*.4
   for(const v of[p,target]){v.applyEuler(car.current.rotation);v.x+=cx;v.z+=cz}
   const insertFov=portrait?pose.fovPortrait:pose.fov;if(Math.abs(cam.fov-insertFov)>.001){cam.fov=insertFov;cam.updateProjectionMatrix()}
   if(motion)motion.current=0
  }
  directing.current=directorActive
  camera.position.copy(p);camera.lookAt(target)
  roll.current=low&&!landmark?sway.roll*(1-focusMix.current):0;if(roll.current)camera.rotateZ(roll.current)
  frames.current++;duration.current+=delta;if(duration.current>=1){report.current={fps:frames.current/duration.current,drawCalls:gl.info.render.calls,dpr:gl.getPixelRatio()};frames.current=0;duration.current=0}
 },-2)
 return null
}

/** The Look: our own taillights smear red on the wet road behind the car (no lamp geometry is added). */
function OwnTaillights(){
 const streaks=useMemo(()=>createWetStreaks([-.62,.62].map(x=>({x,y:.8,z:2.05,width:.7,color:LOOK.red,intensity:1.2}))),[])
 useEffect(()=>()=>{streaks?.geometry.dispose()},[streaks])
 return streaks?<primitive object={streaks}/>:null
}

function Equalizer({music,active}:{music:MusicAudio;active:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{let raf=0;const draw=()=>{const c=canvas.current?.getContext('2d');if(c){const w=576,h=100;c.clearRect(0,0,w,h);let signal=0;for(let i=0;i<24;i++){const value=active&&music.analysisActive?pulse.spectrum[i]:0;signal+=value;c.fillStyle=i<14?'#89dac0':i<20?'#e2b971':'#ee8b6f';const segments=Math.round(value*13);for(let j=0;j<13;j++){c.globalAlpha=j<segments?1:.10;c.fillRect(i*24+3,h-j*7-8,15,4)}c.globalAlpha=1;if(active&&music.analysisActive){c.fillStyle='#e8e6bf';c.fillRect(i*24+3,h-pulse.peaks[i]*91-9,15,2)}}canvas.current!.dataset.signal=String(signal)}raf=requestAnimationFrame(draw)};draw();return()=>cancelAnimationFrame(raf)},[active,music])
 return <canvas ref={canvas} width={576} height={100} className="jn-spectrum" aria-label="Live radio spectrum equalizer"/>
}

function HostCaption({line,onOpen,giant=false}:{line:{text:string;cta:string};onOpen:()=>void;giant?:boolean}){
 return <aside className={`jn-host${giant?' jn-host-giant':''}`} role="status" aria-live="polite"><span>{HOST_NAME} <i>· holographic message</i></span><p>“{line.text}”</p><button onClick={onOpen}>{line.cta} ↗</button></aside>
}
function MobileRadioHit({onClick}:{onClick:()=>void}){
 const button=useRef<HTMLButtonElement>(null)
 useEffect(()=>{
  const place=()=>{
   const el=button.current;if(!el)return
   try{
    const bounds=JSON.parse(document.documentElement.dataset.physicalRadioBounds||'null') as {at:number;left:number;right:number;top:number;bottom:number}|null
    if(!bounds||performance.now()-bounds.at>1000){el.style.visibility='hidden';return}
    const width=Math.max(44,bounds.right-bounds.left),height=Math.max(44,bounds.bottom-bounds.top)
    el.style.left=`${(bounds.left+bounds.right-width)/2}px`;el.style.top=`${(bounds.top+bounds.bottom-height)/2}px`
    el.style.width=`${width}px`;el.style.height=`${height}px`;el.style.visibility='visible'
   }catch{el.style.visibility='hidden'}
  }
  place();const timer=setInterval(place,100);return()=>clearInterval(timer)
 },[])
 return <button ref={button} className="jn-mobile-radio-hit" aria-label="Open dashboard radio" onClick={onClick}/>
}

export default function JeepNight({humanRadio=false,experienceFirst=false,cruiseOS=false,prototype=false}:{humanRadio?:boolean;experienceFirst?:boolean;cruiseOS?:boolean;prototype?:boolean}={}){
 const [listeningOnly,setListeningOnly]=useState(()=>humanRadio&&new URLSearchParams(location.search).get('listen')==='1'),[presence,setPresence]=useState(false),[mapOpen,setMapOpen]=useState(false),[osOverlay,setOsOverlay]=useState(false)
 const campaign=useRealMiamiCampaign()||DEFAULT_CRUISE_CAMPAIGN,advertising=useRealMiamiAds()
 const [enhanced,setEnhanced]=useState(true),[look]=useState(()=>cruiseLookEnabled()),[hoodFx]=useState(()=>new URLSearchParams(location.search).get('hoodfx')!=='off')
 const [vehicle,setVehicle]=useState<RideVehicleId>(()=>{const q=new URLSearchParams(location.search),v=q.get('car');if(look&&q.get('city')!=='legacy'&&q.get('drive')!=='retrowave'&&q.get('drive')!=='highway'&&v&&!['countach','coastal-coupe','classic-coupe','island-trail'].includes(v))return 'countach';if(look&&q.get('drive')!=='retrowave'&&(v==='delorean'||q.get('world')==='neon'))return 'countach';return experienceFirst&&['countach','wrangler','eighties','cadillac','delorean','coastal-coupe','classic-coupe','island-trail'].includes(v||'')?v as RideVehicleId:q.get('world')==='neon'?'delorean':'countach'})
 const launchVehicle=vehicle==='coastal-coupe'||vehicle==='classic-coupe'||vehicle==='island-trail'?vehicle:null
 const baseProfile=useMemo(()=>launchVehicle?launchCameraProfile(launchVehicle):vehicle==='delorean'?DELOREAN_CAMERA_PROFILE:vehicle==='countach'?COUNTACH_CAMERA_PROFILE:vehicle==='cadillac'?CLASSIC_CAMERA_PROFILE:vehicle==='eighties'?EIGHTIES_CAMERA_PROFILE:WRANGLER_CAMERA_PROFILE,[launchVehicle,vehicle])
 useEffect(()=>{if(new URLSearchParams(location.search).get('look')==='original')setEnhanced(false)},[])
 const profile=useMemo(()=>cruiseCockpitProfile(experienceCameraProfile(baseProfile,vehicle,experienceFirst),vehicle,cruiseOS),[baseProfile,vehicle,experienceFirst,cruiseOS])
 const [transitionSeconds]=useState(()=>experienceFirst?sunsetDurationSeconds(new URLSearchParams(location.search).get('sunsetMinutes')):2400)
 const speedFx=useRef(false),motion=useRef(0),state=useRef(createNightState()),car=useRef<T.Group|null>(null),report=useRef({fps:0,drawCalls:0,dpr:1}),music=useMemo(()=>new MusicAudio(),[])
 const [neon]=useState(()=>!humanRadio&&new URLSearchParams(location.search).get('world')==='neon'),STATIONS=useMemo(()=>(humanRadio?(look?[...HUMAN_RADIO_STATIONS,...NEON_STATIONS]:HUMAN_RADIO_STATIONS):neon?NEON_STATIONS:MIAMI_CRUISE_STATIONS).filter(canPlayCruiseStation),[humanRadio,neon,look]),RADIO_PRESETS=STATIONS
 const stationAds=useMemo(()=>createRadioStationCampaigns(RADIO_PRESETS),[RADIO_PRESETS])
 const adRoster=useMemo(()=>prototype?[...stationAds,GTA_VI_CAMPAIGN]:[campaign,...CRUISE_CAMPAIGNS.filter(item=>item.id!==campaign.id),...stationAds,GTA_VI_CAMPAIGN],[prototype,stationAds,campaign]),adCampaign=prototype?adRoster[0]:campaign
 const [host,setHost]=useState<HostEvent>({phase:'gone'}),[hostOff]=useState(()=>new URLSearchParams(location.search).get('host')==='off')
 const [geo,setGeo]=useState<MiamiGeoData|null>(null),[geoError,setGeoError]=useState(''),[baseline,setBaseline]=useState(false),[duskNight,setDuskNight]=useState(false),blend=useRef(1),cycleStart=useRef(0)
 const shared=useRef<SharedDrive|null>(null);if(shared.current===null&&typeof window!=='undefined')shared.current=readShared(location.search)
 const route=useMemo(()=>geo?createMiamiRoute(geo):null,[geo])
 const cityExit=useMemo(()=>route?cityInterchangeMeters(route):0,[route])
 // Look v2 drive modes: City (OSM Miami Beach) or Highway (authored I-95). Each keeps its own odometer.
 const [drive,setDriveState]=useState<'city'|'highway'|'causeway'|'retrowave'>(()=>{const requested=new URLSearchParams(location.search).get('drive');return cruiseLookEnabled()&&(requested==='highway'||requested==='causeway'||requested==='retrowave')?requested:'city'})
 const highwayRoute=useMemo(()=>geo?createConnectedHighwayRoute(geo.origin):createHighwayRoute(),[geo])
 const [causewayDirection,setCausewayDirection]=useState<CausewayDirection>('outbound')
 const outbound=useMemo(()=>geo&&route?createCausewayRoute(route,highwayRoute,'outbound',geo.origin):null,[geo,route,highwayRoute])
 const inbound=useMemo(()=>geo&&route?createCausewayRoute(route,highwayRoute,'inbound',geo.origin):null,[geo,route,highwayRoute])
 const causewayRoute=causewayDirection==='outbound'?outbound:inbound
 // Look v2 Retrowave reuses the Neon Run world on its procedural avenue: no OSM route, the Countach stays.
 const cityVariant=cruiseCityVariant(new URLSearchParams(location.search).get('city'))
 const sourceCity=look&&drive==='city'&&cityVariant==='source'
 const sourceVisited=useRef(false)
 const sourceCapture=useRef<(()=>Promise<Blob>)|null>(null),sourceTelemetry=useRef<OceanDriveState|null>(null),islandExport=useRef<Promise<ArrayBuffer>|null>(null)
 const retro=drive==='retrowave',neonScene=neon||retro
 const activeRoute=drive==='highway'?highwayRoute:drive==='causeway'?causewayRoute:retro?null:route,driveRef=useRef(drive);driveRef.current=drive
 const highwayRouteRef=useRef(highwayRoute);highwayRouteRef.current=highwayRoute
 const causewayRouteRef=useRef(causewayRoute);causewayRouteRef.current=causewayRoute
 const highwayAds=useMemo(()=>highwayRoute?createHighwayAdPlacements(highwayRoute,adCampaign,{every:HIGHWAY.billboardEvery*.6,right:HIGHWAY.barrier+8.5,left:HIGHWAY.oncoming-HIGHWAY.barrier-8.5,y:9.5,groundY:-HIGHWAY.deck,roster:adRoster}):undefined,[highwayRoute,adCampaign,adRoster])
 const causewayAds=useMemo(()=>causewayRoute?createHighwayAdPlacements(causewayRoute,adCampaign,{every:620,right:21,left:-21,y:8.5,groundY:-12,start:360,roster:adRoster,idPrefix:'CWAY'}).filter(p=>p.x< -900&&!(p.x< -5050&&p.x> -5600)):undefined,[causewayRoute,adCampaign,adRoster])
 const cityAds=useMemo(()=>geo&&route?createMiamiAdPlacements(geo,route,adCampaign,{hero:look,roster:adRoster}):undefined,[geo,route,adCampaign,look,adRoster])
 const parkedMeters=useRef<{city:number|null;highway:number;retrowave:number}>({city:null,highway:HIGHWAY.billboardEvery*.4,retrowave:0})
 const queuedCauseway=useRef<CausewayDirection|null>(null)
 const setDrive=useCallback((next:'city'|'highway'|'retrowave')=>{if(next===driveRef.current)return;const s=state.current;queuedCauseway.current=null;if(driveRef.current!=='causeway')parkedMeters.current[driveRef.current]=s.distance
  const to=parkedMeters.current[next]??landmarkRegistry.initialRouteMeters;s.distance=to;s.traffic.forEach((car,i)=>{car.distance=to+65+i*115;car.lateral=i?-2:2});if(look&&((next!=='retrowave'&&vehicle==='delorean')||(next==='city'&&new URLSearchParams(location.search).get('city')!=='legacy'&&!['countach','coastal-coupe','classic-coupe','island-trail'].includes(vehicle)))){setReady(false);setVehicle('countach')}setDriveState(next)},[look,vehicle])
 useEffect(()=>{if(!route||!outbound||!inbound)return;const timer=setInterval(()=>{
  const s=state.current,which=driveRef.current,requested=queuedCauseway.current
  if(which==='city'&&requested==='outbound'&&((s.distance%route.length)+route.length)%route.length>=cityExit&&((s.distance%route.length)+route.length)%route.length<cityExit+12){parkedMeters.current.city=s.distance;queuedCauseway.current=null;setCausewayDirection('outbound');s.distance=0;s.traffic.forEach((car,i)=>{car.distance=100+i*140});setDriveState('causeway')}
  else if(which==='highway'&&requested==='inbound'&&((s.distance%highwayRoute.length)+highwayRoute.length)%highwayRoute.length>=CAUSEWAY.highwayExitMeters&&((s.distance%highwayRoute.length)+highwayRoute.length)%highwayRoute.length<CAUSEWAY.highwayExitMeters+12){parkedMeters.current.highway=s.distance;queuedCauseway.current=null;setCausewayDirection('inbound');s.distance=0;s.traffic.forEach((car,i)=>{car.distance=100+i*140});setDriveState('causeway')}
  else if(which==='causeway'&&s.distance>=(causewayDirection==='outbound'?outbound:inbound).length-6){const next=causewayDirection==='outbound'?'highway':'city',to=causewayDirection==='outbound'?0:CAUSEWAY.cityReturnMeters;s.distance=to;s.traffic.forEach((car,i)=>{car.distance=to+100+i*140});setDriveState(next)}
 },50);return()=>clearInterval(timer)},[route,outbound,inbound,cityExit,highwayRoute,causewayDirection])
 const director=useMemo(()=>{if(!geo||!route)return null;const ads=cityAds?.map(a=>[a.x,a.z] as [number,number])||[];const seed=Number(new URLSearchParams(location.search).get('directorSeed'))||Date.now();return new CruiseDirector(route,geo,landmarkRegistry.landmarks as never,ads,seed)},[geo,route,cityAds])
 const [crowd,setCrowd]=useState(true),[qualityChoice,setQualityChoice]=useState<QualityChoice>('auto'),[sceneryDpr,setSceneryDpr]=useState(1)
 useEffect(()=>{setQualityChoice(readChoice())},[])
 const [autoDrop,setAutoDrop]=useState(0),dropTier=useCallback(()=>setAutoDrop(n=>Math.min(2,n+1)),[])
 const quality=useMemo(()=>qualityChoice==='auto'?stepDown(resolve(qualityChoice),autoDrop):resolve(qualityChoice),[qualityChoice,autoDrop])
 useEffect(()=>{director?.setTier(quality.directorTier);document.documentElement.dataset.cruiseQuality=quality.tier},[director,quality])
 useEffect(()=>{if(new URLSearchParams(location.search).get('npcs')==='off')setCrowd(false)},[])
 const [letterbox,setLetterbox]=useState(true),[shot,setShot]=useState<DirectorShotId|null>(null),[neonShot,setNeonShot]=useState<NeonShot|null>(null)
 const neonDirector=useMemo(()=>neonScene?new NeonDirector(Number(new URLSearchParams(location.search).get('directorSeed'))||7):null,[neonScene])
 useEffect(()=>{if(!neonDirector||drive==='city')return;window.__director=()=>neonDirector.snapshot() as never;if(new URLSearchParams(location.search).get('diagnostics')==='1')window.__directorForce=shot=>neonDirector.force(shot as unknown as NeonShot|null);const timer=setInterval(()=>setNeonShot(neonDirector.shot),250);return()=>{clearInterval(timer);delete window.__director;delete window.__directorForce}},[neonDirector,drive])
 useEffect(()=>{if(neon||(!humanRadio&&new URLSearchParams(location.search).get('world')==='baseline')){setBaseline(true);return}const abort=new AbortController();fetch('/real-miami/miami/world.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error(`Map unavailable (${r.status})`);return r.json()}).then(data=>{state.current.distance=driveRef.current==='causeway'?0:shared.current?.startMeters??landmarkRegistry.initialRouteMeters;state.current.traffic.forEach((car,i)=>{car.distance=state.current.distance+65+i*115;car.lateral=2});setGeo(data)}).catch(e=>{if(e.name!=='AbortError')setGeoError(e.message)});return()=>abort.abort()},[])
 const audio=useCruiseAudio(music,STATIONS),library=useRadioLibrary({...audio,requested:humanRadio?false:audio.requested}),humanMetadata=useHumanMetadata(audio.stationId,humanRadio&&audio.requested,audio.playing?audio.currentTrack:null),activeNowPlaying=humanRadio?{stationId:audio.stationId,title:humanMetadata?.title||humanMetadata?.show||null,artist:humanMetadata?.artist||null,source:humanMetadata?.source||null,observedAt:humanMetadata?.observedAt||new Date().toISOString(),available:humanMetadata?.available||false,kind:humanMetadata?.kind||'unavailable' as const}:library.nowPlaying,displayTitle=humanRadio?[humanMetadata?.artist,humanMetadata?.title||humanMetadata?.show].filter(Boolean).join(' - '):library.displayTitle,radioAudio=useMemo(()=>({...audio,trackTitle:displayTitle}),[audio,displayTitle]),[ready,setReady]=useState(false),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[view,setView]=useState<View>(experienceFirst&&!cruiseOS?'chase':'driver'),[radio,setRadio]=useState(false),[night,setNight]=useState(()=>sourceCity?false:prototype||!humanRadio),[visible,setVisible]=useState(true),[speed,setSpeed]=useState(0),[district,setDistrict]=useState('Coastal boulevard'),[tone,setTone]=useState<'cruise'|'night-drive'|'midnight-run'>('night-drive')
 const radioLibrary=useDiscoveries({metadata:humanMetadata,stationName:audio.station.name,playing:audio.playing,loading:audio.loading})
 useEffect(()=>{if(!prototype)return;const tune=(event:Event)=>{const id=(event as CustomEvent<{stationId?:string}>).detail?.stationId;if(!id||!RADIO_PRESETS.some(station=>station.id===id))return;if(audio.selectStation(id)&&!audio.requested)audio.start()};window.addEventListener('cruise:tune-station',tune);return()=>window.removeEventListener('cruise:tune-station',tune)},[prototype,RADIO_PRESETS,audio])
 const radioMemories=useRadioMemories({stationId:audio.stationId,playing:audio.playing})
 if(sourceCity&&started)sourceVisited.current=true
 const current=useRef({audio,view,ready,radio,vehicle,started});current.current={audio,view,ready,radio,vehicle,started}
 const [radioPanel,setRadioPanel]=useState(false),[openingElapsed,setOpeningElapsed]=useState(0),manualCamera=useRef(false),openingStart=useRef(0)
 const metrics=useExperienceMetrics({active:experienceFirst,started:started||audio.requested,playing:audio.playing&&!audio.loading,muted:audio.muted,volume:audio.volume,elapsed:openingElapsed})
 const lastPlaybackError=useRef<string|null>(null)
 useEffect(()=>{if(experienceFirst&&audio.error&&audio.error!==lastPlaybackError.current)metrics.record('playback_failure');lastPlaybackError.current=audio.error},[experienceFirst,audio.error,metrics.record])
 const captureRequest=useRef<PostcardCaptureRequest|null>(null)
 const capturePostcard=useCallback(async()=>{
  const cabin=()=>new Promise<Blob>((resolve,reject)=>{if(captureRequest.current){reject(new Error('A capture is already in progress.'));return}const timeout=setTimeout(()=>{captureRequest.current=null;reject(new Error('The scene is not drawing. Return to the visible scenery and try again.'))},10000);captureRequest.current={resolve:blob=>{clearTimeout(timeout);resolve(blob)},reject:error=>{clearTimeout(timeout);reject(error)}}})
  if(!sourceCity||!sourceCapture.current)return cabin()
  const world=await sourceCapture.current();if(view!=='driver'&&!radio)return world
  const [background,foreground]=await Promise.all([createImageBitmap(world),cabin().then(createImageBitmap)])
  try{const canvas=document.createElement('canvas');canvas.width=background.width;canvas.height=background.height;const context=canvas.getContext('2d')!;context.drawImage(background,0,0);context.drawImage(foreground,0,0,canvas.width,canvas.height);return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not capture the cockpit.')),'image/png'))}finally{background.close();foreground.close()}
 },[sourceCity,view,radio])
 const [landmark,setLandmark]=useState<Landmark|null>(null),[nearbyLandmark,setNearbyLandmark]=useState<Landmark|null>(null),landmarkRef=useRef<Landmark|null>(null),priorPark=useRef(false)
 landmarkRef.current=landmark
 const novaBusy=useRef(false)
 // NOVA lives only in Look v2 Retrowave (Luis, 2026-10-22): City and Highway have no companion card or settings.
 // Giant NOVA says only ads (outside, Retrowave); the companion talks to the driver in the card. They take turns.
 const giantAd=useGiantAds({audio,active:look&&retro&&started&&ready&&!listeningOnly&&!radio&&!landmark,companionBusy:novaBusy.current,preview:prototype})
 const nova=useNovaCompanion({audio,active:look&&retro&&started&&ready&&!listeningOnly&&!radio&&!landmark,night,held:!!giantAd.ad,preview:prototype})
 novaBusy.current=!!nova.current
 const closeLandmark=useCallback(()=>{if(landmarkRef.current){setLandmark(null);setPaused(priorPark.current);landmarkRef.current=null}},[])
 const openRadio=useCallback(()=>{if(!started)return;closeLandmark();setRadioPanel(false);setRadio(true)},[closeLandmark,started])
 const toggleRadio=()=>{closeLandmark();setRadioPanel(false);setRadio(v=>!v)}
 const inspectLandmark=()=>{if(nearbyLandmark){priorPark.current=paused;setRadio(false);setRadioPanel(false);setPaused(true);setLandmark(nearbyLandmark)}}
 const getDistance=useCallback(()=>state.current.distance,[])
 const [frequencyEnabled]=useState(()=>cruiseOS&&new URLSearchParams(location.search).get('follow')==='1')
 const guidePlaces=useMemo(()=>landmarkRegistry.landmarks.map(item=>({id:item.kind,name:item.name,meters:item.encounter.routeMeters})),[])
 const guide=useFrequencyGuide(frequencyEnabled,guidePlaces,route?.length||0,getDistance)
 useEffect(()=>{if(!route)return;const update=()=>{if(driveRef.current!=='city'){setNearbyLandmark(null);return}const p=route.sample(state.current.distance);const nearest=landmarkRegistry.landmarks.reduce((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)<Math.hypot(b.position.x-p.x,b.position.z-p.z)?a:b);setNearbyLandmark(Math.hypot(nearest.position.x-p.x,nearest.position.z-p.z)<180?nearest:null)};update();const timer=setInterval(update,200);return()=>clearInterval(timer)},[route])
 const onReady=useCallback(()=>setReady(true),[])
 useEffect(()=>{if(!baseline||new URLSearchParams(location.search).get('diagnostics')!=='1')return;window.__miamiInspect=meters=>{state.current.distance=meters;state.current.traffic.forEach((t,i)=>{t.distance=meters+65+i*115})};return()=>{delete window.__miamiInspect}},[baseline])
 useEffect(()=>{if(!retro||new URLSearchParams(location.search).get('diagnostics')!=='1')return;window.__retroInspect=meters=>{if(!Number.isFinite(meters))return;state.current.distance=Math.max(0,meters);state.current.traffic.forEach((t,i)=>{t.distance=state.current.distance+90+i*135})};return()=>{delete window.__retroInspect}},[retro])
 useEffect(()=>{if(!route||!geo)return;window.__miamiGeo=()=>{if(sourceCity)return{source:'Ocean Drive',geographic:false,...sourceTelemetry.current};const s=state.current,active=driveRef.current==='highway'?highwayRouteRef.current:driveRef.current==='causeway'?causewayRouteRef.current:route,p=(active||route).sample(s.distance);return{drive:driveRef.current,latitude:p.lat,longitude:p.lon,street:p.streetName,routeMeters:s.distance%(active||route).length,routeLength:(active||route).length,worldExtentMeters:geo.extentMeters,totalChunks:Object.keys(geo.chunks).length,chunksGenerated:s.chunksGenerated,generationMs:s.generationMs,maxGenerationMs:s.maxGenerationMs,chunkState:document.documentElement.dataset.miamiChunks,elapsed:s.elapsed,nightBlend:blend.current,transitionSeconds,position:{x:p.x,z:p.z,yaw:p.yaw}}};if(new URLSearchParams(location.search).get('diagnostics')==='1'){window.__miamiInspect=meters=>{state.current.distance=meters;state.current.traffic.forEach((t,i)=>{t.distance=meters+65+i*115})}}return()=>{delete window.__miamiGeo;delete window.__miamiInspect}},[route,geo,transitionSeconds,sourceCity])
 useEffect(()=>{if(!director||drive!=='city')return;window.__director=()=>director.snapshot();if(new URLSearchParams(location.search).get('diagnostics')==='1')window.__directorForce=shot=>director.force(shot);const timer=setInterval(()=>setShot(director.snapshot().shot as DirectorShotId|null),250);return()=>{clearInterval(timer);delete window.__director;delete window.__directorForce}},[director,drive])
 // VESPER whispers: the radio ducks under the line, then returns to the listener's own level.
 const duck=useRef<{to:number;from:number}|null>(null)
 useEffect(()=>{
  if(host.phase!=='speak'){window.speechSynthesis?.cancel();return}
  // Read the live audio (this effect's `audio` is a stale render): restore unless the listener moved the volume meanwhile.
  const restore=()=>{const d=duck.current,live=current.current.audio;duck.current=null;if(d&&Math.abs(live.volume-d.to)<.02)live.setVolume(d.from)}
  if(audio.playing&&!audio.muted&&!duck.current){duck.current={from:audio.volume,to:audio.volume*.3};audio.setVolume(duck.current.to)}
  const synth=window.speechSynthesis
  if(!synth||audio.muted){const t=setTimeout(restore,4200);return()=>{clearTimeout(t);restore()}}
  const say=new SpeechSynthesisUtterance(host.line.text),voices=synth.getVoices().filter(v=>/^en/i.test(v.lang))
  say.voice=voices.find(v=>/aria|jenny|zira|samantha|female|libby|sonia/i.test(v.name))||voices[0]||null;say.rate=.84;say.pitch=1.12;say.volume=.95
  // Speech may never start (no voices, autoplay policy); never leave the radio ducked past the line.
  let after:ReturnType<typeof setTimeout>|undefined;const fallback=setTimeout(restore,Math.max(4500,host.line.text.length*95))
  say.onend=say.onerror=()=>{clearTimeout(fallback);after=setTimeout(restore,500)}
  synth.cancel();synth.speak(say)
  return()=>{clearTimeout(fallback);clearTimeout(after);synth.cancel();restore()}
 },[host]) // eslint-disable-line react-hooks/exhaustive-deps -- one whisper per appearance; audio identity changes every render
 useEffect(()=>{
  const id=shared.current?.station
  if(prototype){
   const catalog=drive==='retrowave'?NEON_STATIONS:HUMAN_RADIO_STATIONS
   const live=RADIO_PRESETS.filter(station=>(station.playback!=='playlist'||station.id==='veridian-club')&&catalog.some(candidate=>candidate.id===station.id)).map(station=>station.id)
   const key='buena-onda:cruise:last-start-station:v1'
   let previous=''
   try{previous=sessionStorage.getItem(key)||''}catch{}
   const explicit=id&&RADIO_PRESETS.some(station=>station.id===id)?id:null
   const selected=explicit||randomStation(live,previous)||RADIO_PRESETS[0]?.id
   if(selected)audio.selectStation(selected)
   if(!explicit&&selected)try{sessionStorage.setItem(key,selected)}catch{}
   return
  }
  if(experienceFirst){const playable=RADIO_PRESETS.map(s=>s.id);let remembered:string|null=null;try{remembered=readRememberedStation(localStorage,playable)}catch{}audio.selectStation(chooseInitialStation(id,remembered,playable));return}
  audio.selectStation(id&&RADIO_PRESETS.some(s=>s.id===id)?id:neon?RADIO_PRESETS[0].id:'jolt-radio')
 },[])
 useEffect(()=>{if(shared.current?.time)setNight(shared.current.time==='night')},[]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>{state.current.reduced=media.matches};changed();media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed)},[])
 useEffect(()=>{const q=new URLSearchParams(location.search),pace=q.get('pace');if(pace==='cruise'||pace==='night-drive'||pace==='midnight-run')setTone(pace);if(q.get('speedfx')==='on')speedFx.current=true},[])
 useEffect(()=>{state.current.mood=tone},[tone])
 useEffect(()=>{const changed=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed)},[])
 // Starting (or switching) a drive parks the car behind DriveLoading until SceneWarmUp has it running smoothly.
 const [warming,setWarming]=useState(false),[warmProgress,setWarmProgress]=useState(.06),warmedDrive=useRef(drive)
 useEffect(()=>{if(warming)setWarmProgress(.06)},[warming])
 // Cruise is a curated radio first: the radio-only view and the drive share one station, and leaving the radio for a
 // running drive warms it up again behind the loader.
 const justRadio=()=>{renderHold.active=false;setWarming(false);setListeningOnly(true);audio.start()}
 const backToDrive=()=>{setListeningOnly(false);if(started){renderHold.active=true;setWarming(true)}}
 // Six quick stations, the listener's saved ones first (same order as the drive deck's presets).
 const radioPresets=useMemo(()=>[...radioLibrary.favorites.map(id=>STATIONS.find(station=>station.id===id)).filter((station):station is (typeof STATIONS)[number]=>!!station),...STATIONS.filter(station=>!radioLibrary.favorites.includes(station.id))].slice(0,6),[radioLibrary.favorites,STATIONS])
 // The site's radio bar (a DOM <audio>) pauses when Cruise's radio plays; Cruise's own element is not in the DOM.
 useEffect(()=>{if(audio.playing)document.querySelectorAll('audio').forEach(element=>{if(!element.paused)element.pause()})},[audio.playing])
 useEffect(()=>{if(warmedDrive.current===drive)return;warmedDrive.current=drive;if(started){renderHold.active=true;setWarming(true)}},[drive,started])
 useEffect(()=>{state.current.paused=!started||paused||!visible||warming||(experienceFirst&&(!ready||!route))||(humanRadio&&listeningOnly)},[started,paused,visible,warming,humanRadio,listeningOnly,experienceFirst,ready,route])
 useEffect(()=>{if(started){manualCamera.current=false;setView('director')}},[drive,started])
 useEffect(()=>{const timer=setInterval(()=>{if(experienceFirst)setOpeningElapsed(Math.max(0,state.current.elapsed-openingStart.current));setSpeed(Math.round(state.current.speed*3.6));setDuskNight(blend.current>=.5);setDistrict(sourceCity?'Ocean Drive':driveRef.current==='highway'&&highwayRouteRef.current?highwayRouteRef.current.sample(state.current.distance).streetName:driveRef.current==='causeway'&&causewayRouteRef.current?causewayRouteRef.current.sample(state.current.distance).streetName:driveRef.current==='retrowave'?NEON_WORLD.district:route?route.sample(state.current.distance).streetName:neon?NEON_WORLD.district:(state.current.district==='coast'?'Coastal boulevard':'Neon quarter'))},200);if(new URLSearchParams(location.search).get('diagnostics')==='1')(window as Window&{__cruiseSlowLeader?:(gap?:number,speed?:number)=>void}).__cruiseSlowLeader=(gap=45,speed=4)=>{const s=state.current,car=s.traffic.find(t=>t.lateral>0);if(car){car.distance=s.distance+gap;car.speed=speed}};window.__jeepNight=()=>{const s=state.current,c=current.current;return{speed:s.speed*3.6,acceleration:s.acceleration,brake:s.brake||0,rpm:sourceCity?(sourceTelemetry.current?.rpm||0):s.paused?0:800+s.speed*75,distance:s.odometer,paused:s.paused,camera:c.view,radioFocused:c.radio,district:s.district,fps:report.current.fps,station:c.audio.stationId,playing:c.audio.playing,muted:c.audio.muted,volume:c.audio.volume,analysis:music.status,spectrum:Array.from(pulse.spectrum).reduce((a,b)=>a+b,0),drawCalls:report.current.drawCalls,renderDpr:report.current.dpr,ready:c.ready,vehicle:c.vehicle,garage:!c.started,timeMode:blend.current>=.5?'night':'sunset'}};return()=>{clearInterval(timer);delete window.__jeepNight}},[music,route,sourceCity])
 useEffect(()=>{if(cruiseOS)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){closeLandmark();setRadio(false);return}if(!started)return;if((e.target as HTMLElement).matches('input,select,button')||(humanRadio&&(e.target as HTMLElement).closest('.hr-radio')))return;if(e.key.toLowerCase()==='v'){manualCamera.current=true;closeLandmark();setView(v=>v==='driver'?'chase':'driver')}if(e.key.toLowerCase()==='d'){manualCamera.current=true;closeLandmark();setRadio(false);setView(v=>v==='director'?'driver':'director')}if(e.key.toLowerCase()==='r'){closeLandmark();setRadioPanel(false);setRadio(v=>!v)}if(e.key==='Escape'){closeLandmark();setRadio(false)}if(e.key===' '){e.preventDefault();if(landmarkRef.current){closeLandmark();setPaused(false)}else setPaused(v=>!v)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[closeLandmark,started,cruiseOS])
 const selectVehicle=(next:RideVehicleId)=>{if(next===vehicle||(look&&next==='delorean'&&drive!=='retrowave'))return;closeLandmark();setRadio(false);setRadioPanel(false);setReady(false);setVehicle(next)}
 const returnToGarage=()=>{closeLandmark();setRadio(false);setRadioPanel(false);setStarted(false);setPaused(true);state.current.paused=true}
 const start=()=>{renderHold.active=true;setWarming(true);closeLandmark();setRadio(false);manualCamera.current=false;setView('director');openingStart.current=state.current.elapsed;audio.start();setPaused(false);state.current.paused=false;cycleStart.current=state.current.elapsed;setStarted(true);if(shared.current?.cam)shared.current.cam=undefined}
 const [shareNote,setShareNote]=useState('')
 const [retroTuneDismissed,setRetroTuneDismissed]=useState(false)
 const [retroCue,setRetroCue]=useState<{label:string;destination:string}|null>(null)
 useEffect(()=>{const update=(event:Event)=>setRetroCue((event as CustomEvent<{label:string;destination:string}|null>).detail);window.addEventListener('cruise:retro-ad',update);return()=>window.removeEventListener('cruise:retro-ad',update)},[])
 const share=async()=>{const url=shareUrl(location.origin,{station:audio.stationId,at:nearbyLandmark?.kind||String(Math.round(state.current.distance%(route?.length||1))),time:night?'night':'sunset',cam:view}).replace('/cruise?',prototype?'/cruise/prototype?':cruiseOS?'/cruise/os?':experienceFirst?'/cruise/experience?':humanRadio?'/cruise/human-radio?':'/cruise?');const title='Buena Onda Cruise',text=`Cruising Ocean Drive${nearbyLandmark?` past ${nearbyLandmark.name}`:''} with ${audio.station.name} on.`;try{if(navigator.share){await navigator.share({title,text,url});return}await navigator.clipboard.writeText(url);setShareNote('Link copied')}catch(e){if((e as Error)?.name!=='AbortError')setShareNote(url)}setTimeout(()=>setShareNote(''),2600)}
 const syncSource=useCallback((d:OceanDriveState)=>{
  if(driveRef.current!=='city')return
  sourceTelemetry.current=d;report.current={fps:d.fps||0,drawCalls:d.calls||0,dpr:d.dpr||1}
  if(!current.current.radio){const s=state.current;s.elapsed=d.elapsed;s.speed=d.speed;s.acceleration=d.acceleration;s.odometer+=d.speed*.2}
  blend.current=night?1:0
 },[night])
 const exportIsland=useCallback(()=>{
  if(!islandExport.current)islandExport.current=(async()=>{
   const begin=performance.now();while(!current.current.ready||current.current.vehicle!=='island-trail'){if(performance.now()-begin>30000)throw Error('The Island Trail is still loading.');await new Promise(r=>setTimeout(r,30))}
   if(!car.current)throw Error('The Island Trail is still loading.')
   const root=car.current.clone(true);root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.set(1,1,1)
   const lights:T.Object3D[]=[];root.traverse(o=>{if(o instanceof T.Light)lights.push(o)});lights.forEach(o=>o.removeFromParent());root.updateMatrixWorld(true)
   const {GLTFExporter}=await import('three/examples/jsm/exporters/GLTFExporter.js')
   const bytes=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:false})
   if(!(bytes instanceof ArrayBuffer))throw Error('The Island Trail export did not produce a model.')
   return bytes
  })()
  return islandExport.current.then(bytes=>bytes.slice(0))
 },[])
 const chooseCamera=(next:View)=>{manualCamera.current=true;closeLandmark();setRadio(false);setView(next)}
 const isCarSurface=(object:T.Object3D|undefined)=>{for(let node:T.Object3D|null|undefined=object;node&&node!==car.current;node=node.parent)if(node.name==='VehicleReflectiveFinish')return true;return false}
 const enterCarRadio=(event:ThreeEvent<MouseEvent>)=>{if(!started||radio||osOverlay||event.delta>6||!isCarSurface(event.intersections[0]?.object))return;event.stopPropagation();document.body.style.cursor='';manualCamera.current=true;setView('driver');openRadio()}
 useEffect(()=>{if(new URLSearchParams(location.search).get('diagnostics')!=='1')return;const w=window as Window&{__cruiseView?:(next:View)=>void};w.__cruiseView=next=>{manualCamera.current=true;closeLandmark();setRadio(false);setView(next)};(w as Window&{__cruiseDrive?:(next:'city'|'highway'|'retrowave')=>void}).__cruiseDrive=next=>{closeLandmark();setDrive(next)};return()=>{delete w.__cruiseView;delete (w as Window&{__cruiseDrive?:unknown}).__cruiseDrive}},[closeLandmark,setDrive])
 const seek=(direction:number)=>{const i=RADIO_PRESETS.findIndex(s=>s.id===audio.stationId);audio.selectStation(RADIO_PRESETS[(i+direction+RADIO_PRESETS.length)%RADIO_PRESETS.length].id)}
 // TV cast: the TV session drives itself and takes play/next from the phone; the phone parks while it remotes.
 const castRemote=useRef({audio,seek});castRemote.current={audio,seek}
 // Each ride's own synthesized engine, under the radio, on every drive.
 const engine=useEngineSound({state,vehicle,active:started&&!listeningOnly,cockpit:view==='driver'})
 const [tvSession]=useState(()=>cruiseOS&&isTvSession())
 useEffect(()=>{if(tvSession&&ready&&!!route&&!started)start()},[tvSession,ready,route,started]) // eslint-disable-line react-hooks/exhaustive-deps -- start once the world is ready
 useEffect(()=>{
  if(!tvSession)return
  const report=serveTvRemote(command=>{const r=castRemote.current;if(command.type==='toggle')r.audio.toggle();else r.seek(command.step)})
  const timer=setInterval(()=>{const a=castRemote.current.audio;report({type:'state',station:a.station.name,playing:a.requested})},1000)
  return()=>clearInterval(timer)
 },[tvSession])
 useEffect(()=>{
  const casting=(e:Event)=>{const active=(e as CustomEvent<boolean>).detail;if(active)castRemote.current.audio.pause();setPaused(active)}
  addEventListener('cruise:casting',casting);return()=>removeEventListener('cruise:casting',casting)
 },[])
 return <main className={`jn ${humanRadio?`human-radio ${listeningOnly?'hr-listening':''}`:''} ${experienceFirst?'experience-first':''} ${cruiseOS?'cruise-os':''} ${!started?'jn-garage':''} ${started&&view==='director'&&!radio&&!landmark?'jn-directing':''}`} data-ready={ready} data-started={started} data-view={view} data-vehicle={vehicle} data-source-city={sourceCity&&started}>
  {sourceVisited.current&&<OceanDriveGame active={sourceCity&&started} captureRef={sourceCapture} vehicle={vehicle} view={view} night={night} paused={paused} covered={!started||!sourceCity||radio||osOverlay||listeningOnly||!visible} radio={radio} muted={audio.muted} quality={quality.tier} onState={syncSource} onRadio={()=>{manualCamera.current=true;setView('driver');openRadio()}} onPark={()=>setPaused(v=>!v)} exportIsland={exportIsland}/>}
  <Guard><CockpitProvider audio={radioAudio} stations={STATIONS} nowPlaying={activeNowPlaying} vehicleId="island-trail" autoLights={night||duskNight||retro} instant radioFocused={radio} focusRadio={openRadio}>
   {!listeningOnly&&<Canvas className="jn-world" onCreated={({gl})=>{/* Blocking compile-log checks cost seconds per shader on start; diagnostics keep them. */gl.debug.checkShaderErrors=new URLSearchParams(location.search).has('diagnostics')}} style={{visibility:sourceCity&&started&&!radio&&view!=='driver'?'hidden':'visible'}} dpr={experienceFirst?(radio?Math.max(sceneryDpr,1.5):sceneryDpr):quality.dpr} frameloop={visible&&(!sourceCity||!started||radio||view==='driver')?'always':'never'} camera={{position:[-.43,1.64,.43],fov:60,near:.04,far:500}} gl={{antialias:true,powerPreference:'high-performance',toneMapping:T.ACESFilmicToneMapping}}>
    <Suspense fallback={null}>
     {(started||(experienceFirst&&!cruiseOS))?sourceCity?<SourceRadioEnvironment night={night}/>:neonScene?<><NeonSky future={retro} state={state}/><NeonWorld state={state} tier={quality.tier} future={retro} radioCampaigns={adRoster}/>{look&&retro&&<><GiantNova state={state} ad={giantAd.ad} speaking={giantAd.speaking} enabled={!radio&&!landmark}/><BridgeNova state={state} ad={giantAd.ad} line={nova.current} speaking={giantAd.ad?giantAd.speaking:nova.speaking} enabled={!radio&&!landmark&&(nova.mode!=='off'||!!giantAd.ad)}/></>}{!look&&<Suspense fallback={null}><HoloHost state={state} enabled={!radio&&!landmark&&!hostOff} onEvent={setHost} giantEvery={retro?2:3} order={retro?RETRO_LINE_ORDER:undefined}/></Suspense>}</>:<><StreetSky time={night?'night':'sunset'} high={false} blend={baseline?undefined:blend} look={look}/>{drive==='causeway'&&causewayRoute?<CausewayWorld state={state} route={causewayRoute} blend={blend}/>:drive==='highway'&&highwayRoute?<HighwayWorld state={state} route={highwayRoute} blend={blend}/>:route&&geo?<MiamiWorld state={state} night={night} data={geo} route={route} blend={blend} enhanced={enhanced}/>:baseline?<NightWorld state={state} night={night}/>:null}</>:<GarageEnvironment/>}
     {started&&!sourceCity&&drive==='city'&&route&&geo&&crowd&&<Suspense fallback={null}><MiamiCrowd state={state} route={route} blend={blend} density={quality.crowdDensity}/></Suspense>}
     {started&&!sourceCity&&(!experienceFirst||prototype||openingElapsed>=60)&&route&&geo&&drive!=='retrowave'&&<MiamiAds key={drive} placements={drive==='highway'?highwayAds:drive==='causeway'?causewayAds:cityAds} night={blend} video={quality.tier!=='low'} vehicleId={vehicle} vehicleReady={ready} state={state} data={geo} route={drive==='highway'&&highwayRoute?highwayRoute:drive==='causeway'&&causewayRoute?causewayRoute:route} campaign={adCampaign} measurementsEnabled={!radio&&!landmark&&!osOverlay&&visible} onSamples={advertising?.reportSamples||(()=>{})} onActivate={placement=>advertising?.activate(placement)}/>}
     <group ref={car} onClick={enterCarRadio} onPointerOver={event=>{if(started&&!radio&&!osOverlay&&isCarSurface(event.object))document.body.style.cursor='pointer'}} onPointerOut={()=>{document.body.style.cursor=''}}>
      {look&&started&&<OwnTaillights/>}
      <Suspense fallback={null}><VehicleFinish key={vehicle} enabled={look&&started} blend={blend} city={drive==='city'}><VehicleChassis state={state} enabled={vehicle!=='countach'}>
       {launchVehicle?<LaunchCar key={launchVehicle} id={launchVehicle} state={state} cockpit={started&&(radio||view==='driver')} parked={!started} night={night||duskNight||retro} onReady={onReady}/>:vehicle==='countach'?<Countach feel paint={look} state={state} cockpit={(started||(experienceFirst&&!cruiseOS))&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>:vehicle==='delorean'?<Delorean state={state} cockpit={(started||(experienceFirst&&!cruiseOS))&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>:vehicle==='cadillac'?<ClassicConvertible state={state} cockpit={(started||(experienceFirst&&!cruiseOS))&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>:vehicle==='eighties'?<EightiesCar state={state} cockpit={(started||(experienceFirst&&!cruiseOS))&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>:<Wrangler state={state} cockpit={(started||(experienceFirst&&!cruiseOS))&&(radio||((view==='driver'||(view==='director'&&shot==='windshield'))&&!landmark))} onReady={onReady}/>}
      </VehicleChassis></VehicleFinish></Suspense>
     </group>
     <Ride sourceDriven={sourceCity&&started} highway={drive==='highway'} cinematicRoute={drive==='causeway'} feel transitionSeconds={transitionSeconds} state={state} car={car} view={view} radioFocused={radio} landmark={landmark} music={music} playing={audio.playing} report={report} route={activeRoute} blend={blend} cycleStart={cycleStart} night={night} profile={profile} garage={!started&&(!experienceFirst||cruiseOS)} vehicle={vehicle} director={drive==='city'?director:null} neonDirector={neonDirector} fast={neon} retro={retro} motion={motion} speedFx={speedFx}/><CruiseGlow neon={neonScene} enabled={!sourceCity&&(started||(experienceFirst&&!cruiseOS))&&enhanced&&(!experienceFirst||quality.tier!=='low')} blend={blend} radioFocused={radio} director={started&&view==='director'&&!radio&&!landmark} filmic={quality.filmic} motion={quality.filmic&&view!=='driver'?motion:undefined} look={look} restrained={look&&drive==='city'&&cityVariant==='district'} cabin={started&&!landmark&&(radio||view==='driver')}/>
     {look&&started&&activeRoute&&<PaintLampFeeder route={activeRoute} state={state} blend={blend} enabled={hoodFx}/>}{look&&started&&retro&&<RetroLampFeeder state={state} enabled={hoodFx}/>}
     {look&&started&&<HoodReflection key={vehicle} car={car} enabled={hoodFx&&quality.tier!=='low'} size={quality.tier==='high'?256:128}/>}
     {experienceFirst&&<AdaptiveScenery choice={qualityChoice} onDprChange={setSceneryDpr} onTierDrop={dropTier}/>}<FrameProfiler/><WorldMounted/>
     {experienceFirst&&<PostcardCapture requestRef={captureRequest}/>}
    </Suspense>
    {/* Outside the Suspense: switching drives suspends the scene, never the warm-up. */}<SceneWarmUp active={warming} sceneReady={ready&&!!route} onDone={()=>setWarming(false)} onProgress={fraction=>setWarmProgress(value=>Math.max(value,fraction))}/>
   </Canvas>}
  </CockpitProvider></Guard>
  {retro&&started&&!radio&&!landmark&&!osOverlay&&retroCue&&<div className="retro-ad-action"><span>ROADSIDE AD</span><a href={retroCue.destination} target="_blank" rel="noopener noreferrer">Visit {retroCue.label} ↗</a></div>}
  {look&&started&&!sourceCity&&(drive==='city'||drive==='highway')&&!radio&&!landmark&&!osOverlay&&!listeningOnly&&route&&<DriveInterchange drive={drive} meters={state.current.distance} length={drive==='highway'?HIGHWAY.length:route.length} exit={drive==='highway'?HIGHWAY_CITY_EXIT_METERS:cityExit} onSwitch={()=>{queuedCauseway.current=drive==='city'?'outbound':'inbound'}}/>}
  {sourceCity&&started&&view==='driver'&&!radio&&<MobileRadioHit onClick={openRadio}/>}
  {look&&!sourceCity&&!listeningOnly&&(started||(experienceFirst&&!cruiseOS))&&!(enhanced&&quality.tier!=='low')&&<><div className={`jn-look-lift${started&&!landmark&&(radio||view==='driver')?' jn-look-cabin':''}`} aria-hidden="true"/><div className={`jn-look-film${started&&!landmark&&(radio||view==='driver')?' jn-look-cabin':''}`} aria-hidden="true"/></>}
  {started&&view==='director'&&!radio&&!landmark&&<DirectorOverlay station={audio.station.name} letterbox={letterbox} onLetterbox={setLetterbox}/>}
  {started&&!cruiseOS&&<header className="jn-brand"><a href="/" aria-label="Buena Onda">BUENA ONDA<span>{humanRadio?'NO ALGORITHMS. JUST FREQUENCIES.':neon?`${NEON_WORLD.label} / ${NEON_WORLD.subtitle}`:'MIAMI / GEOGRAPHIC EXPERIMENT'}</span></a><p>{district}<span className="jn-dot"/> {profile.label.toUpperCase()}</p><LiveCruisers enabled={!experienceFirst&&started&&visible&&(!humanRadio||presence)&&!listeningOnly} className="jn-live"/></header>}
  {!started&&!experienceFirst&&<><RidePicker humanRadio={humanRadio} driveLabel={neon?'Neon Run / Rain-soaked avenue':undefined} only={neon?['delorean']:undefined} vehicle={vehicle} onSelect={selectVehicle} night={night} onNightChange={setNight} onStart={start} ready={ready} routeReady={!!route||baseline} castControl={<CastControl/>}/>{geoError&&<p className="rp-error" role="alert">{geoError}</p>}</>}
  {started&&!cruiseOS&&<>
   {!radio&&!landmark&&!neon&&(!experienceFirst||openingElapsed>=60)&&<MiamiAdCue/>}
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
  {experienceFirst&&!cruiseOS&&started&&nearbyLandmark&&!landmark&&!radio&&!listeningOnly&&<button className="ex-landmark" onClick={inspectLandmark} aria-label={`View landmark: ${nearbyLandmark.name}`}><small>OCEAN DRIVE</small>{nearbyLandmark.name}<span>Take a closer look</span></button>}
  {experienceFirst&&!cruiseOS&&started&&ready&&!listeningOnly&&openingElapsed>=65&&<CruisePostcard capture={capturePostcard} carLabel={profile.label} location={nearbyLandmark?.name||district} station={audio.station.name} verifiedTrack={isFreshHumanRadioTrack(humanMetadata)?`${humanMetadata.artist} - ${humanMetadata.title}`:null} url={shareUrl(location.origin,{station:audio.stationId,at:String(Math.round(state.current.distance%(route?.length||1))),time:night?'night':'sunset',cam:view}).replace('/cruise?','/cruise/experience?')+`&car=${vehicle}&sunsetMinutes=${transitionSeconds/60}`} onShared={()=>metrics.record('postcard_share')}/>}
  {experienceFirst&&presence&&<div className="ex-presence"><LiveCruisers enabled={started&&visible&&!listeningOnly} leased/></div>}
  {experienceFirst&&geoError&&<p role="alert" className="ex-load-error">Miami could not load. The radio is still here. <button onClick={()=>setListeningOnly(true)}>Listen without 3D</button></p>}
  {experienceFirst&&!cruiseOS&&!listeningOnly&&<OpeningMinute extraControls={<><CastControl/><ExperienceMetricsControls metrics={metrics}/></>} paused={paused} onPark={()=>setPaused(v=>!v)} showMap={mapOpen} onMap={()=>setMapOpen(v=>!v)} ready={ready&&!!route} started={started} elapsed={openingElapsed} onStart={start} vehicle={vehicle} onVehicle={selectVehicle} view={view} onView={chooseCamera} night={night} onNight={()=>{cycleStart.current=state.current.elapsed;setNight(v=>!v)}} onListen={justRadio} quality={qualityChoice} onQuality={choice=>{saveChoice(choice);setQualityChoice(choice)}}/>}
  {cruiseOS&&<>
   {guide.target&&<aside className="os-frequency-cue" aria-label="Destination guide"><span>FOLLOW THE FREQUENCY / EXPERIMENT</span><strong>{guide.target.name}</strong>{guide.arrived?<p role="status">You are here. Enjoy the view as you cruise past.</p>:<p>{Math.round(guide.meters)} m ahead on the existing coastal loop.</p>}<button onClick={guide.cancel}>Dismiss guide</button></aside>}
   {started&&drive==='city'&&geo&&route&&mapOpen&&!radio&&view!=='director'&&<MiamiMap data={geo} route={route} getDistance={getDistance}/>}
   {started&&!retro&&!radio&&!landmark&&<MiamiAdCue/>}
   {started&&!look&&neonScene&&host.phase==='speak'&&<HostCaption giant={host.giant} line={host.line} onOpen={()=>window.open(host.line.destination,'_blank','noopener,noreferrer')}/>}
   {started&&retro&&!NEON_STATIONS.some(n=>n.id===audio.stationId)&&!retroTuneDismissed&&<aside className="jn-retro-tune" aria-label="Retrowave radio suggestion"><span>RETROWAVE RADIO</span><button onClick={()=>{audio.selectStation('nightride');setRetroTuneDismissed(true)}}>Tune Nightride FM</button><button className="jn-retro-dismiss" onClick={()=>setRetroTuneDismissed(true)} aria-label="Keep my station">Keep my station</button></aside>}
   <DriveLoading show={warming&&!listeningOnly} progress={warmProgress} onSkip={justRadio}/>
   <CruiseOS radioLibrary={radioLibrary} radioMemories={radioMemories} onGarage={returnToGarage} sunlightLabel={sourceCity?'Sunrise':'Sunset'} quickStart={prototype} drive={look?drive==='causeway'?'highway':drive:undefined} onDrive={look?next=>{closeLandmark();setDrive(next)}:undefined} onSeek={seek} engine={engine} track={displayTitle||null} companion={look&&retro?{mode:nova.mode,onMode:nova.setMode,line:nova.current,speaking:nova.speaking}:undefined} ad={look&&retro?giantAd.ad:null} onOverlayChange={setOsOverlay} ready={ready&&!!route} started={started} elapsed={openingElapsed} onStart={start} vehicle={vehicle} onVehicle={selectVehicle} view={view} onView={chooseCamera} night={night} onNight={()=>{cycleStart.current=state.current.elapsed;setNight(v=>!v)}} onListen={justRadio} onScenery={()=>setListeningOnly(false)} quality={qualityChoice} onQuality={choice=>{saveChoice(choice);setQualityChoice(choice)}} paused={paused} onPark={()=>{if(landmark){closeLandmark();setPaused(false)}else setPaused(v=>!v)}} audio={audio} metadata={humanMetadata} listeningOnly={listeningOnly} presence={presence} onPresence={()=>setPresence(v=>!v)} focused={radio||!!landmark} radioFocused={radio} onBackToDrive={()=>{closeLandmark();setRadio(false)}} onFocusRadio={()=>{setListeningOnly(false);openRadio()}} carLabel={profile.label} locationName={nearbyLandmark?.name||district} capture={capturePostcard} shareUrl={shareUrl(location.origin,{station:audio.stationId,at:String(Math.round(state.current.distance%(route?.length||1))),time:night?'night':'sunset',cam:view}).replace('/cruise?',prototype?'/cruise/prototype?':'/cruise/os?')+`&car=${vehicle}&sunsetMinutes=${transitionSeconds/60}`} onShared={()=>metrics.record('postcard_share')} onAction={metrics.record}
    places={sourceCity?<OceanDrivePlaces/>:<><p>Explore the existing Miami route at your own pace. No missions or timers.</p>{frequencyEnabled&&<section><h3>Follow the Frequency / experiment</h3><p>A nearby architectural stop on the existing route. No music-based selection or route change.</p><button data-return-world disabled={!started||!route||listeningOnly||!guide.available} onClick={()=>{if(guide.choose()){closeLandmark();setRadio(false);setPaused(false)}}}>Take me somewhere</button><p>The guide works within 2 km of a documented Ocean Drive landmark. Elsewhere, keep exploring the coastal loop.</p></section>}{nearbyLandmark?<><h3>{nearbyLandmark.name}</h3><button data-return-world onClick={inspectLandmark}>Take a closer look</button><p>Landmark view parks the car. Use Back to drive to return.</p></>:<p>No landmark is within viewing distance. Keep cruising to discover Ocean Drive.</p>}<button data-return-world aria-pressed={mapOpen} onClick={()=>setMapOpen(v=>!v)}>{mapOpen?'Hide Miami map':'Show Miami map'}</button><p>Route anchors: {landmarkRegistry.landmarks.map(item=>item.name).join(', ')}. Buildings are original procedural approximations of documented locations.</p></>}
    settings={<><label>Driving pace<select aria-label="Driving pace" value={tone} onChange={e=>setTone(e.target.value as typeof tone)}><option value="cruise">Easy</option><option value="night-drive">Cruise</option><option value="midnight-run">Midnight</option></select></label><button aria-pressed={enhanced} onClick={()=>setEnhanced(v=>!v)}>{enhanced?'Cinematic glow on':'Cinematic glow off'}</button><button onClick={()=>void share()}>Share this drive</button>{shareNote&&<p role="status">{shareNote}</p>}<button onClick={()=>{void document.documentElement.requestFullscreen?.().catch(()=>{})}}>Fullscreen</button><details><summary>Cast to a TV</summary><p>In Chrome, choose Cast, save and share, then Cast. Select Cast tab and a display on the same Wi-Fi. Chrome owns the device picker; this page provides instructions.</p><a href="https://support.google.com/chrome/answer/3228332" target="_blank" rel="noreferrer">Chrome casting help</a></details><label><input type="checkbox" checked={presence} onChange={()=>setPresence(v=>!v)}/>Join anonymous cruiser presence</label><p>Optional live presence uses short-lived anonymous sessions; it counts opted-in active browser sessions, not unique people or multiplayer.</p><ExperienceMetricsControls metrics={metrics}/></>}
    credits={<>{look&&drive==='city'&&cityVariant!=='legacy'&&<p>Ocean Drive building and car models by <a href="https://github.com/StarKnightt/ocean-drive" target="_blank" rel="noreferrer">Prasenjit (StarKnightt)</a>, adapted under <a href="/real-miami/ocean-drive/game/LICENSE.txt" target="_blank" rel="noreferrer">MIT</a>. {sourceCity?'People and animations: Mixamo. Car interior normal maps: Poly Haven / CC0.':'Old City route, night lighting and driving remain in use.'}</p>}<p>Wrangler Jeep 2012 by <a href="https://sketchfab.com/3d-models/wrangler-jeep-2012-fd41538dbb6744b38d7037c4cc8b058f" target="_blank" rel="noreferrer">funassets</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Repaired windows, scaled exterior and custom interactive cabin.</p>{[COUNTACH_ATTRIBUTION,EIGHTIES_ATTRIBUTION,CLASSIC_ATTRIBUTION,DELOREAN_ATTRIBUTION].map(item=><p key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.name}</a> by {item.creator}, <a href={item.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Adapted materials, fitted cabin and interactive radio.</p>)}</>}
   />
  </>}
  {humanRadio&&<>
   {listeningOnly&&<div className="hr-listening-scene rf-scene"><span className="hr-eyebrow">BUENA ONDA CRUISE / RADIO</span><h1>Take the long way<br/>to good music.</h1><p>Real stations. Human selectors.<br/>{started?'The drive is parked. The radio stays with you.':'Just the radio. Take the drive whenever you like.'}</p>
    <div className="rf-now" aria-live="polite"><small>{audio.loading||audio.tuning?'Tuning in':audio.error?'Signal unavailable':audio.playing?'On air':'Paused'}</small><strong>{audio.station.name}</strong>{displayTitle&&<span>{displayTitle}</span>}</div>
    <div className="rf-controls"><button aria-label="Previous station" onClick={()=>seek(-1)}>←</button><button className="rf-play" aria-label={audio.requested?'Pause radio':'Play radio'} onClick={audio.toggle}>{audio.requested?'Pause':'Play'}</button><button aria-label="Next station" onClick={()=>seek(1)}>→</button></div>
    <div className="rf-presets" role="group" aria-label="Quick stations">{radioPresets.map(station=><button key={station.id} aria-pressed={audio.stationId===station.id} onClick={()=>{audio.selectStation(station.id);audio.start()}}>{station.name}</button>)}</div>
    <button className="rf-drive" onClick={backToDrive}>{started?'Back to the drive':'Take the drive'} <span aria-hidden="true">→</span></button></div>}
   {!listeningOnly&&<div className="hr-scene-actions"><button onClick={()=>setListeningOnly(true)}>Listen without 3D</button>{started&&<><button onClick={()=>setView(v=>v==='driver'?'chase':'driver')}> {view==='driver'?'Chase view':'Cockpit'}</button><button onClick={()=>setView(v=>v==='director'?'driver':'director')}>Director</button><button onClick={()=>setPaused(v=>!v)}>{paused?'Resume drive':'Park'}</button></>}</div>}
   {!cruiseOS&&<DiscoveryConsole onAction={experienceFirst?metrics.record:undefined} experienceMode={experienceFirst} sharePath={experienceFirst?'/cruise/experience':undefined} audio={audio} metadata={humanMetadata} credits={<><p>Wrangler Jeep 2012 by <a href="https://sketchfab.com/3d-models/wrangler-jeep-2012-fd41538dbb6744b38d7037c4cc8b058f" target="_blank" rel="noreferrer">funassets</a>, CC BY 4.0. Repaired windows, scaled exterior, custom cabin.</p>{[COUNTACH_ATTRIBUTION,EIGHTIES_ATTRIBUTION,CLASSIC_ATTRIBUTION,DELOREAN_ATTRIBUTION].map(item=><p key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.name}</a> by {item.creator}, <a href={item.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Adapted materials, fitted cabin and interactive radio.</p>)}</>} listeningOnly={listeningOnly} onListeningOnly={()=>setListeningOnly(v=>!v)} presence={presence} onPresence={()=>setPresence(v=>!v)} onFocusRadio={()=>{setListeningOnly(false);openRadio()}}/>}
  </>}
  {sourceCity?<a className="jn-map-credit" href="/real-miami/ocean-drive/game/LICENSE.txt" target="_blank" rel="noreferrer">Ocean Drive · StarKnightt · MIT</a>:<a className="jn-map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap contributors &middot; ODbL</a>}<details className="jn-credits"><summary>Credits & controls</summary><p>V: camera · R: radio · Space: park. The drive follows the road automatically.</p><p>Wrangler Jeep 2012 by <a href="https://sketchfab.com/3d-models/wrangler-jeep-2012-fd41538dbb6744b38d7037c4cc8b058f" target="_blank" rel="noreferrer">funassets</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Repaired windows, scaled exterior, custom interactive cabin.</p><p>Asphalt: Dimitrios Savva / Poly Haven, CC0. Plaster and paving: <a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">Poly Haven, CC0</a>. Radio plays directly from its stations.</p></details>
  <div className="jn-extra-credit"><details><summary>Car credits</summary><p><a href={DELOREAN_ATTRIBUTION.url} target="_blank" rel="noreferrer">{DELOREAN_ATTRIBUTION.name}</a> by {DELOREAN_ATTRIBUTION.creator}, <a href={DELOREAN_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Retuned materials, fitted cabin and interactive radio.</p><p><a href={COUNTACH_ATTRIBUTION.url} target="_blank" rel="noreferrer">{COUNTACH_ATTRIBUTION.name}</a> by {COUNTACH_ATTRIBUTION.creator}, <a href={COUNTACH_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Original cabin, compatible materials, fitted interactive radio.</p><p><a href={EIGHTIES_ATTRIBUTION.url} target="_blank" rel="noreferrer">{EIGHTIES_ATTRIBUTION.name}</a> by {EIGHTIES_ATTRIBUTION.creator}, <a href={EIGHTIES_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Original cabin, fitted interactive radio.</p><p><a href={CLASSIC_ATTRIBUTION.url} target="_blank" rel="noreferrer">{CLASSIC_ATTRIBUTION.name}</a> by {CLASSIC_ATTRIBUTION.creator}, <a href={CLASSIC_ATTRIBUTION.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>. Original convertible cabin, fitted interactive radio.</p></details></div>
 </main>
}
