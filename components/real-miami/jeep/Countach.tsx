'use client'
import {useGLTF} from '@react-three/drei'
import {useFrame} from '@react-three/fiber'
import {useEffect,useMemo,useRef,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import type {RideCameraProfile} from '../../../lib/real-miami/ride-vehicles'
import PhysicalRadio from '../vehicle/PhysicalRadio'
import {useCockpit} from '../vehicle/CockpitContext'
import {pulse} from '../master/pulse'

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
/** Exact licensed source exterior and cabin. Existing head-unit controls share
 * Cruise's mounted audio owner; this adapter creates no playback instance. */
export default function Countach({state,cockpit,onReady}:{state:MutableRefObject<NightState>;cockpit:boolean;onReady:()=>void}){
 const asset=useGLTF('/real-miami/vehicle/countach-1988/countach.glb'),controls=useCockpit()
 const vehicle=useMemo(()=>{
  const scene=asset.scene.clone(true),owned=new Set<T.Material>(),glazing:T.Mesh[]=[]
  // Source glTF already converts Z-up to Y-up; nose is negative source X.
  scene.rotation.y-=Math.PI/2;scene.updateMatrixWorld(true)
  const bounds=new T.Box3().setFromObject(scene),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),scale=4.14/size.z
  scene.scale.multiplyScalar(scale);scene.position.set(-center.x*scale,-bounds.min.y*scale+.015,-center.z*scale)
  scene.traverse(o=>{if(o instanceof T.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m.name==='Meshpart24Mtl'))glazing.push(o);const clone=(material:T.Material)=>{const copy=material.clone();owned.add(copy);return copy};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material)}})
  return {scene,owned,glazing}
 },[asset.scene])
 useEffect(()=>{vehicle.glazing.forEach(mesh=>{mesh.visible=!cockpit})},[vehicle,cockpit])
 useEffect(()=>{onReady()},[onReady])
 useEffect(()=>()=>vehicle.owned.forEach(material=>material.dispose()),[vehicle])
 const target=useMemo(()=>{const object=new T.Object3D();object.position.set(0,.2,-30);return object},[])
 return <group name="Countach5000QV" userData={{speed:state.current.speed}}><primitive object={vehicle.scene} dispose={null}/>
  <group visible={cockpit} name="CountachOriginalCabinRadioAdapter"><PhysicalRadio position={[0,.72,-.48]} scale={.60} night/><CountachSpectrum/><pointLight position={[-.12,.94,.03]} color="#d5dee4" intensity={.65} distance={1.6} decay={2}/></group>
  <pointLight visible={!cockpit} position={[0,2.2,1.5]} color="#c2cbde" intensity={5} distance={6} decay={1.5}/>
  <primitive object={target}/><spotLight position={[0,.36,-1.91]} target={target} color="#ffe1b4" intensity={controls?.lights?22:0} distance={55} angle={.55} penumbra={.65} decay={1.3}/>
 </group>
}
