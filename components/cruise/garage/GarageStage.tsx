'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Group } from 'three'
import { HERO_X } from '@/lib/cruise/constants'
import type { ReactNode } from 'react'

export default function GarageStage({ children, reducedMotion }: { children: ReactNode; reducedMotion: boolean }) {
  const car = useRef<Group>(null)
  const { camera, size, gl } = useThree()
  useEffect(() => {
    const portrait = size.height > size.width
    camera.position.set(portrait ? 7 : 6, portrait ? 4.3 : 3.2, portrait ? 10 : 8)
    camera.lookAt(0, .7, 0)
    if ('fov' in camera) { camera.fov = portrait ? 43 : 37; camera.updateProjectionMatrix() }
  }, [camera, size])
  useEffect(() => {
    let previous: number | null = null
    const down = (e: PointerEvent) => { previous=e.clientX }
    const move = (e: PointerEvent) => { if(previous!==null && car.current) {car.current.rotation.y+=(e.clientX-previous)*.008;previous=e.clientX} }
    const up = () => { previous=null }
    const canvas=gl.domElement
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);window.addEventListener('pointerup',up)
    return () => {canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)}
  }, [gl])
  useFrame((_,delta) => { if(car.current && !reducedMotion) car.current.rotation.y+=Math.min(delta,.05)*.13 })
  return <group>
    <ambientLight intensity={1.3} />
    <hemisphereLight args={['#c3e7e4','#b99c7b',2]} />
    <directionalLight position={[4,8,5]} intensity={4} color="#ffe2bb" />
    <directionalLight position={[-4,4,-3]} intensity={3} color="#70c8c4" />
    <mesh position={[0,-.075,0]}><cylinderGeometry args={[3.5,3.6,.16,80]} /><meshStandardMaterial color="#354248" metalness={.2} roughness={.5} /></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.011,0]}><ringGeometry args={[3.4,3.42,96]} /><meshBasicMaterial color="#e8a779" /></mesh>
    <gridHelper args={[80,40,'#33464b','#26343a']} position-y={-.17} />
    <group ref={car} rotation-y={2.4}><group position-x={-HERO_X}>{children}</group></group>
  </group>
}
