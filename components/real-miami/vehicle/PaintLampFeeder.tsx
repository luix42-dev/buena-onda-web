'use client'
import {useFrame} from '@react-three/fiber'
import {useEffect,useMemo,type MutableRefObject} from 'react'
import * as T from 'three'
import type {NightState} from '../nightdrive/state'
import {LOOK} from '@/lib/cruise-os/look'
import {LAMP_STRIDE,lampsNear} from './lampGrid'
import {paintLamps,setPaintLamps} from './nightPaint'

type Route={sample:(distance:number)=>{x:number;y:number;z:number}}
type Lamp={x:number;y:number;z:number;color:T.Color;intensity:number;d:number}

/** Each frame, after the camera rig (-2): the nearest registered poles, recentred on the car like the
 * world is, become the paint's virtual lamps. Night blend scales them; sunset keeps a faint sheen. */
export default function PaintLampFeeder({route,state,blend,enabled}:{route:Route;state:MutableRefObject<NightState>;blend:MutableRefObject<number>;enabled:boolean}){
 const scratch=useMemo(()=>({flat:[] as number[],lamps:Array.from({length:640},()=>({x:0,y:0,z:0,color:new T.Color(LOOK.sodium),intensity:0,d:0})) as Lamp[],eye:new T.Vector3()}),[])
 // Leaving a world without registered lamps must not freeze the last glints on the paint.
 useEffect(()=>()=>{paintLamps.uLampCount.value=0},[])
 useFrame(({camera})=>{
  const origin=route.sample(state.current.distance),flat=lampsNear(origin.x,origin.z,160,scratch.flat)
  camera.getWorldPosition(scratch.eye)
  const count=Math.min(scratch.lamps.length,flat.length/LAMP_STRIDE),night=.12+.88*blend.current
  for(let i=0;i<count;i++){const lamp=scratch.lamps[i],k=i*LAMP_STRIDE;lamp.x=flat[k]-origin.x;lamp.y=flat[k+1]-origin.y;lamp.z=flat[k+2]-origin.z;lamp.color.setHex(flat[k+3]);lamp.intensity=flat[k+4]*night
   // Big screens are seen from farther away; rank them as if they were closer.
   lamp.d=scratch.eye.distanceToSquared(lamp)/(flat[k+4]>1.5?9:1)}
  const nearest=scratch.lamps.slice(0,count).sort((a,b)=>a.d-b.d)
  setPaintLamps(camera,nearest,enabled)
 },-1)
 return null
}
