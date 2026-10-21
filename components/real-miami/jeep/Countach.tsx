'use client'
import {useGLTF} from '@react-three/drei'
import {useFrame,useThree} from '@react-three/fiber'
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js'
import {useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import type {RideCameraProfile} from '../../../lib/real-miami/ride-vehicles'
import PhysicalRadio from '../vehicle/PhysicalRadio'
import {RollingWheels,rigRollingWheels} from '../vehicle/rollingWheels'
import {useCockpit} from '../vehicle/CockpitContext'
import {pulse} from '../master/pulse'
import {rigCountachSteering} from '../vehicle/countachSteering'

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
const countachUrl=()=>typeof window!=='undefined'&&window.location.pathname==='/cruise/prototype'&&new URLSearchParams(window.location.search).get('glb')!=='source'?COUNTACH_COMPRESSED:COUNTACH_SOURCE
let ktx2:KTX2Loader|null=null
/** Basis transcoder is served locally; no CDN at runtime. */
const withKTX2=(gl:T.WebGLRenderer)=>(loader:{setKTX2Loader:(l:KTX2Loader)=>unknown})=>{if(!ktx2)ktx2=new KTX2Loader().setTranscoderPath('/real-miami/basis/').detectSupport(gl);loader.setKTX2Loader(ktx2)}
/** Exact licensed source exterior and cabin. Existing head-unit controls share
 * Cruise's mounted audio owner; this adapter creates no playback instance. */
export default function Countach({state,cockpit,onReady,feel=false}:{state:MutableRefObject<NightState>;cockpit:boolean;onReady:()=>void;feel?:boolean}){
 const gl=useThree(s=>s.gl),[url]=useState(countachUrl),asset=useGLTF(url,false,true,withKTX2(gl) as never),controls=useCockpit()
 const body=useRef<T.Group>(null),spin=useMemo(()=>new T.Quaternion(),[]),steeringAxis=useMemo(()=>new T.Vector3(0,0,1),[])
 const vehicle=useMemo(()=>{
  const scene=asset.scene.clone(true),owned=new Set<T.Material>(),glazing:T.Mesh[]=[]
  // Source glTF already converts Z-up to Y-up; nose is negative source X.
  scene.rotation.y-=Math.PI/2;scene.updateMatrixWorld(true)
  const bounds=new T.Box3().setFromObject(scene),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),scale=4.14/size.z
  scene.scale.multiplyScalar(scale);scene.position.set(-center.x*scale,-bounds.min.y*scale+.015,-center.z*scale)
  scene.traverse(o=>{if(o instanceof T.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m.name==='Meshpart24Mtl'))glazing.push(o);const clone=(material:T.Material)=>{const copy=material.clone();owned.add(copy);return copy};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material)}})
  const wheels=rigRollingWheels(scene,/^Meshpart2Mtl$/)
  if(feel)owned.forEach(material=>{if(material instanceof T.MeshStandardMaterial){if(material.name==='Meshpart2Mtl'){material.transparent=false;material.opacity=1;material.depthWrite=true;material.alphaTest=0;material.roughness=.94;material.metalness=0;material.needsUpdate=true}if(material.name==='Meshpart18Mtl'){material.roughness=.86;material.envMapIntensity=.4}}})
  const steering=feel?rigCountachSteering(scene):null
  return {scene,owned,wheels,glazing,steering}
 },[asset.scene,feel])
 useEffect(()=>{vehicle.glazing.forEach(mesh=>{mesh.visible=!cockpit})},[vehicle,cockpit])
 useEffect(()=>{onReady()},[onReady])
 useEffect(()=>()=>{vehicle.owned.forEach(material=>material.dispose());vehicle.steering?.dispose()},[vehicle])
 useFrame(()=>{const m=feel?state.current.vehicleFeel:null;if(body.current){body.current.position.y=.55+(m?.heave||0);body.current.rotation.set(m?.pitch||0,0,m?.roll||0)}if(vehicle.steering&&m){spin.setFromAxisAngle(steeringAxis,m.steering);vehicle.steering.pivot.quaternion.copy(vehicle.steering.base).multiply(spin)}})
 useEffect(()=>{if(!feel||!new URLSearchParams(location.search).has('diagnostics'))return;const w=window as Window&{__countachFeel?:()=>unknown};w.__countachFeel=()=>({response:{...state.current.vehicleFeel},steeringTriangles:vehicle.steering?.triangles,steeringAngle:state.current.vehicleFeel?.steering,tires:[...vehicle.owned].filter(m=>m.name==='Meshpart2Mtl').map(m=>({transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite})),wheels:vehicle.wheels.wheels.map(w=>({center:w.pivot.position.toArray(),radius:w.radius,steer:w.pivot.rotation.y}))});return()=>{delete w.__countachFeel}},[vehicle,feel,state])
 const target=useMemo(()=>{const object=new T.Object3D();object.position.set(0,.2,-30);return object},[])
 return <group name="Countach5000QV" userData={{speed:state.current.speed}}><group ref={body} position={[0,.55,0]}><group position={[0,-.55,0]}><primitive object={vehicle.scene} dispose={null}/>{vehicle.steering&&<primitive object={vehicle.steering.pivot}/>}
  <group visible={cockpit} name="CountachOriginalCabinRadioAdapter"><PhysicalRadio position={[0,.72,-.48]} scale={.60} night/><CountachSpectrum/><pointLight position={[-.12,.94,.03]} color="#d5dee4" intensity={.65} distance={1.6} decay={2}/></group>
  <pointLight visible={!cockpit} position={[0,2.2,1.5]} color="#c2cbde" intensity={5} distance={6} decay={1.5}/>
  <primitive object={target}/><spotLight position={[0,.36,-1.91]} target={target} color="#ffe1b4" intensity={controls?.lights?22:0} distance={55} angle={.55} penumbra={.65} decay={1.3}/>
 </group></group><RollingWheels rig={vehicle.wheels} state={state} feel={feel}/>{feel&&<RoadContact/>}</group>
}

function RoadContact(){
 const map=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,12,64,64,64);gradient.addColorStop(0,'rgba(0,0,0,.48)');gradient.addColorStop(.55,'rgba(0,0,0,.28)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);return new T.CanvasTexture(canvas)},[])
 useEffect(()=>()=>map.dispose(),[map])
 return <mesh name="CountachContactShadow" position={[0,.029,0]} rotation-x={-Math.PI/2} renderOrder={2}><planeGeometry args={[1.95,4.05]}/><meshBasicMaterial map={map} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} toneMapped={false}/></mesh>
}
