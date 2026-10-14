'use client'
import {useFrame} from '@react-three/fiber'
import {useEffect,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'

/** The licensed car models ship their wheels merged into body meshes. This cuts every
 * triangle inside each wheel's cylinder (tire, rim, hub, spokes) into its own pivot so the
 * wheels can roll by the real distance driven. Wheel centres come from the tire material,
 * clustered into four corners in car space (nose toward -Z, wheel axles along X). */
export type WheelRig={wheels:{pivot:T.Group;radius:number}[];dispose:()=>void}

const v=new T.Vector3()
export function rigRollingWheels(scene:T.Object3D,tire:RegExp):WheelRig{
 const empty:WheelRig={wheels:[],dispose(){}}
 scene.updateMatrixWorld(true)
 const meshes:T.Mesh[]=[];scene.traverse(o=>{if(o instanceof T.Mesh&&!(o instanceof T.SkinnedMesh)&&!(o instanceof T.InstancedMesh))meshes.push(o)})
 // 1. Tire vertices in car space -> four corner boxes.
 const points:T.Vector3[]=[]
 for(const mesh of meshes){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];if(!materials.some(m=>tire.test(m.name)))continue;const pos=mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++)points.push(new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld))}
 if(points.length<32)return empty
 const all=new T.Box3().setFromPoints(points),mid=all.getCenter(new T.Vector3())
 const boxes=[0,1,2,3].map(()=>new T.Box3())
 for(const p of points)boxes[(p.x<mid.x?0:1)+(p.z<mid.z?0:2)].expandByPoint(p)
 const wheels=boxes.map(box=>{const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());return{center,radius:Math.max(size.y,size.z)/2,half:size.x/2}})
 if(wheels.some(w=>!Number.isFinite(w.radius)||w.radius<.18||w.radius>.6||w.half<.05||w.half>.4))return empty
 // 2. Move whole triangles that sit inside a wheel cylinder into that wheel's geometry.
 const pivots=wheels.map(w=>{const g=new T.Group();g.name='RollingWheel';g.position.copy(w.center);return g}),owned:T.BufferGeometry[]=[]
 const inside=(p:T.Vector3)=>wheels.findIndex(w=>Math.abs(p.x-w.center.x)<=w.half*1.2&&Math.hypot(p.y-w.center.y,p.z-w.center.z)<=w.radius*1.02)
 for(const mesh of meshes){
  if(Array.isArray(mesh.material))continue
  const source=mesh.geometry,pos=source.attributes.position,index=source.index,triangles=(index?index.count:pos.count)/3,at=(i:number)=>index?index.getX(i):i
  const keep:number[]=[],moved:number[][]=wheels.map(()=>[])
  for(let t=0;t<triangles;t++){const a=at(t*3),b=at(t*3+1),c=at(t*3+2)
   const wa=inside(v.fromBufferAttribute(pos,a).applyMatrix4(mesh.matrixWorld));const wb=wa<0?-1:inside(v.fromBufferAttribute(pos,b).applyMatrix4(mesh.matrixWorld));const wc=wb!==wa?-1:inside(v.fromBufferAttribute(pos,c).applyMatrix4(mesh.matrixWorld))
   if(wa>=0&&wa===wb&&wb===wc)moved[wa].push(a,b,c);else keep.push(a,b,c)}
  if(moved.every(m=>!m.length))continue
  // The scene is a clone that shares geometry with the cached GLTF; never edit the shared buffer.
  const body=source.clone();body.setIndex(keep);body.clearGroups();mesh.geometry=body;owned.push(body)
  const normal=new T.Matrix3().getNormalMatrix(mesh.matrixWorld)
  moved.forEach((list,w)=>{if(!list.length)return
   const geometry=new T.BufferGeometry(),offset=wheels[w].center
   for(const [name,attribute]of Object.entries(source.attributes)){if(name==='tangent')continue;const size=attribute.itemSize,out=new Float32Array(list.length*size)
    list.forEach((vertex,i)=>{for(let k=0;k<size;k++)out[i*size+k]=attribute.getComponent(vertex,k)})
    const copy=new T.BufferAttribute(out,size,attribute.normalized)
    if(name==='position')for(let i=0;i<copy.count;i++){v.fromBufferAttribute(copy,i).applyMatrix4(mesh.matrixWorld).sub(offset);copy.setXYZ(i,v.x,v.y,v.z)}
    if(name==='normal')for(let i=0;i<copy.count;i++){v.fromBufferAttribute(copy,i).applyMatrix3(normal).normalize();copy.setXYZ(i,v.x,v.y,v.z)}
    geometry.setAttribute(name,copy)}
   owned.push(geometry)
   const part=new T.Mesh(geometry,mesh.material);part.castShadow=mesh.castShadow;part.receiveShadow=mesh.receiveShadow;part.name=`${mesh.name}_wheel${w}`;pivots[w].add(part)})
 }
 if(pivots.every(p=>!p.children.length))return empty
 return {wheels:pivots.map((pivot,i)=>({pivot,radius:wheels[i].radius})),dispose:()=>owned.forEach(g=>g.dispose())}
}

/** Rolls by route distance, so Director, chase and cockpit all agree with the real speed. */
export function RollingWheels({rig,state}:{rig:WheelRig;state:MutableRefObject<NightState>}){
 useEffect(()=>{const w=window as Window&{__wheels?:()=>unknown};if(new URLSearchParams(location.search).has('diagnostics'))w.__wheels=()=>rig.wheels.map(({pivot,radius})=>({radius:+radius.toFixed(3),center:pivot.position.toArray().map(n=>+n.toFixed(3)),parts:pivot.children.length,triangles:pivot.children.reduce((n,c)=>n+((c as T.Mesh).geometry.attributes.position.count/3),0),angle:+pivot.rotation.x.toFixed(3)}));return()=>{delete w.__wheels;rig.dispose()}},[rig])
 useFrame(()=>{const d=state.current.distance;for(const w of rig.wheels)w.pivot.rotation.x=-(d/w.radius)%(Math.PI*2)})
 return <>{rig.wheels.map((w,i)=><primitive key={i} object={w.pivot}/>)}</>
}
