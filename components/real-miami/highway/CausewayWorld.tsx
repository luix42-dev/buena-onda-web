'use client'
import {useFrame} from '@react-three/fiber'
import {useEffect,useMemo,useRef,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import type {CausewayRoute} from '@/lib/real-miami/connected-drive'

function strip(route:CausewayRoute,left:number,right:number,lift=0){
 const n=Math.ceil(route.length/8),xyz=new Float32Array((n+1)*6),uv=new Float32Array((n+1)*4),indices:number[]=[]
 for(let i=0;i<=n;i++){
  const d=Math.min(route.length,i*route.length/n),p=route.sample(d),c=Math.cos(p.yaw),s=Math.sin(p.yaw)
  xyz.set([p.x+c*left,p.y+lift,p.z-s*left,p.x+c*right,p.y+lift,p.z-s*right],i*6)
  uv.set([0,d/8,1,d/8],i*4)
  if(i<n){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(xyz,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g
}
function arch(route:CausewayRoute,meters:number,height:number,sweep:number){
 const a=route.sample(meters-sweep),b=route.sample(meters+sweep),mid=route.sample(meters)
 const side=(p:typeof a,n:number)=>new T.Vector3(p.x+Math.cos(p.yaw)*n,p.y+1.5,p.z-Math.sin(p.yaw)*n)
 const curve=new T.QuadraticBezierCurve3(side(a,-22),new T.Vector3(mid.x,mid.y+height*2,mid.z),side(b,22))
 return new T.TubeGeometry(curve,40,1.8,6,false)
}
function build(route:CausewayRoute){
 const road=strip(route,-11,11),edgeA=strip(route,-11.3,-10.5,.08),edgeB=strip(route,10.5,11.3,.08),center=strip(route,-.11,.11,.08)
 const arches:number[]=[];for(let m=0;m<route.length;m+=18){const p=route.sample(m);if(p.x< -5050&&p.x> -5550)arches.push(m)}
 const start=arches[0]??route.length*.75,end=arches[arches.length-1]??start
 const sweep=end-start
 const tubes=Array.from({length:6},(_,i)=>arch(route,start+sweep*(i+.5)/6,58+i%2*13,14+i%3*6))
 const pierGeometry=new T.CylinderGeometry(2.6,3.7,19,7),pierMaterial=new T.MeshStandardMaterial({color:'#abb2ae',roughness:.9})
 const pierCount=Math.floor(route.length/105),piers=new T.InstancedMesh(pierGeometry,pierMaterial,pierCount)
 const bulbGeometry=new T.SphereGeometry(.65,6,4),bulbMaterial=new T.MeshBasicMaterial({color:'#ffd5a0'}),bulbs=new T.InstancedMesh(bulbGeometry,bulbMaterial,Math.floor(route.length/60))
 const matrix=new T.Matrix4()
 for(let i=0;i<pierCount;i++){const p=route.sample(i*105+40);matrix.makeTranslation(p.x,p.y-12,p.z);piers.setMatrixAt(i,matrix)}
 for(let i=0;i<bulbs.count;i++){const p=route.sample(i*60+25),side=i%2?-1:1;matrix.makeTranslation(p.x+Math.cos(p.yaw)*side*14,p.y+7,p.z-Math.sin(p.yaw)*side*14);bulbs.setMatrixAt(i,matrix)}
 piers.instanceMatrix.needsUpdate=true;bulbs.instanceMatrix.needsUpdate=true
 const roadMaterial=new T.MeshStandardMaterial({color:'#333c43',roughness:.77,metalness:.08,side:T.DoubleSide})
 const stripeMaterial=new T.MeshBasicMaterial({color:'#f4d4a5',side:T.DoubleSide})
 const archMaterial=new T.MeshStandardMaterial({color:'#f1ede0',roughness:.54,metalness:.06,emissive:'#486682',emissiveIntensity:.18})
 const waterMaterial=new T.MeshStandardMaterial({color:'#18556b',roughness:.34,metalness:.26,emissive:'#072133',emissiveIntensity:.35})
 return {road,edgeA,edgeB,center,tubes,piers,bulbs,roadMaterial,stripeMaterial,archMaterial,waterMaterial,dispose(){[road,edgeA,edgeB,center,pierGeometry,bulbGeometry,...tubes].forEach(v=>v.dispose());[pierMaterial,bulbMaterial,roadMaterial,stripeMaterial,archMaterial,waterMaterial].forEach(v=>v.dispose());piers.dispose();bulbs.dispose()}}
}

/** The bridge is an authored visual interpretation of MacArthur Causeway and the downtown
 * six-arch I-395 Signature Bridge. It follows the same route sampled by the car. */
export default function CausewayWorld({state,route,blend}:{state:MutableRefObject<NightState>;route:CausewayRoute;blend:MutableRefObject<number>}){
 const group=useRef<T.Group>(null),built=useMemo(()=>build(route),[route])
 useEffect(()=>()=>built.dispose(),[built])
 useFrame(()=>{const p=route.sample(state.current.distance);group.current?.position.set(-p.x,-p.y,-p.z);built.archMaterial.emissiveIntensity=.12+blend.current*.42;built.waterMaterial.emissiveIntensity=.13+blend.current*.28})
 return <group ref={group}>
  <mesh geometry={built.road} material={built.roadMaterial} raycast={()=>{}}/>
  <mesh geometry={built.edgeA} material={built.stripeMaterial} raycast={()=>{}}/>
  <mesh geometry={built.edgeB} material={built.stripeMaterial} raycast={()=>{}}/>
  <mesh geometry={built.center} material={built.stripeMaterial} raycast={()=>{}}/>
  <primitive object={built.piers}/><primitive object={built.bulbs}/>
  {built.tubes.map((geometry,i)=><mesh key={i} geometry={geometry} material={built.archMaterial} raycast={()=>{}}/>)}
  <mesh rotation-x={-Math.PI/2} position={[-4700,-15,1300]} material={built.waterMaterial} raycast={()=>{}}><planeGeometry args={[9300,6800]}/></mesh>
  <mesh rotation-x={-Math.PI/2} position={[-3450,-10.5,1240]} raycast={()=>{}}><circleGeometry args={[290,32]}/><meshStandardMaterial color="#315e54" roughness={1}/></mesh>
  {Array.from({length:18},(_,i)=>{const x=-6180+(i%6)*112,z=480+Math.floor(i/6)*110,h=55+(i*37)%115;return <mesh key={i} position={[x,-15+h/2,z]} raycast={()=>{}}><boxGeometry args={[54,h,62]}/><meshStandardMaterial color={i%3?'#293c4d':'#3f5260'} emissive="#416077" emissiveIntensity={blend.current*.24} roughness={.65}/></mesh>})}
 </group>
}
