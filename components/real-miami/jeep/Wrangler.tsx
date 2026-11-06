'use client'
import {useGLTF, RoundedBox} from '@react-three/drei'
import {useFrame} from '@react-three/fiber'
import {useEffect,useMemo,useRef,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import {jeepTextures} from '../vehicle/jeepTextures'
import PhysicalRadio from '../vehicle/PhysicalRadio'
import {useCockpit} from '../vehicle/CockpitContext'
import {pulse} from '../master/pulse'

function Block({size,at,color='#191e20',radius=.018}:{size:[number,number,number];at:[number,number,number];color?:string;radius?:number}){return <RoundedBox args={size} position={at} radius={radius} smoothness={2}><meshStandardMaterial color={color} roughness={.82}/></RoundedBox>}
function Dial({texture,at,radius,needle}:{texture:T.Texture;at:[number,number,number];radius:number;needle?:React.RefObject<T.Group | null>}){return <group position={at}>
  <mesh rotation-x={Math.PI/2}><cylinderGeometry args={[radius+.012,radius+.012,.035,40]}/><meshStandardMaterial color="#090e10" roughness={.8}/></mesh>
  <mesh position-z={.02}><torusGeometry args={[radius+.002,.005,8,48]}/><meshStandardMaterial color="#686b64" metalness={.7} roughness={.3}/></mesh>
  <mesh position-z={.024}><circleGeometry args={[radius,48]}/><meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffe8ae" emissiveIntensity={.95} toneMapped={false}/></mesh>
  <group ref={needle} position-z={.027} rotation-z={.7}><mesh position-y={radius*.32}><boxGeometry args={[.003,radius*.83,.002]}/><meshBasicMaterial color="#ff784b"/></mesh><mesh position-z={.004}><circleGeometry args={[.007,16]}/><meshBasicMaterial color="#aaa991"/></mesh></group>
</group>}

function Spectrum(){const bars=useRef<(T.Mesh|null)[]>([]);useFrame(()=>{bars.current.forEach((m,i)=>{if(m){const level=pulse.source==='live'?pulse.spectrum[i]:0;m.scale.y=.04+level*.9;m.position.y=-.03+m.scale.y*.028}})});return <group position={[.31,.945,-.49]}>
  <Block size={[.43,.096,.023]} at={[0,0,0]} color="#080e11" radius={.006}/>
  {Array.from({length:24},(_,i)=><mesh key={i} ref={m=>{bars.current[i]=m}} position={[(i-11.5)*.015,0,.016]}><boxGeometry args={[.009,.056,.003]}/><meshBasicMaterial color={i<14?'#8cdbc2':i<20?'#f0c36b':'#ee8464'} toneMapped={false}/></mesh>)}
</group>}

export default function Wrangler({state,cockpit,onReady}:{state:MutableRefObject<NightState>;cockpit:boolean;onReady:()=>void}){
 const model=useGLTF('/real-miami/vehicle/wrangler/wrangler-web.glb'),maps=useMemo(jeepTextures,[])
 const exterior=useMemo(()=>{const scene=model.scene.clone(true);scene.traverse(o=>{if(o instanceof T.Mesh){const repair=(source:T.Material)=>{const m=source.clone();if(m instanceof T.MeshStandardMaterial && m.name!=='Repaired window glass'){m.transparent=false;m.opacity=1;m.depthWrite=true;m.roughness=.72;m.metalness=.12;m.normalScale.set(.3,.3);m.needsUpdate=true}return m};o.material=Array.isArray(o.material)?o.material.map(repair):repair(o.material)}});return scene},[model.scene])
 const speed=useRef<T.Group>(null),rpm=useRef<T.Group>(null),wheel=useRef<T.Group>(null),target=useMemo(()=>{const t=new T.Object3D();t.position.set(0,.1,-28);return t},[])
 const controls=useCockpit()
 useEffect(()=>{onReady();return()=>Object.values(maps).forEach(t=>t.dispose())},[maps,onReady])
 useEffect(()=>()=>exterior.traverse(o=>{if(o instanceof T.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())}),[exterior])
 useFrame(()=>{const s=state.current;if(speed.current)speed.current.rotation.z=Math.PI*.75-Math.min(s.speed*2.23694/100,1)*Math.PI*1.5;if(rpm.current)rpm.current.rotation.z=Math.PI*.75-(s.paused?0:.16+s.speed/65)*Math.PI*1.5;if(wheel.current)wheel.current.rotation.z=-(s.wheel||0)*1.7})
 return <group name="WranglerRide">
  <group visible={!cockpit} position={[0,.73649,0]}><primitive object={exterior} dispose={null}/><pointLight position={[0,3.5,2.0]} color="#c2cbde" intensity={7} distance={8} decay={1.5}/></group>
  <group visible={cockpit} name="WranglerCustomCabin">
   <Block size={[1.88,.38,.28]} at={[0,1.11,-.67]} color="#202427"/>
   <Block size={[1.9,.10,.48]} at={[0,1.35,-.73]} color="#14191c" radius={.04}/>
   <Block size={[.68,.21,.05]} at={[-.45,1.25,-.49]} color="#060b10"/>
   <Block size={[.72,.04,.22]} at={[-.45,1.375,-.44]} color="#11181b"/>
   <Dial texture={maps.speed} at={[-.57,1.255,-.445]} radius={.096} needle={speed}/>
   <Dial texture={maps.rpm} at={[-.335,1.255,-.445]} radius={.096} needle={rpm}/>
   <Dial texture={maps.fuel} at={[-.10,1.25,-.47]} radius={.045}/>
   <Dial texture={maps.temp} at={[-.10,1.135,-.47]} radius={.045}/>
   {[-.85,.77].map(x=><group key={x} position={[x,1.235,-.465]}><mesh><torusGeometry args={[.067,.009,8,40]}/><meshStandardMaterial color="#646b68" metalness={.65} roughness={.32}/></mesh><mesh><circleGeometry args={[.064,32]}/><meshBasicMaterial color="#080d0e"/></mesh>{[-.03,0,.03].map(y=><Block key={y} size={[.104,.005,.014]} at={[0,y,.012]} color="#313b3d" radius={.002}/>)}</group>)}
   <PhysicalRadio position={[.31,1.14,-.447]} scale={1.3} night/>
   <Spectrum/>
   <group position={[-.46,1.12,-.06]} rotation-x={-.25}><Block size={[.08,.08,.37]} at={[0,0,-.21]}/><group ref={wheel} name="SteeringWheel"><mesh><torusGeometry args={[.205,.02,12,64]}/><meshStandardMaterial color="#171c1e" roughness={.66}/></mesh><Block size={[.17,.115,.052]} at={[0,0,0]} color="#282f31"/>{[-1,1].map(side=><group key={side} rotation-z={side*.32}><Block size={[.15,.036,.025]} at={[side*.12,0,0]} color="#4d5757"/></group>)}<Block size={[.034,.16,.025]} at={[0,-.11,0]} color="#424c4c"/><mesh position-z={.03}><circleGeometry args={[.023,24]}/><meshStandardMaterial color="#adb6a7" metalness={.5}/></mesh></group></group>
   {[-1,1].map(side=><group key={side}>
    <Block size={[.09,.54,1.5]} at={[side*.94,1.08,.10]} color="#1c2528"/>
    <Block size={[.10,.055,1.52]} at={[side*.91,1.37,.1]} color="#313c40"/>
    <group position={[side*.88,1.74,-.60]} rotation-x={.20}><Block size={[.065,.82,.07]} at={[0,0,0]} color="#4e5957"/></group>
   </group>)}
   <Block size={[1.82,.05,.06]} at={[0,2.12,-.68]} color="#424e4f"/>
   <Block size={[1.72,.025,1.20]} at={[0,1.24,-1.49]} color="#434c4c" radius={.01}/>
   <Block size={[.55,.38,.62]} at={[.43,.70,.32]} color="#151c1f" radius={.05}/>
   <pointLight position={[0,1.6,.15]} color="#d2deeb" intensity={1.3} distance={2.3} decay={2}/>
   <pointLight position={[.3,1.15,-.20]} color="#ffc87d" intensity={.18} distance={1.3}/>
  </group>
  <primitive object={target}/><spotLight position={[0,1.15,-1.65]} target={target} color="#ffe1b4" intensity={controls?.lights?22:0} distance={55} angle={.55} penumbra={.65} decay={1.3}/>
 </group>
}
