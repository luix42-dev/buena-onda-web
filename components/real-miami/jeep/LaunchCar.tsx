'use client'
import {useRef,type MutableRefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import HeroCar from '@/components/cruise/vehicle/HeroCar'
import {HERO_X} from '@/lib/cruise/constants'
import {VEHICLES} from '@/lib/cruise/vehicles'
import type {CruiseRuntime,CruiseVehicleId} from '@/lib/cruise/types'
import type {RideCameraProfile} from '@/lib/real-miami/ride-vehicles'
import type {NightState} from '../nightdrive/state'

export function launchCameraProfile(id:CruiseVehicleId):RideCameraProfile{
 const v=VEHICLES[id],p=v.cameraAnchors
 // Reuse the live garage's calibrated focus poses; radioTargets are control anchors,
 // and the coupe cabins rotate those anchors into a different model space.
 const radio:Pick<RideCameraProfile,'radioPosition'|'radioTarget'>=id==='island-trail'?{radioPosition:[-.22,1.45,.35],radioTarget:[.21,1.13,-.50]}:id==='classic-coupe'?{radioPosition:[-.12,1.18,.32],radioTarget:[.17,.93,-.458]}:{radioPosition:[-.19,1.08,.43],radioTarget:[.12,.80,-.25]}
 return {label:v.label,driver:[...p.driver.position],target:[...p.driver.target],...radio,radioFov:43,radioPortraitFov:58,chase:[...p.chase.position],chaseTarget:[...p.chase.target]}
}
/** Keep the live site's cars and cabins; the route follower still owns their world pose. */
export default function LaunchCar({id,state,cockpit,parked,night,onReady}:{id:CruiseVehicleId;state:MutableRefObject<NightState>;cockpit:boolean;parked:boolean;night:boolean;onReady:()=>void}){
 const runtime=useRef<CruiseRuntime>({distance:0,time:0,speed:0})
 useFrame(()=>{const s=state.current;runtime.current.distance=s.distance;runtime.current.time=s.elapsed;runtime.current.speed=s.paused?0:s.speed})
 return <group position-x={-HERO_X}><HeroCar vehicleId={id} runtime={runtime} quality="medium" camera={cockpit?'driver':'chase'} parked={parked} timeOfDay={night?'night':'day'} weather="clear" onReady={onReady}/></group>
}
