'use client'
import {useLayoutEffect,useRef,type MutableRefObject,type ReactNode} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import * as T from 'three'
import {addGlints,nightEnvironment,paintMaterials} from './nightPaint'

/** Preserve each car's paint, maps and trim, while sharing the street-reflection pipeline. */
export default function VehicleFinish({children,enabled,blend,city}:{children:ReactNode;enabled:boolean;blend:MutableRefObject<number>;city:boolean}){
 const root=useRef<T.Group>(null),cool=useRef<T.PointLight>(null),warm=useRef<T.PointLight>(null),gl=useThree(s=>s.gl)
 useLayoutEffect(()=>{
  if(!enabled||!root.current)return
  const copies=new Map<T.Material,T.MeshStandardMaterial>(),originals:{mesh:T.Mesh;material:T.Material|T.Material[]}[]=[]
  const environment=nightEnvironment(gl)
  root.current.traverse(node=>{
   if(!(node instanceof T.Mesh))return
   const adapt=(source:T.Material)=>{
    if(!(source instanceof T.MeshStandardMaterial)||source.roughness>.72||/rubber|tire|leather|fabric|vinyl|dash|seat|lamp|light|stop|lcd|needle/i.test(source.name)||source.emissive.getHex()!==0)return source
    const existing=copies.get(source);if(existing)return existing
    const material=source.clone();material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=source.customProgramCacheKey
    material.envMap=environment;material.envMapIntensity=Math.max(1.25,source.envMapIntensity)
    // Keep native lamp-atlas and other custom shaders intact; plain materials gain lamp glints.
    if(source.onBeforeCompile===T.Material.prototype.onBeforeCompile)addGlints(material,.65)
    material.needsUpdate=true;copies.set(source,material);paintMaterials.add(material)
    return material
   }
   const original=node.material,next=Array.isArray(original)?original.map(adapt):adapt(original)
   originals.push({mesh:node,material:original});node.material=next
  })
  return()=>{for(const original of originals)original.mesh.material=original.material;copies.forEach(material=>{paintMaterials.delete(material);material.dispose()})}
 },[enabled,gl])
 useFrame(()=>{
  const night=enabled?blend.current:0
  // Broad moon/sky fill and warm pavement/building bounce, local to the car rather than a global exposure lift.
  if(cool.current)cool.current.intensity=night*(city?30:20)
  if(warm.current)warm.current.intensity=night*(city?20:12)
 })
 return <group ref={root} name="VehicleReflectiveFinish">{children}<pointLight ref={cool} name="VehicleSkyBounce" position={[-3,4.5,2]} color="#bed4ee" intensity={0} distance={9} decay={2}/><pointLight ref={warm} name="VehicleStreetBounce" position={[3,2.6,-1]} color="#ffe1b4" intensity={0} distance={7} decay={2}/></group>
}
