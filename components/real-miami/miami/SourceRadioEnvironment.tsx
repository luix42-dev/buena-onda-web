'use client'
import {useEffect} from 'react'
import {useThree} from '@react-three/fiber'

/** The paused native world remains visible through the radio cabin's windshield. */
export default function SourceRadioEnvironment({night}:{night:boolean}){
 const scene=useThree(s=>s.scene)
 useEffect(()=>{const background=scene.background,fog=scene.fog;scene.background=null;scene.fog=null;return()=>{scene.background=background;scene.fog=fog}},[scene])
 return <><hemisphereLight args={[night?'#9cb9df':'#f5ecdc','#354750',night?.7:1.8]}/><directionalLight position={[-5,9,6]} color={night?'#b6c9df':'#f5d4b0'} intensity={night?1:2.5}/><directionalLight position={[6,4,-4]} color="#8acac4" intensity={night?.7:1.2}/></>
}
