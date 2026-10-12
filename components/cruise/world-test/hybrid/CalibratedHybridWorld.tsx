'use client'

import { Suspense, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Color, PerspectiveCamera, Vector3 } from 'three'
import HeroCar from '../../vehicle/HeroCar'
import { HERO_X } from '@/lib/cruise/constants'
import type { CruiseRuntime } from '@/lib/cruise/types'
import HybridWorldPlayer, { type HybridWorldPlayerProps } from './HybridWorldPlayer'
import { verticalFov, type HybridCamera, type HybridPlaybackSnapshot } from './contract'

export type HybridCalibration = {
  camera: HybridCamera
  pitchDeg: number
  /** Candidate inspection is not permission to claim calibrated optical quality. */
  verified: boolean
  evidenceUrl?: string
  /** Optional near-road is an explicit seam test, never enabled on the founder footage. */
  nearRoad?: { widthM: number; grade: number; lengthM: number; color: string }
}

function LockedOptics({ calibration, runtime }: { calibration: HybridCalibration; runtime: MutableRefObject<CruiseRuntime> }) {
  const target = useRef(new Vector3())
  useFrame(({ camera }) => {
    if (!(camera instanceof PerspectiveCamera)) return
    camera.position.set(0, calibration.camera.eyeHeightM, 0)
    const pitch = calibration.pitchDeg * Math.PI / 180
    target.current.set(0, calibration.camera.eyeHeightM + Math.sin(pitch), -Math.cos(pitch))
    camera.lookAt(target.current)
    camera.fov = verticalFov(calibration.camera.horizontalFovDeg, calibration.camera.aspect)
    camera.updateProjectionMatrix()
    // Media presentation clock drives both foreground and vehicle, never wall-clock delta.
    runtime.current.distance = runtime.current.time * calibration.camera.speedMps
  })
  return null
}

function NearRoad({ calibration }: { calibration: HybridCalibration }) {
  const road = calibration.nearRoad
  if (!road) return null
  return <mesh position={[0, -road.grade * road.lengthM / 2, -road.lengthM / 2]} rotation={[-Math.PI / 2 + Math.atan(road.grade), 0, 0]}>
    <planeGeometry args={[road.widthM, road.lengthM]} />
    <meshStandardMaterial color={road.color} roughness={.88} metalness={0} />
  </mesh>
}

/** Competing hybrid proof: complete environment plate + original real-time Jeep.
 * Must be mounted inside the shell's existing CockpitProvider to retain radio controls.
 * Uses no new radio player, lights/fake reflections, or claimed depth recovery.
 */
export default function CalibratedHybridWorld({ calibration, candidateMode = false, ...player }: HybridWorldPlayerProps & { calibration: HybridCalibration; candidateMode?: boolean }) {
  const runtime = useRef<CruiseRuntime>({ time: 0, distance: 0, speed: calibration.camera.speedMps })
  const container = useRef<HTMLDivElement>(null)
  const [fitted, setFitted] = useState<{ width: number; height: number }>()
  useEffect(() => {
    const root = container.current
    if (!root) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.min(entry.contentRect.width, entry.contentRect.height * calibration.camera.aspect)
      setFitted({ width, height: width / calibration.camera.aspect })
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [calibration.camera.aspect])
  const [status, setStatus] = useState<HybridPlaybackSnapshot['status']>('loading')
  const sourcesValid = !!player.segments?.length && player.segments.every(segment => segment.content === 'environmentOnly'
    && segment.camera?.aspect === calibration.camera.aspect
    && segment.camera.horizontalFovDeg === calibration.camera.horizontalFovDeg)
  const qualified = sourcesValid && calibration.verified && !!calibration.evidenceUrl
  const showCandidate = sourcesValid && (qualified || candidateMode)
  function report(snapshot: HybridPlaybackSnapshot) {
    runtime.current.time = snapshot.timelineSeconds
    setStatus(snapshot.status)
    player.onPlayback?.(snapshot)
  }
  return <div ref={container} className="world-hybrid-composite" data-calibration={qualified ? 'verified' : showCandidate ? 'candidate' : 'rejected'}>
    <div className="world-hybrid-fitted" style={fitted ?? { aspectRatio: calibration.camera.aspect }}>
      <HybridWorldPlayer {...player} onPlayback={report} />
      {showCandidate && <div className="world-hybrid-foreground">
        <Canvas dpr={1} camera={{ fov: verticalFov(calibration.camera.horizontalFovDeg, calibration.camera.aspect), near: .04, far: 100 }} gl={{ alpha: true, antialias: true }} frameloop={!player.paused && status === 'playing' ? 'always' : 'demand'}>
          <LockedOptics calibration={calibration} runtime={runtime} />
          {/* Bounded browser candidate lighting; not a reconstruction of street illumination. */}
          <ambientLight intensity={.28} color={new Color('#a9b9d6')} />
          <directionalLight position={[2, 4, 1]} intensity={.55} color="#d5c7af" />
          <Suspense fallback={null}>
            <NearRoad calibration={calibration} />
            <group position={[-HERO_X + .43, 0, -.38]}>
              <HeroCar vehicleId="island-trail" runtime={runtime} quality="low" camera="driver" timeOfDay="night" weather="clear" parked />
            </group>
          </Suspense>
        </Canvas>
      </div>}
    </div>
    <div className="world-hybrid-calibration-note">{qualified ? 'Calibration evidence supplied; inspect road, window and lighting joins in motion.' : showCandidate ? 'Unverified hybrid candidate — original browser Jeep; road seam and lighting require review.' : 'Hybrid compositing rejected: an environment-only plate with matching measured optics is required.'}</div>
  </div>
}
