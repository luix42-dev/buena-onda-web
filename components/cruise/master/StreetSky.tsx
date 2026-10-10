'use client'

import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as T from 'three'
import { pulse } from './pulse'

export type SkyTime = 'day' | 'sunset' | 'night'

/**
 * Art-directed palettes. The sun sits low over the ocean (left of the road),
 * ahead of the driver, so it lights the shopfronts on the right side warm.
 */
export const SKY = {
  sunset: {
    top: '#2c2f7a', mid: '#d0548f', horizon: '#ff8f52', sun: '#ffb25e', sunLight: '#ffb47a',
    cloudLit: '#ffae7e', cloudShade: '#8e4a85', fog: '#e8937f', hemiSky: '#e3b6c4', hemiGround: '#7a5a52',
    sunDir: [-0.52, 0.06, -0.85] as const, sunIntensity: 3.2, hemiIntensity: 0.95, cloud: 1.0, stars: 0, exposure: 0.95,
  },
  day: {
    top: '#2f7fd6', mid: '#76b8ec', horizon: '#d8ecf5', sun: '#fff6df', sunLight: '#fff1db',
    cloudLit: '#ffffff', cloudShade: '#b8c7d8', fog: '#cfe4ef', hemiSky: '#cfe8ff', hemiGround: '#8a7558',
    sunDir: [-0.35, 0.72, -0.6] as const, sunIntensity: 2.4, hemiIntensity: 1.0, cloud: 0.55, stars: 0, exposure: 1.0,
  },
  night: {
    top: '#060a24', mid: '#1b1d4f', horizon: '#4a2d63', sun: '#9fb4ff', sunLight: '#7d8fd8',
    cloudLit: '#3a3466', cloudShade: '#141532', fog: '#231f45', hemiSky: '#5562a8', hemiGround: '#20182c',
    sunDir: [-0.45, 0.32, -0.83] as const, sunIntensity: 0.35, hemiIntensity: 0.5, cloud: 0.45, stars: 1, exposure: 1.25,
  },
}

const vertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w; // far plane: drawn after opaque geometry, only visible sky pixels are shaded
}`

const fragment = /* glsl */ `
uniform vec3 uSun, uTop, uMid, uHorizon, uSunColor, uCloudLit, uCloudShade;
uniform float uTime, uCloud, uStars, uPulse;
varying vec3 vDir;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }
// Fine layers only need three octaves; the missing high octaves are below a pixel at sky distance.
float fbm3(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<3;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v + 0.0625; }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float t = clamp(h, 0.0, 1.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, t));
  col = mix(col, uTop, smoothstep(0.18, 0.75, t));
  col = mix(col, uHorizon * 0.8, smoothstep(0.0, -0.25, h));
  float sd = max(dot(d, uSun), 0.0);
  vec2 dh = normalize(d.xz + 1e-5), sh = normalize(uSun.xz + 1e-5);
  float az = max(dot(dh, sh), 0.0);
  col += uSunColor * (pow(az, 4.0) * exp(-max(h, 0.0) * 9.0) * 0.3); // horizon bloom toward the sun
  col += uSunColor * (pow(sd, 14.0) * 0.25 + pow(sd, 160.0) * 0.6);
  col = mix(col, vec3(1.0, 0.74, 0.46) * 1.3, smoothstep(0.9990, 0.9994, sd));           // sun disc
  col += uSunColor * uPulse * 0.22 * exp(-abs(h) * 7.0) * (0.4 + pow(az, 2.0)); // horizon breathes with the bass
  if (h > 0.0) {
    vec2 uv = d.xz / (h + 0.1) * 0.9;
    uv.x *= 0.7; uv += vec2(uTime * 0.006, 0.0);
    float n = fbm(uv * 1.25) * 0.75 + fbm3(uv * 4.0) * 0.25;
    float cover = smoothstep(0.5, 0.66, n) * uCloud * smoothstep(0.015, 0.1, h) * (1.0 - smoothstep(0.55, 0.95, h));
    float detail = fbm3(uv * 3.4 + 4.1);
    float lit = clamp(pow(sd, 2.0) * 0.7 + (1.0 - t) * 0.35 + (n - 0.55) * 2.2 + (detail - 0.5) * 0.6, 0.0, 1.0);
    vec3 cc = mix(uCloudShade, uCloudLit, lit);
    cc += uSunColor * pow(sd, 6.0) * 0.6 * (1.0 - smoothstep(0.6, 0.85, n)); // silver lining
    col = mix(col, cc, cover * 0.9);
    if (uStars > 0.0) {
      // Sin-free hash: the sin() hash aliases into a visible dot grid at mediump on some GPUs.
      vec2 sp = d.xz / (h + 0.3) * 140.0, g = floor(sp), f = fract(sp);
      vec3 p3 = fract(vec3(g.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33);
      float r = fract((p3.x + p3.y) * p3.z), r2 = fract(r * 17.13 + 0.37), r3 = fract(r * 31.7 + 0.11);
      float star = step(0.985, r) * smoothstep(0.16, 0.0, length(f - vec2(r2, r3) * 0.8 - 0.1));
      float twinkle = 0.75 + 0.25 * sin(uTime * (0.8 + r2 * 1.6) + r3 * 6.28);
      col += vec3(star * twinkle * (0.55 + r2 * 0.6)) * uStars * smoothstep(0.08, 0.35, h) * (1.0 - cover);
    }
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

function makeSkyMaterial() {
  return new T.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, side: T.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uSun: { value: new T.Vector3() }, uTop: { value: new T.Color() }, uMid: { value: new T.Color() },
      uHorizon: { value: new T.Color() }, uSunColor: { value: new T.Color() }, uCloudLit: { value: new T.Color() },
      uCloudShade: { value: new T.Color() }, uTime: { value: 0 }, uCloud: { value: 1 }, uStars: { value: 0 }, uPulse: { value: 0 },
    },
  })
}

function applyPalette(m: T.ShaderMaterial, time: SkyTime) {
  const p = SKY[time], u = m.uniforms
  u.uSun.value.set(...p.sunDir).normalize()
  u.uTop.value.set(p.top); u.uMid.value.set(p.mid); u.uHorizon.value.set(p.horizon); u.uSunColor.value.set(p.sun)
  u.uCloudLit.value.set(p.cloudLit); u.uCloudShade.value.set(p.cloudShade); u.uCloud.value = p.cloud; u.uStars.value = p.stars
}

/** Procedural sunset sky + matching sun, hemisphere, fog and image-based lighting. */
export default function StreetSky({ time, high }: { time: SkyTime; high: boolean }) {
  const { gl, scene, camera } = useThree()
  const p = SKY[time]
  const material = useMemo(makeSkyMaterial, [])
  useEffect(() => applyPalette(material, time), [material, time])
  useEffect(() => () => material.dispose(), [material])

  // Reflections and ambient light come from the same sky the player sees,
  // instead of the neutral studio RoomEnvironment that made paint and glass look grey.
  useEffect(() => {
    const envMat = makeSkyMaterial(); applyPalette(envMat, time); envMat.uniforms.uCloud.value *= 0.6
    const envScene = new T.Scene(); const geo = new T.SphereGeometry(50, 48, 24)
    envScene.add(new T.Mesh(geo, envMat))
    const pmrem = new T.PMREMGenerator(gl); const target = pmrem.fromScene(envScene, 0.02, 0.1, 100)
    scene.environment = target.texture
    scene.environmentIntensity = time === 'night' ? 0.25 : time === 'sunset' ? 0.55 : 0.85
    gl.toneMappingExposure = p.exposure
    return () => { scene.environment = null; target.dispose(); pmrem.dispose(); geo.dispose(); envMat.dispose() }
  }, [gl, scene, time, p.exposure])

  const sky = useMemo(() => { const m = new T.Mesh(new T.SphereGeometry(1, 48, 24), material); m.frustumCulled = false; m.renderOrder = 10; m.scale.setScalar(200); return m }, [material])
  useEffect(() => () => sky.geometry.dispose(), [sky])
  useFrame((_, dt) => { sky.position.copy(camera.position); material.uniforms.uTime.value += dt; material.uniforms.uPulse.value = pulse.bass * 0.8 + pulse.kick * 0.5 })

  // The key light is lifted above the painted sun disc so the road and sidewalks still catch light.
  const sun = new T.Vector3(p.sunDir[0], Math.max(p.sunDir[1], 0.3), p.sunDir[2]).normalize()
  return <>
    <primitive object={sky} />
    <color attach="background" args={[p.horizon]} />
    <fog attach="fog" args={[p.fog, 70, 420]} />
    <hemisphereLight args={[p.hemiSky, p.hemiGround, p.hemiIntensity]} />
    <SunLight dir={sun} color={p.sunLight} intensity={p.sunIntensity} high={high} />
  </>
}

/** Shadow camera follows the player so 2k shadows stay crisp along the whole street. */
function SunLight({ dir, color, intensity, high }: { dir: T.Vector3; color: string; intensity: number; high: boolean }) {
  const { camera } = useThree()
  const light = useMemo(() => new T.DirectionalLight(), [])
  useEffect(() => {
    light.shadow.mapSize.set(2048, 2048); const c = light.shadow.camera
    c.left = -50; c.right = 50; c.top = 50; c.bottom = -50; c.near = 1; c.far = 260
    light.shadow.normalBias = 0.04; light.shadow.bias = -0.0004; c.updateProjectionMatrix()
  }, [light])
  useFrame(() => {
    const focus = camera.position
    light.target.position.set(focus.x, 0, focus.z - 30); light.target.updateMatrixWorld()
    light.position.copy(light.target.position).addScaledVector(dir, 120)
  })
  return <>
    <primitive object={light} color={color} intensity={intensity} castShadow={high} />
    <primitive object={light.target} />
  </>
}
