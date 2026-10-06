'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BackSide, CanvasTexture, DirectionalLight, Fog, HemisphereLight,
  Mesh, PMREMGenerator, SRGBColorSpace,
} from 'three'
import { QUALITY } from '@/lib/cruise/constants'
import type { CruiseQuality, CruiseTimeOfDay, CruiseWeather } from '@/lib/cruise/types'
import { atmospherePreset, type AtmospherePreset } from './presets'
import RainField from './RainField'
import SunsetEnvironment from './SunsetEnvironment'

const SKY_VERTEX = `
  varying vec3 skyDirection;
  void main() {
    skyDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAGMENT = `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform vec3 sunDirection;
  uniform float discStrength;
  uniform float cloudCover;
  varying vec3 skyDirection;
  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float cloudNoise(vec2 p) {
    vec2 cell = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1, 0)), f.x),
      mix(hash(cell + vec2(0, 1)), hash(cell + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec3 direction = normalize(skyDirection);
    float elevation = max(direction.y, 0.0);
    // Keep horizon haze below the driver's forward sky; warmth comes from the
    // sun/key light, not a beige atmospheric veil across the entire windshield.
    vec3 sky = mix(horizon, zenith, pow(smoothstep(0.0, 0.34, elevation), 0.42));
    float alignment = dot(direction, normalize(sunDirection));
    float disc = smoothstep(0.99991, 0.99997, alignment);
    float glow = pow(max(alignment, 0.0), 24.0) * 0.18;
    sky += sunColor * (disc * 2.8 + glow) * discStrength;
    // Thin, layered cloud structure rather than a uniform gradient or extra sky meshes.
    vec2 cloudUv = direction.xz / (max(direction.y, 0.0) + 0.23);
    float cloud = cloudNoise(cloudUv * vec2(3.8, 1.6)) * 0.62
      + cloudNoise(cloudUv * vec2(9.0, 4.0) + 7.0) * 0.28
      + cloudNoise(cloudUv * 21.0) * 0.1;
    cloud = smoothstep(0.48, 0.74, cloud) * smoothstep(0.015, 0.14, elevation);
    vec3 cloudColor = mix(horizon * 1.2, sunColor * 0.85, pow(max(alignment, 0.0), 8.0));
    sky = mix(sky, cloudColor, cloud * cloudCover);
    gl_FragColor = vec4(sky, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function EnvironmentMap({ preset, night }: { preset: AtmospherePreset; night: boolean }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    // Rebuild only when a mode changes. Generated textures never require network or cube captures.
    const bitmap = document.createElement('canvas')
    bitmap.width = 512
    bitmap.height = 256
    const context = bitmap.getContext('2d')
    if (!context) return
    const gradient = context.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, `#${preset.zenith.getHexString()}`)
    gradient.addColorStop(0.43, `#${preset.horizon.getHexString()}`)
    gradient.addColorStop(0.52, `#${preset.horizon.getHexString()}`)
    gradient.addColorStop(0.64, `#${preset.ground.getHexString()}`)
    gradient.addColorStop(1, night ? '#263234' : '#625c4e')
    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 256)
    const sunLongitude = Math.atan2(preset.sunPosition.z, preset.sunPosition.x) / (2 * Math.PI) + 0.5
    const sunX = sunLongitude * bitmap.width
    const sunY = Math.acos(preset.sunPosition.y) / Math.PI * bitmap.height
    const glow = context.createRadialGradient(sunX, sunY, 1, sunX, sunY, 52)
    glow.addColorStop(0, `#${preset.sun.getHexString()}ee`)
    glow.addColorStop(0.15, `#${preset.keyLight.getHexString()}88`)
    glow.addColorStop(1, `#${preset.keyLight.getHexString()}00`)
    context.fillStyle = glow
    context.fillRect(0, 0, 512, 256)
    // Static urban reflection information: staggered cornices, glazing bands and
    // vertical piers, captured only on time/weather changes, not a live cube map.
    for (let index = 0; index < 17; index += 1) {
      const x = index * 31 + (index % 3) * 5
      const height = 22 + (index * 23 % 49)
      const width = 17 + index * 7 % 19
      const top = 131 - height
      context.fillStyle = index % 3 === 0 ? '#45545b' : '#25383f'
      context.fillRect(x, top, width, height + 43)
      context.fillStyle = night ? '#554f49' : '#869599'
      context.fillRect(x, top, width, 2)
      context.fillRect(x + width - 2, top, 2, height)
      for (let row = 0; row < height - 5; row += 7) {
        context.fillStyle = night ? (row % 3 === 0 ? '#b89a6b' : '#384751') : '#657b85'
        context.fillRect(x + 3, top + row + 5, width - 6, 3)
      }
    }
    const source = new CanvasTexture(bitmap)
    source.colorSpace = SRGBColorSpace
    const generator = new PMREMGenerator(gl)
    const previous = scene.environment
    let target: ReturnType<PMREMGenerator['fromEquirectangular']> | undefined
    try {
      target = generator.fromEquirectangular(source)
      target.texture.name = 'cruise-procedural-environment'
      scene.environment = target.texture
    } finally {
      source.dispose()
      generator.dispose()
    }
    return () => {
      if (target && scene.environment === target.texture) scene.environment = previous
      target?.dispose()
    }
  }, [gl, scene, preset, night])
  return null
}

export interface CruiseAtmosphereProps {
  timeOfDay: CruiseTimeOfDay
  weather: CruiseWeather
  quality: CruiseQuality
}

export default function CruiseAtmosphere({ timeOfDay, weather, quality }: CruiseAtmosphereProps) {
  const { scene } = useThree()
  const [photographedSky, setPhotographedSky] = useState(false)
  const preset = useMemo(() => atmospherePreset(timeOfDay, weather), [timeOfDay, weather])
  const initial = useRef(preset).current
  const initialCloudCover = useRef(weather === 'rain' ? 0.8 : timeOfDay === 'night' ? 0.08 : 0.3).current
  const settings = QUALITY[quality]
  const hemisphere = useRef<HemisphereLight>(null)
  const keyLight = useRef<DirectionalLight>(null)
  const sky = useRef<Mesh>(null)
  const fog = useMemo(() => new Fog(initial.horizon, initial.near, initial.far), [initial])
  const background = useMemo(() => initial.horizon.clone(), [initial])
  const uniforms = useMemo(() => ({
    zenith: { value: initial.zenith.clone() }, horizon: { value: initial.horizon.clone() },
    sunColor: { value: initial.sun.clone() }, sunDirection: { value: initial.sunPosition.clone() },
    discStrength: { value: initial.disc },
    cloudCover: { value: initialCloudCover },
  }), [initial, initialCloudCover])

  useEffect(() => {
    const previousBackground = scene.background
    const previousFog = scene.fog
    const previousIntensity = scene.environmentIntensity
    scene.background = background
    scene.fog = fog
    scene.environmentIntensity = initial.environment
    return () => {
      if (scene.background === background) scene.background = previousBackground
      if (scene.fog === fog) scene.fog = previousFog
      scene.environmentIntensity = previousIntensity
    }
  }, [scene, background, fog, initial])

  useEffect(() => {
    const light = keyLight.current
    if (!light) return
    // Three keeps the old framebuffer when only mapSize changes.
    light.shadow.map?.dispose()
    light.shadow.map = null
    light.shadow.needsUpdate = true
  }, [quality])

  useFrame(({ camera }, delta) => {
    const blend = 1 - Math.exp(-Math.min(delta, 0.1) * 1.65)
    uniforms.zenith.value.lerp(preset.zenith, blend)
    uniforms.horizon.value.lerp(preset.horizon, blend)
    uniforms.sunColor.value.lerp(preset.sun, blend)
    uniforms.sunDirection.value.lerp(preset.sunPosition, blend)
    uniforms.discStrength.value += (preset.disc - uniforms.discStrength.value) * blend
    uniforms.cloudCover.value += ((weather === 'rain' ? 0.8 : timeOfDay === 'night' ? 0.08 : 0.3) - uniforms.cloudCover.value) * blend
    background.lerp(preset.horizon, blend)
    fog.color.copy(background)
    fog.near += (preset.near - fog.near) * blend
    fog.far += (preset.far - fog.far) * blend
    const environmentTarget = preset.environment * (photographedSky ? 0.2 : 1)
    scene.environmentIntensity += (environmentTarget - scene.environmentIntensity) * blend
    sky.current?.position.copy(camera.position)
    if (hemisphere.current) {
      hemisphere.current.color.lerp(preset.skyLight, blend)
      hemisphere.current.groundColor.lerp(preset.ground, blend)
      hemisphere.current.intensity += (preset.hemisphere - hemisphere.current.intensity) * blend
    }
    if (keyLight.current) {
      keyLight.current.color.lerp(preset.keyLight, blend)
      keyLight.current.position.lerp(preset.lightPosition, blend)
      keyLight.current.intensity += (preset.key - keyLight.current.intensity) * blend
    }
  })

  return <>
    <mesh visible={!photographedSky} ref={sky} renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[480, 32, 16]} />
      <shaderMaterial uniforms={uniforms} vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT}
        side={BackSide} depthWrite={false} />
    </mesh>
    <hemisphereLight ref={hemisphere} args={[initial.skyLight, initial.ground, initial.hemisphere]} />
    <directionalLight ref={keyLight} position={initial.lightPosition} color={initial.keyLight}
      intensity={initial.key} castShadow={settings.shadows}
      shadow-mapSize={[settings.shadowMapSize, settings.shadowMapSize]}
      shadow-bias={0.00008} shadow-normalBias={0.04}
      shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={30} shadow-camera-bottom={-30}
      shadow-camera-near={1} shadow-camera-far={140} />
    <EnvironmentMap preset={preset} night={timeOfDay === 'night'} />
    <SunsetEnvironment enabled={timeOfDay === 'sunset' && weather === 'clear'}
      rotation={Math.PI / 2} onReady={setPhotographedSky} />
    <RainField quality={quality} weather={weather} timeOfDay={timeOfDay} />
  </>
}
