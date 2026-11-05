'use client'
import {useLayoutEffect,useRef,type MutableRefObject,type ReactNode} from 'react'
import {useFrame} from '@react-three/fiber'
import type {Group} from 'three'
import type {NightState} from '../nightdrive/state'
import {rigVehicleChassis} from '@/lib/cruise-os/vehicle-chassis'

export default function VehicleChassis({state,enabled,children}:{state:MutableRefObject<NightState>;enabled:boolean;children:ReactNode}){
 const root=useRef<Group>(null),body=useRef<Group>(null),wheels=useRef<Group>(null),rig=useRef<ReturnType<typeof rigVehicleChassis>|null>(null)
 useLayoutEffect(()=>{
  if(!enabled||!root.current||!body.current||!wheels.current)return
  const mounted=rigVehicleChassis(root.current,body.current,wheels.current);rig.current=mounted
  return()=>{mounted.dispose();rig.current=null}
 },[enabled])
 useFrame(()=>{const response=state.current.vehicleFeel;if(enabled&&response)rig.current?.apply(response)})
 if(!enabled)return <>{children}</>
 return <group ref={root} name="VehicleSuspensionRoot"><group ref={body} name="VehicleSuspensionBody" position-y={.55}><group position-y={-.55}>{children}</group></group><group ref={wheels} name="VehicleRoadWheels"/></group>
}
