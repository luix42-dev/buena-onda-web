import * as T from 'three'

/** Look v2 lamps on the licensed Countach: its lamp atlas (round headlamp, clear lenses, red tail lenses,
 * amber indicators) lights up in place. A texel's colour picks the lamp kind and its car-space position
 * picks front or rear (nose is -Z), so no geometry is added or separated.
 * Red rear lenses: tail (lights on) plus brake; clear front lenses: headlamps. Amber stays dark. */
export const lampUniforms = {
  uCarInv: { value: new T.Matrix4() },
  uHead: { value: 0 },
  uTail: { value: 0 },
  uBrake: { value: 0 },
}

export function addLampGlow(material: T.MeshStandardMaterial) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, lampUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uCarInv; varying vec3 vCar;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCar = (uCarInv * modelMatrix * vec4(transformed, 1.)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uHead, uTail, uBrake; varying vec3 vCar;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 lens = diffuseColor.rgb;
        float lo = min(lens.r, min(lens.g, lens.b)), hi = max(lens.r, max(lens.g, lens.b));
        float red = smoothstep(.12, .3, lens.r - max(lens.g, lens.b));
        float clear = smoothstep(.45, .75, lo) * (1. - smoothstep(.08, .2, hi - lo));
        // smoothstep needs edge0 < edge1 (reversed edges are undefined and read as 0 on ANGLE/D3D).
        float front = 1. - smoothstep(-1.7, -1.2, vCar.z), rear = smoothstep(1.2, 1.7, vCar.z);
        totalEmissiveRadiance += vec3(1., .07, .04) * red * rear * (uTail * 1. + uBrake * 3.6);
        // Front lenses are parking lamps: the headlamps are the pop-up pods (Countach.tsx).
        totalEmissiveRadiance += vec3(1., .93, .82) * clear * front * uHead * .7;
      }`)
  }
  material.customProgramCacheKey = () => 'car-lamps'
  material.needsUpdate = true
  return material
}
