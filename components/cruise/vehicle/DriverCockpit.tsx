'use client'

import { Html, RoundedBox } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CanvasTexture, Euler, Group, Matrix4, Mesh, Quaternion, SRGBColorSpace, Vector3 } from 'three'
import { reachBlend, solveArm, steeringAngle } from '@/lib/cruise/armIK'
import { getVehicle } from '@/lib/cruise/vehicles'
import type { CruiseCamera, CruiseDirectorShot, CruiseVehicleId } from '@/lib/cruise/types'
import { useCockpit } from './CockpitContext'
import PhysicalRadio from './PhysicalRadio'
import { LAUNCH } from '@/lib/cruise/launch'

const skin = '#aa7650', shirt = '#d5c8aa'
type Targets = Record<'tuning' | 'volume' | 'preset' | 'lights', Vector3>
const up = new Vector3(0, 1, 0)

function Hand() {
  return <group name="DriverHand">
    <RoundedBox args={[0.074, 0.029, 0.083]} radius={0.013} smoothness={2}><meshStandardMaterial color={skin} roughness={0.75} /></RoundedBox>
    {[0, 1, 2, 3].map(i => <group key={i} position={[(i - 1.5) * 0.017, 0, 0.043]} rotation={[0.65, 0, 0]}>
      <mesh position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[0.008, 0.03, 3, 6]} /><meshStandardMaterial color={skin} /></mesh>
      <mesh position={[0, -0.012, 0.035]} rotation={[0.6, 0, 0]}><capsuleGeometry args={[0.007, 0.018, 3, 6]} /><meshStandardMaterial color={skin} /></mesh>
    </group>)}
    <mesh position={[0.043, -0.006, 0.015]} rotation={[0.7, 0, -0.5]}><capsuleGeometry args={[0.011, 0.042, 3, 8]} /><meshStandardMaterial color={skin} /></mesh>
  </group>
}

function Arm({ right, points }: { right: boolean; points: Targets }) {
  const cockpit = useCockpit()
  const upper = useRef<Mesh>(null), lower = useRef<Mesh>(null), hand = useRef<Group>(null)
  const shoulder = useMemo(() => new Vector3(right ? 0.20 : 0.52, 0.98, -0.16), [right])
  const rest = useMemo(() => new Vector3(right ? 0.225 : 0.495, 0.84, 0.19), [right])
  const target = useMemo(() => new Vector3(), [])
  const pole = useMemo(() => new Vector3(right ? 0.10 : 0.68, 0.53, -0.08), [right])
  useFrame(() => {
    const elapsed = cockpit?.command ? (performance.now() - cockpit.command.started) / 1000 : 0
    const weight = cockpit?.command ? reachBlend(elapsed) : 0
    target.copy(rest)
    const steering = steeringAngle(performance.now()), x = rest.x - 0.36, y = rest.y - 0.8
    target.x = 0.36 + x * Math.cos(steering) - y * Math.sin(steering)
    target.y = 0.8 + x * Math.sin(steering) + y * Math.cos(steering)
    if (right && cockpit?.command) target.lerp(points[cockpit.command.action], weight)
    const solved = solveArm(shoulder, target, pole, 0.27, 0.27)
    for (const [mesh, a, b] of [[upper.current, shoulder, solved.elbow], [lower.current, solved.elbow, solved.hand]] as const) {
      if (!mesh) continue
      mesh.position.copy(a).add(b).multiplyScalar(0.5)
      mesh.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize())
      mesh.scale.y = a.distanceTo(b)
    }
    if (hand.current) {
      hand.current.position.copy(solved.hand)
      hand.current.rotation.set(-0.25 + weight * 0.35, right ? -0.15 : 0.15, right ? -0.18 : 0.18)
      if (right && cockpit?.command) document.documentElement.dataset.cockpitPose = JSON.stringify({ action: cockpit.command.action, elapsed, weight, hand: solved.hand.toArray(), target: target.toArray(), error: solved.hand.distanceTo(target), phase: elapsed < 0.3 ? 'starting' : elapsed < 1.1 ? 'reaching' : elapsed < 2.15 ? 'contact' : 'returning' })
      else if (right) document.documentElement.dataset.cockpitPose = JSON.stringify({ phase: 'driving', hand: solved.hand.toArray() })
    }
  })
  return <group name={right ? 'DriverRightArm' : 'DriverLeftArm'}>
    <mesh ref={upper}><cylinderGeometry args={[0.059, 0.045, 1, 12]} /><meshStandardMaterial color={shirt} roughness={0.92} /></mesh>
    <mesh ref={lower}><cylinderGeometry args={[0.039, 0.029, 1, 12]} /><meshStandardMaterial color={skin} roughness={0.78} /></mesh>
    <group ref={hand}><Hand /></group>
  </group>
}

export default function DriverCockpit({ camera, vehicleId = 'coastal-coupe' }: { camera: CruiseCamera | CruiseDirectorShot; vehicleId?: CruiseVehicleId }) {
  const controls = useCockpit()
  const vehicle = getVehicle(vehicleId)
  const points = useMemo(() => {
    const transform = vehicle.cockpitTransform
    const inverse = new Matrix4().compose(new Vector3(...(transform?.position || [0, 0, 0])), new Quaternion().setFromEuler(new Euler(...(transform?.rotation || [0, 0, 0]))), new Vector3(1, 1, 1)).invert()
    return {
      tuning: new Vector3(...vehicle.radioTargets!.tuning).applyMatrix4(inverse),
      volume: new Vector3(...vehicle.radioTargets!.volume).applyMatrix4(inverse),
      preset: new Vector3(...vehicle.radioTargets!.preset).applyMatrix4(inverse),
      lights: new Vector3(...vehicle.lightControlTarget!).applyMatrix4(inverse),
    }
  }, [vehicle])
  const [panel, setPanel] = useState(false)
  const knob = useRef<Group>(null), volumeKnob = useRef<Group>(null), presetButton = useRef<Mesh>(null)
  const radio = useRef<Group>(null)
  const three = useThree()
  const projected = useMemo(() => new Vector3(), [])
  const display = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace
    return { canvas, texture }
  }, [])
  const gauges = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 180
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#101411'; ctx.fillRect(0, 0, 512, 180)
    for (const [x, radius, title] of [[135, 76, 'MPH'], [345, 62, 'FUEL']] as const) {
      ctx.strokeStyle = '#8e9988'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, 91, radius, 0, Math.PI * 2); ctx.stroke()
      for (let tick = 0; tick < 13; tick++) {
        const angle = Math.PI * (.75 + tick * 1.5 / 12)
        ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * (radius - 7), 91 + Math.sin(angle) * (radius - 7)); ctx.lineTo(x + Math.cos(angle) * (radius - 17), 91 + Math.sin(angle) * (radius - 17)); ctx.stroke()
      }
      ctx.strokeStyle = '#ffb35b'; ctx.beginPath(); ctx.moveTo(x, 91); ctx.lineTo(x - radius * .58, 91 - radius * .38); ctx.stroke()
      ctx.fillStyle = '#becbb3'; ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.fillText(title, x, 127)
    }
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; return texture
  }, [])
  useEffect(() => () => gauges.dispose(), [gauges])
  useEffect(() => () => { display.texture.dispose(); delete document.documentElement.dataset.cockpitPose }, [display])
  useEffect(() => { if (camera !== 'driver') setPanel(false) }, [camera])
  const label = controls?.tuning ? 'TUNING...' : controls?.audio.stationId === 'buena-onda-radio' ? 'BUENA ONDA' : controls?.audio.stationId === 'nts-radio' ? 'NTS 1' : controls?.audio.stationId === 'nts-radio-2' ? 'NTS 2' : controls?.audio.station.name.toUpperCase() || 'BUENA ONDA'
  useEffect(() => {
    const ctx = display.canvas.getContext('2d')!
    ctx.fillStyle = '#080c08'; ctx.fillRect(0, 0, 512, 128)
    ctx.fillStyle = '#ffaa45'; ctx.font = 'bold 46px monospace'; ctx.textAlign = 'center'; ctx.fillText(label, 256, 67)
    ctx.font = '18px monospace'; ctx.fillText(controls?.audio.muted ? 'MUTE' : controls?.audio.playing ? 'STEREO     FM' : 'PAUSED', 256, 108)
    display.texture.needsUpdate = true
    document.documentElement.dataset.cockpitDisplay = label
  }, [label, controls?.audio.muted, controls?.audio.playing, display])
  useFrame(() => {
    const elapsed = controls?.command ? (performance.now() - controls.command.started) / 1000 : 0
    const contact = elapsed > 1.1 && elapsed < 2.15 ? Math.min(1, (elapsed - 1.1) / 0.25) : 0
    if (knob.current) knob.current.rotation.z = controls?.command?.action === 'tuning' ? contact * 0.9 : 0
    if (volumeKnob.current) volumeKnob.current.rotation.z = controls?.command?.action === 'volume' ? contact * 0.9 : 0
    if (presetButton.current) presetButton.current.position.z = -0.033 + (controls?.command?.action === 'preset' ? contact * 0.008 : 0)
    if (radio.current && camera === 'driver') {
      projected.set(-0.105, 0, -0.065); radio.current.localToWorld(projected); projected.project(three.camera)
      document.documentElement.dataset.cockpitRadioHit = JSON.stringify({ x: (projected.x + 1) * three.size.width / 2, y: (1 - projected.y) * three.size.height / 2 })
    }
  })
  const interact = () => setPanel(value => !value)
  return <group name="DriverAndPhysicalRadio" position={[...(vehicle.cockpitTransform?.position || [0, 0, 0])]} rotation={[...(vehicle.cockpitTransform?.rotation || [0, 0, 0])]}>
    {LAUNCH.driverBody && <group name="SeatedDriver">
      <mesh position={[0.36, 0.77, -0.22]} rotation={[-0.13, 0, 0]} scale={[0.19, 0.27, 0.115]}><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={shirt} roughness={0.94} /></mesh>
      <mesh visible={camera !== 'driver'} position={[0.36, 1.035, -0.25]}><cylinderGeometry args={[0.052, 0.06, 0.09, 12]} /><meshStandardMaterial color={skin} /></mesh>
      <group visible={camera !== 'driver'}>
        <mesh position={[0.36, 1.085, -0.245]} scale={[0.085, 0.12, 0.09]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={skin} roughness={0.85} /></mesh>
        <mesh position={[0.36, 1.16, -0.255]} scale={[0.09, 0.05, 0.10]}><sphereGeometry args={[1, 16, 8]} /><meshStandardMaterial color="#343b37" /></mesh>
        <mesh position={[0.36, 1.15, -0.165]} scale={[0.10, 0.012, 0.055]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#343b37" /></mesh>
      </group>
      {[0.255, 0.465].map(x => <group key={x}>
        <mesh position={[x, 0.485, 0.01]} rotation={[Math.PI / 2 - 0.12, 0, 0]}><capsuleGeometry args={[0.075, 0.27, 4, 12]} /><meshStandardMaterial color="#33404d" /></mesh>
        <mesh position={[x, 0.32, 0.27]} rotation={[0.35, 0, 0]}><capsuleGeometry args={[0.053, 0.25, 4, 12]} /><meshStandardMaterial color="#33404d" /></mesh>
        <mesh position={[x, 0.155, 0.33]} scale={[0.07, 0.04, 0.13]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#282726" /></mesh>
      </group>)}
      <Arm right={false} points={points} /><Arm right points={points} />
    </group>}
    {vehicleId === 'classic-coupe' && <group name="ClassicAnalogGauges" position={[.36, .865, .48]}>
      <mesh position={[0, 0, -.037]} rotation={[0, Math.PI, 0]}><planeGeometry args={[.32, .112]} /><meshBasicMaterial map={gauges} toneMapped={false} /></mesh>
    </group>}
    <group visible={!controls?.focusRadio}><group ref={radio} name="PhysicalDashboardRadio" position={[0, 0.79, 0.25]}>
      <RoundedBox args={[0.31, 0.115, 0.055]} radius={0.01} smoothness={2}><meshStandardMaterial color="#141719" metalness={0.4} roughness={0.45} /></RoundedBox>
      <mesh position={[0, 0.012, -0.03]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.20, 0.062]} /><meshBasicMaterial map={display.texture} toneMapped={false} /></mesh>
      {[-0.13, 0.13].map((x, i) => <group key={x} ref={i === 0 ? knob : volumeKnob} position={[x, 0, -0.035]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.022, 0.022, 0.018, 16]} /><meshStandardMaterial color="#88867a" metalness={0.7} roughness={0.3} /></mesh>
        <mesh position={[0, 0.012, -0.011]}><boxGeometry args={[0.003, 0.012, 0.002]} /><meshBasicMaterial color="#e1b66d" /></mesh>
      </group>)}
      {[-1, 0, 1].map(i => <mesh key={i} ref={i === 0 ? presetButton : undefined} position={[i * 0.047, -0.035, -0.033]}><boxGeometry args={[0.032, 0.014, 0.012]} /><meshStandardMaterial color="#50514c" /></mesh>)}
      <mesh name="RadioTuneHit" position={[-0.105, 0, -0.065]} onClick={e => { e.stopPropagation(); interact() }}><boxGeometry args={[0.12, 0.16, 0.06]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
      <mesh name="RadioVolumeHit" position={[0.105, 0, -0.065]} onClick={e => { e.stopPropagation(); controls?.request('volume', () => controls.audio.setVolume(controls.audio.volume >= 0.9 ? 0.3 : Math.min(1, controls.audio.volume + 0.15))) }}><boxGeometry args={[0.12, 0.16, 0.06]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
      <mesh name="RadioPlayHit" position={[0, -0.025, -0.065]} onClick={e => { e.stopPropagation(); controls?.request('preset', controls.audio.toggle) }}><boxGeometry args={[0.07, 0.10, 0.06]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
      {panel && camera === 'driver' && controls && <Html position={[0, 0.12, -0.06]} center zIndexRange={[20, 10]}><div className="cockpit-radio-panel" onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => setPanel(false)} aria-label="Close dashboard radio">Close</button>
        <label>Station<select aria-label="Dashboard station" value={controls.audio.stationId} disabled={!!controls.command} onChange={e => { if (controls.selectStation(e.target.value)) setPanel(false) }}><option value="buena-onda-radio">Buena Onda</option><option value="jolt-radio">Jolt Radio</option><option value="nts-radio">NTS 1</option><option value="nts-radio-2">NTS 2</option></select></label>
        <div><button disabled={!controls.audio.canSkip || !!controls.command} onClick={() => controls.request('preset', controls.audio.previousTrack)}>Previous</button><button disabled={!!controls.command} onClick={() => controls.request('preset', controls.audio.toggle)}>{controls.audio.playing ? 'Pause' : 'Play'}</button><button disabled={!controls.audio.canSkip || !!controls.command} onClick={() => controls.request('preset', controls.audio.nextTrack)}>Next</button></div>
        <label>Volume<input aria-label="Dashboard volume" type="range" min="0" max="1" step="0.05" value={controls.audio.volume} onChange={e => { const value = Number(e.target.value); controls.request('volume', () => controls.audio.setVolume(value)) }} /></label>
        <button onClick={() => controls.request('volume', () => controls.audio.setMuted(!controls.audio.muted))}>{controls.audio.muted ? 'Unmute' : 'Mute'}</button><small>{controls.audio.trackTitle}</small>
      </div></Html>}
    </group>
    </group>{controls?.focusRadio && <PhysicalRadio position={[0,.79,.25]} rotation={[0,Math.PI,0]} night={controls.lights}/>}
    <mesh name="LightControlHit" position={[0.57, 0.82, 0.24]} rotation-z={controls?.lights ? -0.35 : 0} onClick={e => { e.stopPropagation(); controls?.toggleLights() }}><boxGeometry args={[0.06, 0.06, 0.08]} /><meshStandardMaterial color={controls?.lights ? '#b8aa68' : '#343633'} /></mesh>
  </group>
}
