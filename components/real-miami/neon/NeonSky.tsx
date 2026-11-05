'use client'
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import type { MutableRefObject } from 'react'
import type { NightState } from '../nightdrive/state'
import { retrowaveIslandMix, retrowaveSkywayMix } from '../nightdrive/road'

/** Rain night over the megacity: near-black violet zenith, a sodium-and-magenta glow of city light
 * on the horizon, a dim slatted retro sun drowning in the smog down the avenue. Also owns the haze
 * (dense exponential fog), fill light and an environment that contains neon bands, so stainless
 * steel, wet asphalt and glass all pick up pink and cyan reflections. */
const vertex = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`
const fragment = /* glsl */`
uniform float uTime; uniform float uEnv; uniform float uWarm; varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  float warm = clamp(uWarm, 0., 1.);
  vec3 zenith = mix(vec3(.012,.008,.03), vec3(.034,.045,.14), warm);
  vec3 mid = mix(vec3(.07,.025,.11), vec3(.29,.14,.37), warm);
  vec3 glow = mix(vec3(.42,.12,.30), vec3(.96,.31,.48), warm);
  vec3 sodium = mix(vec3(.62,.30,.14), vec3(1.,.70,.31), warm);
  vec3 c = mix(glow, mid, smoothstep(.0, .2, h)); c = mix(c, zenith, smoothstep(.2, .7, h));
  c = mix(c, sodium, exp(-abs(h) * 30.) * .6); if (h < 0.) c = mix(glow * .5, vec3(.03,.01,.04), smoothstep(0., -.3, h));
  vec3 sunDir = normalize(vec3(0., .05, -1.)); float a = acos(clamp(dot(d, sunDir), -1., 1.));
  float slats = clamp(step(.5, fract((d.y - .02) * 95.)) + step(.07, d.y), 0., 1.);
  c = mix(c, mix(vec3(.9,.18,.4), vec3(1.,.7,.3), smoothstep(-.03,.15,d.y)) * .55, smoothstep(.12,.115,a) * slats * smoothstep(-.01,.01,d.y));
  c += vec3(1.,.3,.45) * exp(-a * 6.) * .18;
  vec2 starCell = floor(vec2(atan(d.x,d.z), asin(h)) * vec2(170., 125.));
  float stars = step(.998, hash(starCell)) * smoothstep(.18,.42,h) * warm;
  c += vec3(.9,.91,1.) * stars * .7;
  vec3 moon = normalize(vec3(-.52,.44,-1.));
  vec3 cut = normalize(moon + vec3(.012,-.004,0.));
  float crescent = max(0., 1. - smoothstep(.017,.021,acos(clamp(dot(d,moon),-1.,1.))) - (1. - smoothstep(.015,.019,acos(clamp(dot(d,cut),-1.,1.)))));
  c += vec3(1.,.92,.68) * crescent * warm * 1.6;
  // Environment only: neon bands around the horizon for reflections in paint, glass and puddles.
  if (uEnv > .5) { float az = atan(d.x, d.z); float band = step(.82, fract(az * 2.2)) * smoothstep(.0,.06,h) * (1. - smoothstep(.12,.3,h));
    c += band * mix(vec3(1.,.2,.65), vec3(.2,.9,1.), step(.5, fract(az * 1.1))) * 2.2; }
  gl_FragColor = vec4(c, 1.);
}`

export const NEON_FOG = '#1d0f29'
const darkFog = new T.Color(NEON_FOG), warmFog = new T.Color('#643653')

export default function NeonSky({ future = false, state }: { future?: boolean; state?: MutableRefObject<NightState> }) {
  const { scene, gl } = useThree()
  const sky = useMemo(() => new T.Mesh(new T.SphereGeometry(450, 48, 24), new T.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: { uTime: { value: 0 }, uEnv: { value: 0 }, uWarm: { value: 0 } }, side: T.BackSide, depthWrite: false, fog: false })), [])
  const fog = useMemo(() => new T.FogExp2(NEON_FOG, .0068), [])
  useEffect(() => {
    const pmrem = new T.PMREMGenerator(gl), envScene = new T.Scene(), copy = sky.clone()
    copy.material = (sky.material as T.ShaderMaterial).clone(); (copy.material as T.ShaderMaterial).uniforms.uEnv.value = 1
    copy.scale.setScalar(.1); envScene.add(copy)
    const target = pmrem.fromScene(envScene, .015)
    const previous = { fog: scene.fog, env: scene.environment, intensity: scene.environmentIntensity, exposure: gl.toneMappingExposure }
    scene.environment = target.texture; scene.environmentIntensity = .85; scene.fog = fog; gl.toneMappingExposure = 1.1
    return () => { scene.environment = previous.env; scene.environmentIntensity = previous.intensity; scene.fog = previous.fog; gl.toneMappingExposure = previous.exposure; target.dispose(); pmrem.dispose(); (copy.material as T.Material).dispose(); sky.geometry.dispose(); (sky.material as T.Material).dispose() }
  }, [gl, scene, sky, fog])
  useFrame(({ clock, camera }) => {
    const uniforms = (sky.material as T.ShaderMaterial).uniforms
    uniforms.uTime.value = clock.elapsedTime; sky.position.copy(camera.position)
    if (future && state) {
      const skyway = retrowaveSkywayMix(state.current.distance), island = retrowaveIslandMix(state.current.distance), warmth = Math.max(skyway * .55, island)
      uniforms.uWarm.value = warmth; fog.density = .0068 - .0024 * skyway
      fog.color.copy(darkFog).lerp(warmFog, warmth)
    }
  })
  return <>
    <primitive object={sky} />
    <hemisphereLight args={['#6b3a9a', '#1a0c16', .5]} />
    <directionalLight position={[0, 30, -120]} color="#ff7a8c" intensity={.35} />
  </>
}
