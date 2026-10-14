'use client'
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'

/** Smog sunset over an imaginary megacity: amber horizon under magenta haze and indigo zenith,
 * a slatted retro sun sinking into the smog, faint stars. Also owns fog, hemisphere fill and the
 * environment map, so chrome, wet asphalt and car paint all reflect the same sky. */
const vertex = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`
const fragment = /* glsl */`
uniform float uTime; varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 zenith = vec3(.035,.02,.09), upper = vec3(.22,.05,.30), haze = vec3(.85,.20,.42), horizon = vec3(1.,.55,.22), below = vec3(.10,.03,.10);
  vec3 c = h > .0 ? mix(haze, upper, smoothstep(.02,.22,h)) : mix(horizon*.6, below, smoothstep(0.,-.25,h));
  c = h > .22 ? mix(upper, zenith, smoothstep(.22,.75,h)) : c;
  c = mix(c, horizon, exp(-abs(h)*26.)*.85);
  // Sun low in the smog, toward the road's horizon (-Z), slatted bands across its lower half.
  vec3 sunDir = normalize(vec3(0., .07, -1.)); float a = acos(clamp(dot(d, sunDir), -1., 1.));
  float disc = smoothstep(.135, .128, a);
  float slats = step(.5, fract((d.y - .02) * 95.)) + step(.085, d.y);
  vec3 sun = mix(vec3(1.,.25,.45), vec3(1.,.86,.35), smoothstep(-.03, .19, d.y));
  c = mix(c, sun, disc * clamp(slats, 0., 1.) * smoothstep(-.01, .01, d.y));
  c += vec3(1.,.35,.45) * exp(-a*5.5) * .35;
  // Smog bands drifting across the sun.
  float band = smoothstep(.0, .02, h) * (1. - smoothstep(.02, .12, h)) * (.55 + .45*sin(d.x*14. + uTime*.03));
  c = mix(c, vec3(.42,.10,.25), band * .55);
  // Stars only high up, where the smog thins.
  vec2 g = floor(d.xz / max(.25, d.y) * 220.); float s = step(.9975, hash(g)) * smoothstep(.35, .7, h);
  c += s * vec3(.8,.85,1.) * (.6 + .4*sin(uTime*2. + hash(g)*30.));
  gl_FragColor = vec4(c, 1.);
}`

export const NEON_FOG = '#3a1238'

export default function NeonSky() {
  const { scene, gl } = useThree()
  const sky = useMemo(() => new T.Mesh(new T.SphereGeometry(450, 48, 24), new T.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms: { uTime: { value: 0 } }, side: T.BackSide, depthWrite: false, fog: false })), [])
  const fog = useMemo(() => new T.FogExp2(NEON_FOG, .0042), [])
  useEffect(() => {
    // One-time environment from the sky itself (no image assets).
    const pmrem = new T.PMREMGenerator(gl), envScene = new T.Scene(), copy = sky.clone()
    copy.scale.setScalar(.1); envScene.add(copy)
    const target = pmrem.fromScene(envScene, .02)
    const previous = { fog: scene.fog, env: scene.environment, intensity: scene.environmentIntensity, exposure: gl.toneMappingExposure }
    scene.environment = target.texture; scene.environmentIntensity = .7; scene.fog = fog; gl.toneMappingExposure = 1.05
    return () => { scene.environment = previous.env; scene.environmentIntensity = previous.intensity; scene.fog = previous.fog; gl.toneMappingExposure = previous.exposure; target.dispose(); pmrem.dispose(); sky.geometry.dispose(); (sky.material as T.Material).dispose() }
  }, [gl, scene, sky, fog])
  useFrame(({ clock, camera }) => { (sky.material as T.ShaderMaterial).uniforms.uTime.value = clock.elapsedTime; sky.position.copy(camera.position) })
  return <>
    <primitive object={sky} />
    <hemisphereLight args={['#b76ad8', '#2a0f22', .55]} />
    <directionalLight position={[0, 18, -120]} color="#ff9a6b" intensity={.9} />
    <directionalLight position={[40, 60, 60]} color="#5fd0ff" intensity={.35} />
  </>
}
