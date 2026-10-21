import * as T from 'three'

/** One light that reflects in the wet road. Position is its emitting centre in the parent's space; the ground is local y=0.
 * `width` is the art-directed streak width on the ground in metres, not the light's own size. */
export type WetLight = { x: number; y: number; z: number; width: number; color: string; intensity?: number }

/** Shared uniforms: `strength` follows night blend, `time` drives the ripple, `post` is 1 while the HDR post pass owns tone mapping. */
export const wetStreakUniforms = { strength: { value: 1 }, time: { value: 0 }, post: { value: 1 } }

/* Fake glossy reflection, no second render pass. For a light at height h and a camera at height c,
 * the mirror point sits on the ground at c/(c+h) of the way from camera to the light's base. Each
 * instance is a ground quad centred there and stretched along the view direction, so streaks always
 * run toward the camera whichever way the route traverses the street. */
const vertex = /* glsl */ `
attribute vec3 light; attribute vec3 tint; attribute vec2 size;
uniform float time;
varying vec2 vUv; varying vec3 vTint; varying float vFade; varying vec2 vWorld;
#include <fog_pars_vertex>
void main(){
  vec3 base = (modelMatrix * vec4(light.x, 0.0, light.z, 1.0)).xyz;
  float ground = base.y, h = max(.3, (modelMatrix * vec4(light, 1.0)).y - ground), c = max(.4, cameraPosition.y - ground);
  vec2 toLight = base.xz - cameraPosition.xz; float dist = length(toLight);
  vec2 dir = toLight / max(dist, .001), side = vec2(-dir.y, dir.x);
  float k = c / (c + h);
  vec2 mirror = cameraPosition.xz + toLight * k;
  // Rough wet asphalt spreads the lobe along the view ray; width widens with the spread.
  // Ground width grows with the mirror point's distance, so every streak keeps a similar on-screen width.
  float len = clamp(dist * (.25 + .5 * k), 1.5, 90.0), width = size.x * clamp(dist * k / 18.0, .2, 1.4);
  vec2 p = mirror + dir * (position.y * len) + side * (position.x * width);
  vec3 world = vec3(p.x, ground + .07, p.y);
  vUv = position.xy + .5; vTint = tint * size.y; vWorld = p;
  vFade = smoothstep(320.0, 110.0, dist) * smoothstep(.6, 2.5, dist);
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const fragment = /* glsl */ `
uniform float strength, time, post;
varying vec2 vUv; varying vec3 vTint; varying float vFade; varying vec2 vWorld;
#include <fog_pars_fragment>
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
  float across = 1.0 - abs(vUv.x * 2.0 - 1.0); across *= across;
  float along = smoothstep(0.0, .35, vUv.y) * (1.0 - smoothstep(.55, 1.0, vUv.y));
  // Puddle breakup is fixed in world space, so the texture passes under the car with the road.
  float ripple = .35 + .65 * noise(vWorld * 1.3) * (.6 + .4 * noise(vWorld * 4.1 + 7.0));
  // Direct-to-screen (phone tier) has no HDR headroom; overlapping additive streaks clip to white without this.
  float a = across * along * ripple * vFade * strength * mix(.45, 1.0, post);
  gl_FragColor = vec4(vTint * a, 1.0);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

let shared: T.ShaderMaterial | null = null
export function wetStreakMaterial() {
  if (shared) return shared
  shared = new T.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {}]),
    blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: true,
  })
  // Merge copies values; point the live uniforms at the shared objects.
  Object.assign(shared.uniforms, wetStreakUniforms)
  return shared
}

/** One instanced draw for a set of lights. Returns null for an empty set. */
export function createWetStreaks(lights: WetLight[]): T.Mesh | null {
  if (!lights.length) return null
  // Own quad buffers per mesh: disposing one streamed cell must not free another's.
  const quad = new T.PlaneGeometry(1, 1), geometry = new T.InstancedBufferGeometry()
  geometry.index = quad.index; geometry.setAttribute('position', quad.getAttribute('position'))
  const light = new Float32Array(lights.length * 3), tint = new Float32Array(lights.length * 3), size = new Float32Array(lights.length * 2), color = new T.Color()
  lights.forEach((l, i) => {
    light.set([l.x, l.y, l.z], i * 3)
    color.set(l.color); tint.set([color.r, color.g, color.b], i * 3)
    size.set([l.width, l.intensity ?? 1], i * 2)
  })
  geometry.setAttribute('light', new T.InstancedBufferAttribute(light, 3))
  geometry.setAttribute('tint', new T.InstancedBufferAttribute(tint, 3))
  geometry.setAttribute('size', new T.InstancedBufferAttribute(size, 2))
  geometry.instanceCount = lights.length
  const mesh = new T.Mesh(geometry, wetStreakMaterial())
  // Positions are computed per frame in the shader; bounds cannot be known on the CPU.
  mesh.frustumCulled = false; mesh.renderOrder = 1; mesh.name = 'WetStreaks'
  // Light-only quads never hide an advertisement from the measurement rays.
  mesh.raycast = () => {}
  return mesh
}
