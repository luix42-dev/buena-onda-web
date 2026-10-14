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

export const CLASSIC_ATTRIBUTION={
 name:'1959 Cadillac El Dorado Biarritz',creator:'DisneyCars',
 url:'https://sketchfab.com/3d-models/1959-cadillac-el-dorado-biarritz-6b95a4fda1f44b07b65c5fdfc858627c',
 licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
}
export const CLASSIC_CAMERA_PROFILE:RideCameraProfile={
 label:'Cadillac Biarritz 1959',driver:[-.50,1.12,-.12],driverPortrait:[-.08,1.16,.20],
 target:[-.42,.73,-4],targetPortrait:[.08,.64,-4],
 radioPosition:[.12,1.00,-.22],radioTarget:[.12,.773,-.744],radioFov:34,radioPortraitFov:70,
 chase:[-1.25,3.0,8.9],chasePortrait:[-.65,3.2,10.3],chaseTarget:[0,.69,0],
}

function ClassicSpectrum(){
 const bars=useRef<T.InstancedMesh>(null),matrix=useMemo(()=>new T.Object3D(),[])
 useEffect(()=>{if(bars.current){for(let i=0;i<24;i++)bars.current.setColorAt(i,new T.Color(i<15?'#8acaad':i<21?'#d6b775':'#ca826c'));bars.current.instanceColor!.needsUpdate=true}},[])
 useFrame(()=>{const mesh=bars.current;if(!mesh)return
  for(let i=0;i<24;i++){const level=pulse.source==='live'?pulse.spectrum[i]:0,h=.002+Math.min(1,Math.max(0,level))*.027;matrix.position.set((i-11.5)*.012,-.014+h/2,.006);matrix.scale.set(.009,h,.002);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix)}
  mesh.instanceMatrix.needsUpdate=true
 })
 return <group name="CadillacLiveSpectrum" position={[.12,.710,-.750]}>
  <mesh><boxGeometry args={[.32,.04,.009]}/><meshStandardMaterial color="#111615" roughness={.75}/></mesh>
  <instancedMesh ref={bars} args={[undefined,undefined,24]} frustumCulled={false}><boxGeometry args={[1,1,1]}/><meshBasicMaterial toneMapped={false}/></instancedMesh>
 </group>
}

/** The licensed model is already a convertible with its native white cabin.
 * No roof cutting or procedural replacement cabin is used.
 */
export default function ClassicConvertible({state,cockpit,onReady}:{state:MutableRefObject<NightState>;cockpit:boolean;onReady:()=>void}){
 const asset=useGLTF('/real-miami/vehicle/cadillac-1959/cadillac.glb'),controls=useCockpit()
 const vehicle=useMemo(()=>{
  const scene=asset.scene.clone(true),owned=new Set<T.Material>(),glazing:T.Mesh[]=[]
  scene.updateMatrixWorld(true)
  const bounds=new T.Box3().setFromObject(scene),center=bounds.getCenter(new T.Vector3())
  // Official OBJ-derived source uses large scene units and an offset origin.
  // Its windshield/front hood already face -Z. Normalize to 5.715m length.
  const scale=5.715/(bounds.max.z-bounds.min.z)
  scene.scale.multiplyScalar(scale);scene.position.set(-center.x*scale,-bounds.min.y*scale+.015,-center.z*scale)
  scene.traverse(o=>{if(o instanceof T.Mesh){
   const sources=Array.isArray(o.material)?o.material:[o.material]
   if(sources.some(m=>m.name==='Meshescadillackit00roofa0011Mtl'||m.name==='Meshescadillackit00frontwindowa0061Mtl'))glazing.push(o)
   const clone=(m:T.Material)=>{const copy=m.clone();owned.add(copy);return copy}
   o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material)
  }})
  const wheels=rigRollingWheels(scene,/^Tire1Mtl$/)
  return{scene,owned,wheels,glazing}
 },[asset.scene])
 const target=useMemo(()=>{const object=new T.Object3D();object.position.set(0,.25,-32);return object},[])
 useEffect(()=>{vehicle.glazing.forEach(mesh=>{mesh.visible=!cockpit})},[vehicle,cockpit])
 useEffect(()=>{onReady()},[onReady])
 useEffect(()=>()=>vehicle.owned.forEach(material=>material.dispose()),[vehicle])
 return <group name="Cadillac1959ConvertibleRide" userData={{speed:state.current.speed}}>
  <primitive object={vehicle.scene} dispose={null}/><RollingWheels rig={vehicle.wheels} state={state}/>
  <group name="CadillacNativeRadioAdapter" visible={cockpit}>
   {/* Native dash lip protrudes to Z≈−.84. Fit the adapter on its cabin-facing
       side; all LCD, controls and spectrum corner rays clear source geometry. */}
   <PhysicalRadio position={[.12,.790,-.780]} scale={.94} night/>
   <ClassicSpectrum/>
   <pointLight position={[0,1.22,-.35]} color="#e3dbc9" intensity={.70} distance={2.3} decay={2}/>
  </group>
  <pointLight visible={!cockpit} position={[0,2.6,1.8]} color="#d8d9de" intensity={6} distance={8} decay={1.5}/>
  <primitive object={target}/>
  <spotLight position={[0,.53,-2.40]} target={target} color="#ffe1b4" intensity={controls?.lights?22:0} distance={55} angle={.55} penumbra={.65} decay={1.3}/>
 </group>
}
