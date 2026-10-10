'use client'
import {useFrame,useThree} from '@react-three/fiber'
import {useRef,type MutableRefObject} from 'react'
import * as T from 'three'
import type {DriveState} from './DriveController'
export type AdSample={id:string;width:number;height:number;distance:number;angle:number;visible:boolean;continuous:number;maxContinuous:number;occluded:boolean;blockedBy?:string}
export type StreetSample={fps:number;p95:number;calls:number;triangles:number;textures:number;heapMB:number|null;distance:number;speed:number;camera:string;ads:AdSample[]}
declare global{interface Window{__street?:StreetSample;__streetSamples?:StreetSample[];__streetEvents?:{type:string;id:string;time:number}[];__streetDrive?:DriveState}}
export function event(type:string,id:string){window.__streetEvents=[...(window.__streetEvents||[]),{type,id,time:performance.now()}].slice(-500)}
export default function StreetMetrics({drive,mode,onSample}:{drive:MutableRefObject<DriveState>;mode:string;onSample:(s:StreetSample)=>void}){
 const {scene,camera,gl,size}=useThree(),measure=useRef(typeof location!=='undefined'&&new URLSearchParams(location.search).has('metrics')),acc=useRef(0),frames=useRef<number[]>([]),last=useRef(0),history=useRef(new Map<string,{continuous:number;max:number;lastVisible:boolean}>()),previous=useRef(mode),previousDistance=useRef(0),qualified=useRef(new Set<string>())
 useFrame((_,dt)=>{
  window.__streetDrive=drive.current
  if(drive.current.distance<previousDistance.current)qualified.current.clear()
  if(previous.current!==mode||drive.current.distance<previousDistance.current){history.current.clear();previous.current=mode;frames.current=[];acc.current=0;last.current=0}
  previousDistance.current=drive.current.distance
  acc.current+=dt;frames.current.push(dt*1000);if(acc.current<.25)return
  const interval=Math.min(acc.current,.4),ads:AdSample[]=[],ray=new T.Raycaster(),objects:T.Mesh[]=[]
  // Sign exposure sampling (raycasts) only runs for measurement sessions: ?metrics=1.
  if(measure.current){scene.updateMatrixWorld();scene.traverseVisible(o=>{if(o instanceof T.Mesh)objects.push(o)})}
  for(const mesh of objects.filter(o=>o.userData.adId)){
   const id=String(mesh.userData.adId);mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox!;const center=b.getCenter(new T.Vector3()).applyMatrix4(mesh.matrixWorld)
   const normal=new T.Vector3(0,0,1).transformDirection(mesh.matrixWorld),toEye=camera.position.clone().sub(center).normalize(),cos=normal.dot(toEye),distance=center.distanceTo(camera.position)
   const points=[new T.Vector3(b.min.x,b.min.y,b.max.z),new T.Vector3(b.max.x,b.min.y,b.max.z),new T.Vector3(b.min.x,b.max.y,b.max.z),new T.Vector3(b.max.x,b.max.y,b.max.z)].map(p=>p.applyMatrix4(mesh.matrixWorld))
   const projected=points.map(p=>p.clone().project(camera)),width=(Math.max(...projected.map(p=>p.x))-Math.min(...projected.map(p=>p.x)))*size.width/2,height=(Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y)))*size.height/2
   const rect=gl.domElement.getBoundingClientRect()
   const hud=document.querySelector('.mm-status')?.getBoundingClientRect()
   const sx=projected.map(p=>rect.left+(p.x+1)*size.width/2),sy=projected.map(p=>rect.top+(1-p.y)*size.height/2)
   const hudOverlap=hud&&Math.max(...sx)>hud.left&&Math.min(...sx)<hud.right&&Math.max(...sy)>hud.top&&Math.min(...sy)<hud.bottom
   const onScreen=!hudOverlap&&!document.hidden&&!document.querySelector('[role="dialog"]')&&projected.every(p=>{const px=rect.left+(p.x+1)*size.width/2,py=rect.top+(1-p.y)*size.height/2;return Math.abs(p.x)<.98&&Math.abs(p.y)<.98&&p.z>-1&&p.z<1&&px>=0&&px<innerWidth&&py>=0&&py<innerHeight})
   let occluded=false,blockedBy=""
   if(onScreen&&cos>.35){for(const p of [...points.map(p=>p.lerp(center,.12)),center]){const direction=p.clone().sub(camera.position);ray.set(camera.position,direction.clone().normalize());ray.far=Math.max(0,direction.length()-.01);const hit=ray.intersectObjects(objects,false).find(h=>{const m=(h.object as T.Mesh).material;return (Array.isArray(m)?m:[m]).some(x=>x.visible&&(!x.transparent||x.opacity>.5))});if(hit&&hit.object!==mesh){occluded=true;blockedBy=hit.object.name+":"+(hit.object as T.Mesh).geometry.type+":"+hit.distance.toFixed(2)+"/"+direction.length().toFixed(2);break}}}
   const visible=onScreen&&cos>.35&&width>=Math.min(130,size.width*.25)&&height>=28&&!occluded
   const h=history.current.get(id)||{continuous:0,max:0,lastVisible:false},nowVisible=visible&&!drive.current.paused
   h.continuous=nowVisible&&h.lastVisible?h.continuous+interval:0;h.lastVisible=nowVisible;h.max=Math.max(h.max,h.continuous)
   if(h.continuous>=5&&!qualified.current.has(id)){event('visibility-qualified',id);qualified.current.add(id)}history.current.set(id,h)
   ads.push({id,width,height,distance,angle:Math.acos(T.MathUtils.clamp(cos,-1,1))*180/Math.PI,visible,continuous:h.continuous,maxContinuous:h.max,occluded,blockedBy})
  }
  if(performance.now()-last.current>950){const sorted=[...frames.current].sort((a,b)=>a-b),memory=(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory;const s:StreetSample={fps:1000/(frames.current.reduce((a,b)=>a+b,0)/frames.current.length),p95:sorted[Math.floor(sorted.length*.95)]||0,calls:gl.info.render.calls,triangles:gl.info.render.triangles,textures:gl.info.memory.textures,heapMB:memory?memory.usedJSHeapSize/1048576:null,distance:drive.current.distance,speed:drive.current.paused?0:drive.current.speed,camera:mode,ads};window.__street=s;window.__streetSamples=[...(window.__streetSamples||[]),s].slice(-600);onSample(s);last.current=performance.now();frames.current=[]}acc.current=0
 })
 return null
}
