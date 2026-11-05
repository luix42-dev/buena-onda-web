'use client'
import {useEffect,useMemo,useRef,type MutableRefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import * as T from 'three'
import {highwayPoint,type HighwayRoute} from '@/lib/real-miami/highway'
import {createHighwayTraffic,stepHighwayTraffic,type HighwayDriver} from '@/lib/cruise-os/highway-traffic'
import type {NightState} from '../nightdrive/state'

const count=26,paint=['#b9cad0','#be6c4e','#e1d9c5','#426d76','#908da2','#ceae72','#51637b','#9caaaa']
// Sedan, coupe, wagon and SUV: width, length, cabin height, cabin length.
const shapes=[[1.84,4.5,.62,2.25],[1.9,4.35,.46,1.9],[1.88,4.8,.65,2.9],[2,4.85,.9,2.65]]
function cabinGeometry(){
 const g=new T.BufferGeometry()
 g.setAttribute('position',new T.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5,-.42,1,-.27,.42,1,-.27,.42,1,.34,-.42,1,.34],3))
 g.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,7,6,4,6,5]);g.computeVertexNormals();return g
}
export default function HighwayTraffic({route,state,blend}:{route:HighwayRoute;state:MutableRefObject<NightState>;blend:MutableRefObject<number>}){
 const drivers=useRef<HighwayDriver[]>([]),previousSpeed=useRef<number[]>([])
 const built=useMemo(()=>{
  const root=new T.Group();root.name='HighwayTrafficDetailed'
  const box=new T.BoxGeometry(1,1,1),cabin=cabinGeometry(),tire=new T.CylinderGeometry(1,1,1,12),rim=new T.CylinderGeometry(1,1,1,8)
  tire.rotateZ(Math.PI/2);rim.rotateZ(Math.PI/2)
  const body=new T.MeshPhysicalMaterial({color:'white',roughness:.28,metalness:.48,clearcoat:.75,envMapIntensity:1.25,emissive:'#b9c9df',emissiveIntensity:.07})
  const glass=new T.MeshStandardMaterial({color:'#344954',metalness:.65,roughness:.18,envMapIntensity:1.6})
  const rubber=new T.MeshStandardMaterial({color:'#11151b',roughness:.92})
  const chrome=new T.MeshStandardMaterial({color:'#b2bbc5',metalness:.85,roughness:.24})
  const light=new T.MeshBasicMaterial({color:'white',toneMapped:false})
  const mesh=(name:string,g:T.BufferGeometry,m:T.Material,n:number)=>{const o=new T.InstancedMesh(g,m,n);o.name=name;o.frustumCulled=false;o.raycast=()=>{};o.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(o);return o}
  const parts={body:mesh('Painted bodies',box,body,count),glass:mesh('Sloped cabin glass',cabin,glass,count),roof:mesh('Painted roofs',box,body,count),pillars:mesh('Window pillars',box,body,count*4),bumpers:mesh('Bumpers and grilles',box,chrome,count*2),tires:mesh('Road tires',tire,rubber,count*4),rims:mesh('Alloy wheels',rim,chrome,count*4),heads:mesh('Headlamps',box,light,count*2),tails:mesh('Brake lamps',box,light,count*2),plates:mesh('Rear plates',box,chrome,count)}
  const color=new T.Color()
  for(let i=0;i<count;i++){color.set(paint[i%paint.length]);parts.body.setColorAt(i,color);parts.roof.setColorAt(i,color);for(let j=0;j<4;j++)parts.pillars.setColorAt(i*4+j,color)}
  return {root,parts,dispose(){Object.values(parts).forEach(m=>m.dispose());[box,cabin,tire,rim,body,glass,rubber,chrome,light].forEach(o=>o.dispose())}}
 },[])
 const scratch=useMemo(()=>({matrix:new T.Matrix4(),position:new T.Vector3(),scale:new T.Vector3(),quaternion:new T.Quaternion(),euler:new T.Euler(),color:new T.Color()}),[])
 useEffect(()=>()=>built.dispose(),[built])
 useEffect(()=>{
  const w=window as Window&{__highwayTraffic?:()=>unknown}
  w.__highwayTraffic=()=>({cars:drivers.current.map(c=>({...c})),drawCalls:Object.keys(built.parts).length,bodyStyles:4})
  return()=>{delete w.__highwayTraffic}
 },[built])
 useFrame((_,dt)=>{
  const s=state.current
  if(!drivers.current.length)drivers.current=createHighwayTraffic(s.distance)
  stepHighwayTraffic(drivers.current,s,s.traffic,dt,s.paused)
  const cars=[...s.traffic.map((c,i)=>{const brake=dt>0&&(previousSpeed.current[i]??c.speed)-c.speed>dt*.7?1:0;previousSpeed.current[i]=c.speed;return {...c,oncoming:false,brake}}),...drivers.current]
  const {matrix,position,scale,quaternion,euler,color}=scratch,{parts}=built
  cars.forEach((c,i)=>{
   const [width,length,height,cabinLength]=shapes[i%shapes.length],p=highwayPoint(route,c.distance,c.lateral),yaw=p.yaw+(c.oncoming?Math.PI:0),sy=Math.sin(yaw),cy=Math.cos(yaw)
   const put=(mesh:T.InstancedMesh,k:number,x:number,y:number,z:number,sx:number,syScale:number,sz:number)=>{position.set(p.x+x*cy+z*sy,p.y+y,p.z-x*sy+z*cy);quaternion.setFromEuler(euler.set(0,yaw,0));scale.set(sx,syScale,sz);matrix.compose(position,quaternion,scale);mesh.setMatrixAt(k,matrix)}
   put(parts.body,i,0,.62,0,width,.56,length)
   put(parts.glass,i,0,.9,.12,width*.94,height,cabinLength)
   put(parts.roof,i,0,.9+height,.12+cabinLength*.035,width*.81,.065,cabinLength*.61)
   put(parts.plates,i,0,.6,length*.502,.42,.16,.025)
   for(let side=0;side<2;side++){
    const sign=side?1:-1,k=i*2+side
    put(parts.bumpers,k,0,.43,sign*(length/2+.01),width*.96,.12,.11)
    put(parts.heads,k,sign*width*.34,.72,-length*.505,width*.22,.15,.045)
    put(parts.tails,k,sign*width*.35,.74,length*.505,width*.22,.16,.045)
    parts.heads.setColorAt(k,color.setRGB(1.6,1.45,1.1).multiplyScalar(.3+blend.current*.7))
    parts.tails.setColorAt(k,color.setRGB(1+c.brake*3,.025+c.brake*.05,.025))
    for(let end=0;end<2;end++){
     const wheel=i*4+side*2+end,z=(end?1:-1)*length*.31,radius=i%4===3?.37:.32
     put(parts.tires,wheel,sign*width*.48,radius,z,.23,radius,radius)
     put(parts.rims,wheel,sign*(width*.48+.125),radius,z,.025,radius*.62,radius*.62)
     put(parts.pillars,wheel,sign*width*.435,.9+height*.5,.12+(end?.15:-.3)*cabinLength,.06,height,.085)
    }
   }
  })
  Object.values(parts).forEach(m=>{m.instanceMatrix.needsUpdate=true})
  parts.heads.instanceColor!.needsUpdate=true;parts.tails.instanceColor!.needsUpdate=true
 })
 return <primitive object={built.root}/>
}
