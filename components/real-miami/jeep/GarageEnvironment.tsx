'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as T from 'three'

/** A local showroom; no remote environment maps or assets. */
export default function GarageEnvironment() {
  const { scene } = useThree()
  useEffect(() => {
    const background = scene.background, fog = scene.fog
    scene.background = new T.Color('#171e24')
    scene.fog = new T.Fog('#171e24', 18, 55)
    return () => { scene.background = background; scene.fog = fog }
  }, [scene])
  return <group>
    <hemisphereLight args={['#f5ecdc', '#354750', 2.1]} />
    <directionalLight position={[-5, 9, 6]} color="#f5ecdc" intensity={3.2} />
    <directionalLight position={[6, 4, -4]} color="#8acac4" intensity={2.2} />
    <pointLight position={[2, 5, 6]} color="#f1ac79" intensity={16} distance={20} decay={2} />
    <mesh rotation-x={-Math.PI / 2} position-y={-.105}>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#171e24" roughness={.9} />
    </mesh>
    <gridHelper args={[120, 60, '#31474f', '#253b43']} position-y={-.10} />
    <mesh position-y={-.065}>
      <cylinderGeometry args={[4.4, 4.4, .12, 96]} />
      <meshStandardMaterial color="#426366" roughness={.65} metalness={.08} />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position-y={-.002}>
      <ringGeometry args={[4.32, 4.34, 96]} />
      <meshBasicMaterial color="#f1ac79" />
    </mesh>
  </group>
}
