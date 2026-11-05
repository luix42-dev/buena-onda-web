import * as T from 'three'

/** Look v2 paint: deep black clearcoat that reads as a mirror for passing lights.
 * No reflection pass. The nearest streetlights (and the hero screen) are fed in as view-space
 * "virtual lamps"; each adds a sharp mirror glint plus a soft sheen, so the highlight slides over
 * the hood exactly where a real reflection would, from any camera. Cost: one loop of
 * MAX_LAMPS per car fragment. `?hoodfx=off` sets the count to zero for A/B timing. */
export const MAX_LAMPS = 8
/** Live paint materials, so the hood reflection can hand them its cube map. Removed on dispose. */
export const paintMaterials = new Set<T.MeshStandardMaterial>()
export const paintLamps = {
  uLampPos: { value: Array.from({ length: MAX_LAMPS }, () => new T.Vector3()) },
  uLampColor: { value: Array.from({ length: MAX_LAMPS }, () => new T.Color(0, 0, 0)) },
  uLampCount: { value: 0 },
}

const pars = /* glsl */ `
#define MAX_LAMPS ${MAX_LAMPS}
uniform vec3 uLampPos[MAX_LAMPS]; uniform vec3 uLampColor[MAX_LAMPS]; uniform int uLampCount; uniform float uGlint;
`
const glint = /* glsl */ `
{
  vec3 P = -vViewPosition, V = normalize(vViewPosition), R = reflect(-V, normal);
  vec3 sum = vec3(0.);
  for (int i = 0; i < MAX_LAMPS; i++) {
    if (i >= uLampCount) break;
    vec3 toLamp = uLampPos[i] - P; float d = length(toLamp); vec3 L = toLamp / d;
    float c = max(dot(R, L), 0.);
    // A lamp head subtends ~0.5 deg at 40 m: a tight core plus a wider clearcoat bloom.
    sum += uLampColor[i] * (pow(c, 2400.) * 9. + pow(c, 90.) * .22) / (1. + d * .015);
  }
  // Fresnel: grazing angles (the hood seen from the windshield base) mirror the most.
  float f = .25 + .75 * pow(1. - max(dot(normal, V), 0.), 3.);
  outgoingLight += sum * f * uGlint;
}
`

/** Replace a body material with the night paint. Keeps maps/normal maps; returns the owned copy. */
export function nightPaint(source: T.MeshStandardMaterial, envMap: T.Texture | null, options: { color?: string; glint?: number } = {}) {
  const paint = new T.MeshPhysicalMaterial({
    name: source.name, color: options.color ?? '#26303a', metalness: .35, roughness: .3,
    clearcoat: 1, clearcoatRoughness: .035, envMap, envMapIntensity: 1.15,
    normalMap: source.normalMap, normalScale: source.normalScale, side: source.side,
  })
  addGlints(paint, options.glint ?? 1)
  paintMaterials.add(paint); paint.addEventListener('dispose', () => paintMaterials.delete(paint))
  return paint
}

/** Glints only (rims, chrome, mirror glass): the material keeps its own look. */
export function addGlints(material: T.MeshStandardMaterial, strength = 1) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, paintLamps, { uGlint: { value: strength } })
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + pars)
      .replace('#include <opaque_fragment>', glint + '\n#include <opaque_fragment>')
  }
  material.customProgramCacheKey = () => `night-glint-${strength}`
  material.needsUpdate = true
  return material
}

let env: T.Texture | null = null
/** A tiny night environment (navy sky, sodium horizon, a cyan sign band), prefiltered once.
 * Gives the clearcoat something to mirror between lamps; never assigned to scene.environment. */
export function nightEnvironment(gl: T.WebGLRenderer) {
  if (env) return env
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128
  const c = canvas.getContext('2d')!
  const sky = c.createLinearGradient(0, 0, 0, 128)
  sky.addColorStop(0, '#01030a'); sky.addColorStop(.38, '#07122a'); sky.addColorStop(.49, '#3a2a1c'); sky.addColorStop(.52, '#1a1410'); sky.addColorStop(1, '#020203')
  c.fillStyle = sky; c.fillRect(0, 0, 256, 128)
  // Distant windows and signs along the horizon.
  for (let i = 0; i < 90; i++) { c.fillStyle = i % 7 ? '#ffb15c' : '#4fe3ff'; c.globalAlpha = .25 + (i * 37 % 10) / 20; c.fillRect((i * 53) % 256, 52 + (i * 17) % 10, 2, 1) }
  c.globalAlpha = 1
  const texture = new T.CanvasTexture(canvas); texture.mapping = T.EquirectangularReflectionMapping; texture.colorSpace = T.SRGBColorSpace
  const pmrem = new T.PMREMGenerator(gl)
  env = pmrem.fromEquirectangular(texture).texture
  pmrem.dispose(); texture.dispose()
  return env
}

const world = new T.Vector3()
/** Feed world-space lamps for this frame (nearest first is not required). */
export function setPaintLamps(camera: T.Camera, lamps: { x: number; y: number; z: number; color: T.Color; intensity: number }[], enabled: boolean) {
  // The camera rig moved the camera earlier this frame; the renderer has not refreshed its matrices yet.
  camera.updateMatrixWorld()
  const n = enabled ? Math.min(MAX_LAMPS, lamps.length) : 0
  for (let i = 0; i < n; i++) {
    const lamp = lamps[i]
    world.set(lamp.x, lamp.y, lamp.z).applyMatrix4(camera.matrixWorldInverse)
    paintLamps.uLampPos.value[i].copy(world)
    paintLamps.uLampColor.value[i].copy(lamp.color).multiplyScalar(lamp.intensity)
  }
  paintLamps.uLampCount.value = n
}
