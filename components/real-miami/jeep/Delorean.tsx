'use client'
import {useGLTF} from '@react-three/drei'
import {useEffect,useMemo,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import type {RideCameraProfile} from '../../../lib/real-miami/ride-vehicles'
import PhysicalRadio from '../vehicle/PhysicalRadio'
import {RollingWheels,rigRollingWheels} from '../vehicle/rollingWheels'
import {useCockpit} from '../vehicle/CockpitContext'

export const DELOREAN_ATTRIBUTION={
 name:'DMC DeLorean',creator:'tiunov.se',
 url:'https://sketchfab.com/3d-models/dmc-delorean-4d4af57068b146cca160ed2691c05633',
 licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
}
/** Source is metres, Y-up after its root matrix, nose toward -Z. Scaled to the real 4.27 m body. */
const SCALE=.94,LIFT=.72*SCALE+.015
export const DELOREAN_CAMERA_PROFILE:RideCameraProfile={
 label:'DeLorean DMC-12',driver:[-.39,1.0,.26],driverPortrait:[-.33,1.01,.32],
 target:[-.39,.84,-3.2],targetPortrait:[-.33,.82,-3.2],
 radioPosition:[0,1.02,.40],radioTarget:[.08,.82,-.20],radioFov:36,radioPortraitFov:56,
 chase:[-1.0,2.0,7.0],chasePortrait:[-.5,2.3,8.0],chaseTarget:[0,.55,0],
}
/** The licensed model is an exterior with doors and a steering wheel but no cabin. A plain
 * period cabin (dash, binnacle, console, two seats) is fitted only while the camera is inside. */
function Cabin(){
 const plastic='#16171a',leather='#3b3d42'
 return <group name="DeloreanFittedCabin">
  <mesh position={[0,.66,-.58]}><boxGeometry args={[1.46,.16,.42]}/><meshStandardMaterial color={plastic} roughness={.8}/></mesh>
  <mesh position={[-.39,.77,-.5]} rotation-x={-.25}><boxGeometry args={[.42,.1,.2]}/><meshStandardMaterial color={plastic} roughness={.7}/></mesh>
  <mesh position={[0,.42,-.15]}><boxGeometry args={[.26,.36,.75]}/><meshStandardMaterial color={plastic} roughness={.85}/></mesh>
  {[-.39,.39].map(x=><group key={x} position={[x,0,.32]}>
   <mesh position={[0,.36,0]}><boxGeometry args={[.5,.12,.5]}/><meshStandardMaterial color={leather} roughness={.9}/></mesh>
   <mesh position={[0,.66,.24]} rotation-x={-.22}><boxGeometry args={[.5,.6,.1]}/><meshStandardMaterial color={leather} roughness={.9}/></mesh>
  </group>)}
 </group>
}
export default function Delorean({state,cockpit,onReady}:{state:MutableRefObject<NightState>;cockpit:boolean;onReady:()=>void}){
 const asset=useGLTF('/real-miami/vehicle/delorean-1981/delorean.glb'),controls=useCockpit()
 const vehicle=useMemo(()=>{
  const scene=asset.scene.clone(true),owned=new Set<T.Material>(),glazing:T.Mesh[]=[]
  scene.scale.multiplyScalar(SCALE);scene.position.set(0,LIFT,0)
  scene.traverse(o=>{if(!(o instanceof T.Mesh))return
   const tune=(source:T.Material)=>{const m=source.clone() as T.MeshStandardMaterial;owned.add(m)
    // Brushed stainless body; tinted glass you can see into; lit lamps.
    if(m.name==='kuzov'){m.color.set('#b9bdc3');m.metalness=.92;m.roughness=.36}
    if(m.name==='material_4'){m.transparent=true;m.opacity=.38;m.color.set('#0d1b26');m.roughness=.05;m.metalness=.3;m.depthWrite=false}
    if(m.name==='material_10'){m.emissive.set('#fff1d0');m.emissiveIntensity=2.2}
    if(m.name==='stop'){m.emissive.set('#ff1f3d');m.emissiveIntensity=2.4}
    return m}
   const sources=Array.isArray(o.material)?o.material:[o.material]
   if(sources.some(m=>m.name==='material_4'))glazing.push(o)
   o.material=Array.isArray(o.material)?o.material.map(tune):tune(o.material)})
  const wheels=rigRollingWheels(scene,/^material_13$/)
  return {scene,owned,glazing,wheels}
 },[asset.scene])
 useEffect(()=>{vehicle.glazing.forEach(mesh=>{mesh.visible=!cockpit})},[vehicle,cockpit])
 useEffect(()=>{onReady()},[onReady])
 useEffect(()=>()=>vehicle.owned.forEach(material=>material.dispose()),[vehicle])
 const target=useMemo(()=>{const object=new T.Object3D();object.position.set(0,.2,-30);return object},[])
 return <group name="DeloreanDMC12" userData={{speed:state.current.speed}}><primitive object={vehicle.scene} dispose={null}/><RollingWheels rig={vehicle.wheels} state={state}/>
  <group visible={cockpit} name="DeloreanCabinRadioAdapter"><Cabin/><PhysicalRadio position={[.08,.82,-.20]} scale={.6} night/><pointLight position={[-.1,.95,0]} color="#cfd8e6" intensity={.6} distance={1.6} decay={2}/></group>
  <pointLight visible={!cockpit} position={[0,2.1,1.5]} color="#c2cbde" intensity={5} distance={6} decay={1.5}/>
  <primitive object={target}/><spotLight position={[0,.45,-2.05]} target={target} color="#ffe1b4" intensity={controls?.lights?22:0} distance={55} angle={.55} penumbra={.65} decay={1.3}/>
 </group>
}
