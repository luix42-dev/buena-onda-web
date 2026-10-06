'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, LineSegments, ShaderMaterial } from 'three'
import { HERO_X, QUALITY } from '@/lib/cruise/constants'
import type { CruiseQuality, CruiseTimeOfDay, CruiseWeather } from '@/lib/cruise/types'

const VERTEX = `
  uniform float elapsed;
  uniform float heroX;
  attribute float tip;
  attribute float speed;
  varying float distanceFade;
  #include <fog_pars_vertex>
  void main() {
    vec3 drop = position;
    drop.y = mod(position.y - elapsed * speed, 24.0) + 0.15;
    drop.x += tip * 0.065;
    drop.y += tip * 0.65;
    drop.z -= tip * 0.12;
    vec4 mvPosition = modelViewMatrix * vec4(drop, 1.0);
    vec3 worldPosition = (modelMatrix * vec4(drop, 1.0)).xyz;
    float cabin = step(abs(worldPosition.x - heroX), 1.1)
      * step(abs(worldPosition.z), 2.5) * step(worldPosition.y, 1.8);
    distanceFade = smoothstep(2.0, 5.0, length(mvPosition.xyz));
    distanceFade *= 1.0 - cabin;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const FRAGMENT = `
  uniform vec3 rainColor;
  uniform float opacity;
  varying float distanceFade;
  #include <fog_pars_fragment>
  void main() {
    gl_FragColor = vec4(rainColor, opacity * distanceFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

function random(seed: number) {
  const value = Math.sin(seed * 73.217 + 19.731) * 43758.5453
  return value - Math.floor(value)
}

function RainParticles({ count, weather, timeOfDay }: {
  count: number; weather: CruiseWeather; timeOfDay: CruiseTimeOfDay
}) {
  const mesh = useRef<LineSegments>(null)
  const material = useRef<ShaderMaterial>(null)
  const data = useMemo(() => {
    const positions = new Float32Array(count * 6)
    const tips = new Float32Array(count * 2)
    const speeds = new Float32Array(count * 2)
    for (let index = 0; index < count; index += 1) {
      const x = (random(index * 3 + 1) - 0.5) * 34
      const y = random(index * 3 + 2) * 24
      const z = random(index * 3 + 3) * 64 - 52
      for (let end = 0; end < 2; end += 1) {
        const offset = index * 6 + end * 3
        positions[offset] = x
        positions[offset + 1] = y
        positions[offset + 2] = z
        tips[index * 2 + end] = end
        speeds[index * 2 + end] = 12 + (index % 4) * 3
      }
    }
    return { positions, tips, speeds }
  }, [count])
  const uniforms = useMemo(() => ({
    elapsed: { value: 0 }, opacity: { value: 0 }, heroX: { value: HERO_X },
    rainColor: { value: new Color('#c7d9df') },
    fogColor: { value: new Color() }, fogNear: { value: 1 }, fogFar: { value: 200 },
  }), [])

  useFrame(({ camera }, delta) => {
    if (!mesh.current || !material.current) return
    const step = Math.min(delta, 0.1)
    const targetOpacity = weather === 'rain' ? (timeOfDay === 'night' ? 0.2 : 0.29) : 0
    uniforms.opacity.value += (targetOpacity - uniforms.opacity.value) * (1 - Math.exp(-step * 2))
    mesh.current.visible = uniforms.opacity.value > 0.002
    if (!mesh.current.visible) return
    // All fall speeds wrap exactly after 128 seconds, preserving long-session precision.
    uniforms.elapsed.value = (uniforms.elapsed.value + step) % 128
    mesh.current.position.set(camera.position.x, 0, camera.position.z)
  })

  return <lineSegments ref={mesh} frustumCulled={false} renderOrder={2}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      <bufferAttribute attach="attributes-tip" args={[data.tips, 1]} />
      <bufferAttribute attach="attributes-speed" args={[data.speeds, 1]} />
    </bufferGeometry>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={VERTEX} fragmentShader={FRAGMENT}
      transparent depthWrite={false} fog />
  </lineSegments>
}

export default function RainField({ quality, weather, timeOfDay }: {
  quality: CruiseQuality; weather: CruiseWeather; timeOfDay: CruiseTimeOfDay
}) {
  const count = QUALITY[quality].rainParticles
  return count > 0 ? <RainParticles key={count} count={count} weather={weather} timeOfDay={timeOfDay} /> : null
}
