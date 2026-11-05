'use client'
import {useGLTF} from '@react-three/drei'
import {useFrame,useThree} from '@react-three/fiber'
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js'
import {useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import type {RideCameraProfile} from '../../../lib/real-miami/ride-vehicles'
import PhysicalRadio from '../vehicle/PhysicalRadio'
import GreenDeckRadio from '../vehicle/GreenDeckRadio'
import {RollingWheels,rigRollingWheels} from '../vehicle/rollingWheels'
import {useCockpit} from '../vehicle/CockpitContext'
import {pulse} from '../master/pulse'
import {rigCountachSteering} from '../vehicle/countachSteering'
import {addGlints,nightEnvironment,nightPaint,paintMaterials} from '../vehicle/nightPaint'
import {addLampGlow,lampUniforms} from '../vehicle/carLamps'
import {hideRearviewMirror} from '../vehicle/hideRearviewMirror'

export const COUNTACH_ATTRIBUTION={
 name:'Lamborghini Countach 5000QV',creator:'Randomness (@throwbackthursdaymodels)',
 url:'https://sketchfab.com/3d-models/lamborghini-countach-5000qv-2f02b54e01fc428e8b19759c5970f882',
 licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
}
export const COUNTACH_CAMERA_PROFILE:RideCameraProfile={
 label:'Countach 5000QV',driver:[-.34,.79,.15],driverPortrait:[-.27,.80,.22],
 target:[-.34,.59,-3.2],targetPortrait:[-.27,.57,-3.2],
 radioPosition:[0,.91,.02],radioTarget:[0,.72,-.48],radioFov:34,radioPortraitFov:55,
 chase:[-1.0,2.1,7.2],chasePortrait:[-.5,2.4,8.2],chaseTarget:[0,.56,0],
}
function CountachSpectrum(){
 const bars=useRef<T.InstancedMesh>(null),matrix=useMemo(()=>new T.Object3D(),[])
 useEffect(()=>{if(bars.current){for(let i=0;i<24;i++)bars.current.setColorAt(i,new T.Color(i<15?'#89c6a5':i<21?'#d1af69':'#ce8069'));bars.current.instanceColor!.needsUpdate=true}},[])
 useFrame(()=>{const mesh=bars.current;if(!mesh)return;for(let i=0;i<24;i++){const level=pulse.source==='live'?pulse.spectrum[i]:0,h=.002+Math.min(1,Math.max(0,level))*.024;matrix.position.set((i-11.5)*.008,-.012+h/2,.006);matrix.scale.set(.0055,h,.002);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix)}mesh.instanceMatrix.needsUpdate=true})
 return <group position={[0,.665,-.442]} name="CountachLiveSpectrum"><mesh><boxGeometry args={[.21,.035,.009]}/><meshStandardMaterial color="#0a0d0d" roughness={.8}/></mesh><instancedMesh ref={bars} args={[undefined,undefined,24]} frustumCulled={false}><boxGeometry args={[1,1,1]}/><meshBasicMaterial toneMapped={false}/></instancedMesh></group>
}
/** Same licensed model, compressed for delivery (meshopt geometry, KTX2 ETC1S/UASTC textures; 16.24 MB -> 4.54 MB).
 * Scoped to /cruise/prototype; `?glb=source` loads the original file there for comparison. */
const COUNTACH_SOURCE='/real-miami/vehicle/countach-1988/countach.glb',COUNTACH_COMPRESSED='/real-miami/vehicle/countach-1988/countach-opt.glb'
const countachUrl=()=>typeof window!=='undefined'&&(window.location.pathname==='/cruise'||window.location.pathname==='/cruise/prototype')&&new URLSearchParams(window.location.search).get('glb')!=='source'?COUNTACH_COMPRESSED:COUNTACH_SOURCE
let ktx2:KTX2Loader|null=null
/** Basis transcoder is served locally; no CDN at runtime. */
const withKTX2=(gl:T.WebGLRenderer)=>(loader:{setKTX2Loader:(l:KTX2Loader)=>unknown})=>{if(!ktx2)ktx2=new KTX2Loader().setTranscoderPath('/real-miami/basis/').detectSupport(gl);loader.setKTX2Loader(ktx2)}
/** Exact licensed source exterior and cabin. Existing head-unit controls share
 * Cruise's mounted audio owner; this adapter creates no playback instance. */
export default function Countach({state,cockpit,onReady,feel=false,paint=false}:{state:MutableRefObject<NightState>;cockpit:boolean;onReady:()=>void;feel?:boolean;paint?:boolean}){
 const Radio=paint?GreenDeckRadio:PhysicalRadio
 const gl=useThree(s=>s.gl),[url]=useState(countachUrl),asset=useGLTF(url,false,true,withKTX2(gl) as never),controls=useCockpit()
 const root=useRef<T.Group>(null),headBeam=useRef<T.SpotLight>(null),brakeGlow=useRef<T.PointLight>(null),body=useRef<T.Group>(null),spin=useMemo(()=>new T.Quaternion(),[]),steeringAxis=useMemo(()=>new T.Vector3(0,0,1),[])
 const vehicle=useMemo(()=>{
  const scene=asset.scene.clone(true),owned=new Set<T.Material>(),glazing:T.Mesh[]=[]
  // Source glTF already converts Z-up to Y-up; nose is negative source X.
  scene.rotation.y-=Math.PI/2;scene.updateMatrixWorld(true)
  const bounds=new T.Box3().setFromObject(scene),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),scale=4.14/size.z
  scene.scale.multiplyScalar(scale);scene.position.set(-center.x*scale,-bounds.min.y*scale+.015,-center.z*scale)
  const rearviewGeometry=hideRearviewMirror(scene,'Object_33',new T.Box3(new T.Vector3(-.11,.94,-.34),new T.Vector3(.10,1.02,-.27)))
  scene.traverse(o=>{if(o instanceof T.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m.name==='Meshpart24Mtl'))glazing.push(o);const clone=(material:T.Material)=>{const copy=material.clone();owned.add(copy);return copy};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material)}})
  const wheels=rigRollingWheels(scene,/^Meshpart2Mtl$/)
  if(feel)owned.forEach(material=>{if(material instanceof T.MeshStandardMaterial){if(material.name==='Meshpart2Mtl'){material.transparent=false;material.opacity=1;material.depthWrite=true;material.alphaTest=0;material.roughness=.94;material.metalness=0;material.needsUpdate=true}if(material.name==='Meshpart18Mtl'){material.roughness=.86;material.envMapIntensity=.4}}})
  // Look v2: black clearcoat body (Meshpart19), dark trim for the mirror/hub greys (Meshpart3, was a flat
  // light slab in the cabin) and glints on the rims (Fri1). Source materials are swapped on our clones only.
  if(paint){const env=nightEnvironment(gl),swap=new Map<T.Material,T.Material>()
   owned.forEach(material=>{if(!(material instanceof T.MeshStandardMaterial))return
    if(material.name==='Meshpart19Mtl'){const next=nightPaint(material,env);swap.set(material,next)}
    if(material.name==='Meshpart3Mtl'){material.color.set('#15181c');material.metalness=.7;material.roughness=.32;material.envMap=env;material.envMapIntensity=.9;addGlints(material,.7);paintMaterials.add(material)}
    // Lamp atlas: headlamps, tail and brake lenses glow in place (carLamps.ts); F1 is the front bumper lamp strip
    // (the 5000QV's pop-up headlamps stay closed in this model).
    if(material.name==='Meshpart17Mtl'||material.name==='Meshpart26Mtl'||material.name==='F1Mtl')addLampGlow(material)
    if(material.name==='Fri1Mtl'){material.color.set('#c9cdd3');material.metalness=.92;material.roughness=.2;material.envMap=env;addGlints(material,1.4);paintMaterials.add(material)}})
   // Rolling-wheel pivots hold cut-out body triangles outside `scene`; they swap too.
   for(const root of[scene,...wheels.wheels.map(w=>w.pivot)])root.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){const next=swap.get(o.material);if(next)o.material=next}})
   swap.forEach((next,old)=>{owned.delete(old);old.dispose();owned.add(next)})}
  const steering=feel?rigCountachSteering(scene):null
  return {scene,owned,wheels,glazing,steering,rearviewGeometry}
 },[asset.scene,feel,paint,gl])
 useEffect(()=>{vehicle.glazing.forEach(mesh=>{mesh.visible=!cockpit})},[vehicle,cockpit])
 useEffect(()=>{onReady()},[onReady])
 useEffect(()=>()=>{vehicle.owned.forEach(material=>{paintMaterials.delete(material as T.MeshStandardMaterial);material.dispose()});vehicle.steering?.dispose();vehicle.rearviewGeometry?.dispose()},[vehicle])
 useFrame(()=>{
  // Lamps follow the cockpit light switch (auto at night); brake lamps follow the driver's braking.
  if(paint&&root.current){const brake=state.current.brake||0,lit=controls?.lights?1:0;lampUniforms.uCarInv.value.copy(root.current.matrixWorld).invert();lampUniforms.uHead.value=lit;lampUniforms.uTail.value=lit;lampUniforms.uBrake.value=brake;if(brakeGlow.current)brakeGlow.current.intensity=lit*.35+brake*2.2}
  const m=feel?state.current.vehicleFeel:null;if(body.current){body.current.position.y=.55+(m?.heave||0);body.current.rotation.set(m?.pitch||0,0,m?.roll||0)}if(vehicle.steering&&m){spin.setFromAxisAngle(steeringAxis,m.steering);vehicle.steering.pivot.quaternion.copy(vehicle.steering.base).multiply(spin)}})
 useEffect(()=>{if(!feel||!new URLSearchParams(location.search).has('diagnostics'))return;const w=window as Window&{__countachFeel?:()=>unknown};w.__countachFeel=()=>({response:{...state.current.vehicleFeel},steeringTriangles:vehicle.steering?.triangles,steeringAngle:state.current.vehicleFeel?.steering,tires:[...vehicle.owned].filter(m=>m.name==='Meshpart2Mtl').map(m=>({transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite})),wheels:vehicle.wheels.wheels.map(w=>({center:w.pivot.position.toArray(),radius:w.radius,steer:w.pivot.rotation.y}))});return()=>{delete w.__countachFeel}},[vehicle,feel,state])
 useEffect(()=>{if(!new URLSearchParams(location.search).has('diagnostics'))return;const w=window as Window&{__countachMaterials?:()=>T.Material[]};w.__countachMaterials=()=>[...vehicle.owned];return()=>{delete w.__countachMaterials}},[vehicle])
 useEffect(()=>{if(!new URLSearchParams(location.search).has('diagnostics'))return;const w=window as Window&{__carLamps?:()=>unknown};w.__carLamps=()=>({lights:!!controls?.lights,head:lampUniforms.uHead.value,tail:lampUniforms.uTail.value,brake:lampUniforms.uBrake.value,glowing:[...vehicle.owned].filter(m=>m.customProgramCacheKey?.()==='car-lamps').map(m=>m.name)});return()=>{delete w.__carLamps}})
 const target=useMemo(()=>{const object=new T.Object3D();object.position.set(0,.2,-30);return object},[])
 return <group ref={root} name="Countach5000QV" userData={{speed:state.current.speed}}><group ref={body} name="VehicleSuspensionBody" position={[0,.55,0]}><group position={[0,-.55,0]}><primitive object={vehicle.scene} dispose={null}/>{vehicle.steering&&<primitive object={vehicle.steering.pivot}/>}
  <group visible={cockpit} name="CountachOriginalCabinRadioAdapter"><Radio position={[0,.72,-.48]} scale={.60} night/><CountachSpectrum/><pointLight position={[-.12,.94,.03]} color="#d5dee4" intensity={.65} distance={1.6} decay={2}/></group>
  <pointLight visible={!cockpit} position={[0,2.2,1.5]} color="#c2cbde" intensity={5} distance={6} decay={1.5}/>
  {paint&&<pointLight ref={brakeGlow} position={[0,.45,2.6]} color="#ff2a1a" intensity={0} distance={7} decay={1.6}/>}
  <primitive object={target}/>{/* Look v2: the beam comes from the raised pop-up pods (PopUpHeadlights) instead of the bumper. */}
  <spotLight ref={headBeam} position={paint?[0,.84,-1.42]:[0,.36,-1.91]} target={target} color="#ffe1b4" intensity={paint?0:controls?.lights?22:0} distance={paint?75:55} angle={.5} penumbra={.6} decay={1.3}/>
  {paint&&<PopUpHeadlights on={!!controls?.lights} beam={headBeam} cockpit={cockpit}/>}
 </group></group><RollingWheels rig={vehicle.wheels} state={state} feel={feel}/>{feel&&<RoadContact/>}</group>
}

function RoadContact(){
 const map=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,12,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.48)');gradient.addColorStop(.55,'rgba(0,0,0,.28)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);return new T.CanvasTexture(canvas)},[])
 useEffect(()=>()=>map.dispose(),[map])
 return <mesh name="CountachContactShadow" position={[0,.029,0]} rotation-x={-Math.PI/2} renderOrder={2}><planeGeometry args={[1.95,4.05]}/><meshBasicMaterial map={map} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} toneMapped={false}/></mesh>
}

/** Look v2 pop-up headlamps. The licensed model's pods are closed body panels, so two pods are added on the
 * front corners of the hood over the front wheel arches (Countach-measured: arch z -1.47..-0.86, hood ~0.73 m
 * at z -1.36, sloping ~18 deg to the nose). Down, the pod top lies flush in the same black clearcoat; with the lights on it rises ~10 cm in 0.9 s and
 * its two round lamps glow. The road beam (spot light) sits at the pods and fades in with them. */
function PopUpHeadlights({on,beam,cockpit}:{on:boolean;beam:MutableRefObject<T.SpotLight|null>;cockpit:boolean}){
 const gl=useThree(s=>s.gl)
 const pods=useMemo(()=>{
  const paint=nightPaint(new T.MeshStandardMaterial({name:'PopUpPodPaint'}),nightEnvironment(gl))
  const bezel=new T.MeshStandardMaterial({color:'#0b0c0e',roughness:.55,metalness:.3})
  const lamp=new T.MeshStandardMaterial({color:'#d9dde2',roughness:.15,metalness:.6,emissive:'#fff2dc',emissiveIntensity:0,toneMapped:false})
  // 5000QV proportions: a shallow 34 cm pod per side, two ~9 cm lamps, ~10 cm rise.
  const box=new T.BoxGeometry(.34,.12,.22),disc=new T.CircleGeometry(.046,28),rim=new T.RingGeometry(.046,.056,28)
  const make=(side:number)=>{
   const hinge=new T.Group();hinge.position.set(side*.64,.728,-1.36);hinge.rotation.x=-.32
   const pod=new T.Group();hinge.add(pod)
   const body=new T.Mesh(box,paint);pod.add(body)
   const face=new T.Group();face.position.set(0,0,-.111);face.rotation.x=.32;pod.add(face)
   for(const x of[-.078,.078]){const l=new T.Mesh(disc,lamp);l.position.set(x,0,-.002);l.rotation.y=Math.PI;face.add(l);const r=new T.Mesh(rim,bezel);r.position.set(x,0,-.001);r.rotation.y=Math.PI;face.add(r)}
   return {hinge,pod}
  }
  return {paint,bezel,lamp,box,disc,rim,sides:[make(-1),make(1)],lift:0}
 },[gl])
 useEffect(()=>()=>{pods.paint.dispose();pods.bezel.dispose();pods.lamp.dispose();pods.box.dispose();pods.disc.dispose();pods.rim.dispose()},[pods])
 useFrame((_,delta)=>{
  // Motor-driven: rise in ~0.9 s, lamps light once mostly up.
  pods.lift=T.MathUtils.clamp(pods.lift+(on?1:-1)*delta/.9,0,1)
  const ease=pods.lift*pods.lift*(3-2*pods.lift),glow=T.MathUtils.clamp((pods.lift-.6)/.4,0,1)
  for(const side of pods.sides)side.pod.position.y=-.062+ease*.1
  pods.lamp.emissiveIntensity=glow*2.6
  if(beam.current)beam.current.intensity=glow*40
 })
 // Hidden from the driver's seat: the pods only sit in the sightline over the hood there.
 return <group name="CountachPopUpHeadlights" visible={!cockpit}>{pods.sides.map((side,i)=><primitive key={i} object={side.hinge}/>)}</group>
}
