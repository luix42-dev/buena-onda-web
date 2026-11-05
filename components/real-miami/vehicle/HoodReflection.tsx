'use client'
import {useFrame,useThree} from '@react-three/fiber'
import {useEffect,useMemo,type MutableRefObject} from 'react'
import * as T from 'three'
import {nightEnvironment,paintMaterials} from './nightPaint'
import {renderHold} from '@/lib/cruise/render-hold'

/** Shared vehicle reflection, desktop/medium tiers: a cube map rendered from the car (256 px on
 * high, 128 on medium: 64 px read as a dark smear on the clearcoat), one face per frame (a full refresh
 * every six frames), the car itself hidden, 360 m far plane so towers and signs down the avenue show up.
 * The paint mirrors the real street (buildings, signs, lamps) instead of a static sky.
 * Phones keep the virtual-lamp glints on the static night environment. */
export default function HoodReflection({car,enabled,size=128}:{car:MutableRefObject<T.Group|null>;enabled:boolean;size?:number}){
 const {gl,scene}=useThree()
 const rig=useMemo(()=>{
  const target=new T.WebGLCubeRenderTarget(size,{type:T.HalfFloatType,generateMipmaps:false})
  const camera=new T.CubeCamera(.3,360,target)
  return {target,camera,face:0,eye:new T.Vector3()}
 },[size])
 useEffect(()=>{
  if(!enabled)return
  const assign=()=>paintMaterials.forEach(m=>{if(m.envMap!==rig.target.texture){m.envMap=rig.target.texture;m.envMapIntensity=1.6;m.needsUpdate=true}})
  assign();const timer=setInterval(assign,1000)
  return()=>{clearInterval(timer);const fallback=nightEnvironment(gl);paintMaterials.forEach(m=>{m.envMap=fallback;m.envMapIntensity=1.15;m.needsUpdate=true})}
 },[enabled,rig,gl])
 useEffect(()=>()=>rig.target.dispose(),[rig])
 useEffect(()=>{
  if(!new URLSearchParams(location.search).has('diagnostics'))return
  const w=window as Window&{__vehicleReflections?:()=>unknown}
  w.__vehicleReflections=()=>{const materials=new Set<T.MeshStandardMaterial>();car.current?.traverse(node=>{if(node instanceof T.Mesh)for(const material of Array.isArray(node.material)?node.material:[node.material])if(material instanceof T.MeshStandardMaterial&&material.envMap)materials.add(material)});return {dynamic:enabled,reflective:materials.size,live:[...materials].filter(material=>material.envMap===rig.target.texture).length,materials:[...materials].map(material=>({name:material.name,color:material.color.getHexString(),roughness:material.roughness}))}}
  return()=>{delete w.__vehicleReflections}
 },[car,enabled,rig])
 useFrame(()=>{
  const body=car.current;if(!enabled||!body||renderHold.active)return
  // Hood centre in car space (nose -Z), lifted slightly so the hood's own curvature mirrors the sky above.
  rig.eye.set(0,.95,-1.25);body.localToWorld(rig.eye);rig.camera.position.copy(rig.eye);rig.camera.updateMatrixWorld()
  const faces=rig.camera.children as T.PerspectiveCamera[],previous=gl.getRenderTarget(),xr=gl.xr.enabled,visible=body.visible
  gl.xr.enabled=false;body.visible=false
  gl.setRenderTarget(rig.target,rig.face);gl.render(scene,faces[rig.face])
  body.visible=visible;gl.xr.enabled=xr;gl.setRenderTarget(previous)
  rig.face=(rig.face+1)%6
  // Re-prefilter once per complete cube so roughness mips follow the street.
  if(rig.face===0)rig.target.texture.needsPMREMUpdate=true
 },-1)
 return null
}
