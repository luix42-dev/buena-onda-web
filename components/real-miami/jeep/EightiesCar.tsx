'use client'
import {useGLTF} from '@react-three/drei'
import {useFrame} from '@react-three/fiber'
import {useEffect,useMemo,useRef,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import type {RideCameraProfile} from '../../../lib/real-miami/ride-vehicles'
import PhysicalRadio from '../vehicle/PhysicalRadio'
import {RollingWheels,rigRollingWheels} from '../vehicle/rollingWheels'
import {useCockpit} from '../vehicle/CockpitContext'
import {pulse} from '../master/pulse'

export const EIGHTIES_ATTRIBUTION = {
 name:'Pontiac Fiero GT 1987',creator:'loadversus',
 url:'https://sketchfab.com/3d-models/pontiac-fiero-gt-1987-7ec4815d28124814bbbfb4fb80d6a619',
 licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
}
export const EIGHTIES_CAMERA_PROFILE:RideCameraProfile = {
 label:'Fiero GT 1987',driver:[-.43,1.055,.42],driverPortrait:[-.32,1.06,.50],
 target:[-.38,.30,-3.2],targetPortrait:[-.25,.27,-3.2],
 radioPosition:[0,.93,.18],radioTarget:[0,.715,-.34],radioFov:34,radioPortraitFov:58,
 chase:[-1.1,2.6,7.5],chasePortrait:[-.5,2.8,8.7],chaseTarget:[0,.68,0],
}

function NativeSpectrum(){
 const bars=useRef<T.InstancedMesh>(null),matrix=useMemo(()=>new T.Object3D(),[])
 useEffect(()=>{if(bars.current){for(let i=0;i<24;i++)bars.current.setColorAt(i,new T.Color(i<15?'#89c6a5':i<21?'#d1af69':'#ce8069'));bars.current.instanceColor!.needsUpdate=true}},[])
 useFrame(()=>{const mesh=bars.current;if(!mesh)return
  for(let i=0;i<24;i++){const level=pulse.source==='live'?pulse.spectrum[i]:0,h=.002+Math.min(1,Math.max(0,level))*.028;matrix.position.set((i-11.5)*.0093,-.014+h/2,.006);matrix.scale.set(.0065,h,.002);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix)}
  mesh.instanceMatrix.needsUpdate=true
 })
 return <group position={[0,.658,-.287]} name="FieroLiveSpectrum">
  <mesh><boxGeometry args={[.24,.04,.009]}/><meshStandardMaterial color="#0a0d0d" roughness={.8}/></mesh>
  <instancedMesh ref={bars} args={[undefined,undefined,24]} frustumCulled={false}><boxGeometry args={[1,1,1]}/><meshBasicMaterial toneMapped={false}/></instancedMesh>
 </group>
}

/** Native licensed cabin is retained. Only the existing interactive head unit
 * is fitted over the source stereo; the vehicle does not create audio owners.
 */
export default function EightiesCar({state,cockpit,onReady}:{state:MutableRefObject<NightState>;cockpit:boolean;onReady:()=>void}){
 const asset=useGLTF('/real-miami/vehicle/fiero-1987/fiero.glb'),controls=useCockpit()
 const vehicle=useMemo(()=>{
  const scene=asset.scene.clone(true),owned=new Set<T.Material>(),windows:T.Mesh[]=[]
  scene.updateMatrixWorld(true)
  const bounds=new T.Box3().setFromObject(scene),center=bounds.getCenter(new T.Vector3())
  // Source is already Y-up, front +Z. Bound normalization gives a 4.29m coupe.
  const scale=.77
  scene.rotation.y+=Math.PI;scene.scale.multiplyScalar(scale)
  scene.position.set(center.x*scale,-bounds.min.y*scale+.015,center.z*scale)
  scene.traverse(o=>{if(o instanceof T.Mesh){
   const clone=(material:T.Material)=>{const copy=material.clone();owned.add(copy);return copy}
   o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material)
   // Source front/side glazing is a distinct group. Preserve it in chase mode;
   // suppress its overlapping surfaces only while the camera is inside it.
   if(o.name.startsWith('Stekla'))windows.push(o)
  }})
  const wheels=rigRollingWheels(scene,/^Tires/)
  return {scene,owned,wheels,windows}
 },[asset.scene])
 const target=useMemo(()=>{const object=new T.Object3D();object.position.set(0,.3,-30);return object},[])
 useEffect(()=>{vehicle.windows.forEach(mesh=>{mesh.visible=!cockpit})},[vehicle,cockpit])
 useEffect(()=>{onReady()},[onReady])
 useEffect(()=>()=>vehicle.owned.forEach(material=>material.dispose()),[vehicle])
 return <group name="Fiero1987Ride" userData={{speed:state.current.speed}}>
  <primitive object={vehicle.scene} dispose={null}/><RollingWheels rig={vehicle.wheels} state={state}/>
  <group visible={cockpit} name="FieroNativeRadioAdapter">
   <PhysicalRadio position={[0,.73,-.34]} scale={.70} night/>
   <NativeSpectrum/>
   <pointLight position={[-.1,.97,.05]} color="#d5dee4" intensity={.75} distance={2.0} decay={2}/>
  </group>
  <pointLight visible={!cockpit} position={[0,2.5,1.5]} color="#c2cbde" intensity={6} distance={7} decay={1.5}/>
  <primitive object={target}/>
  <spotLight position={[0,.47,-1.92]} target={target} color="#ffe1b4" intensity={controls?.lights?22:0} distance={55} angle={.55} penumbra={.65} decay={1.3}/>
 </group>
}
