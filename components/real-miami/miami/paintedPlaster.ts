import * as T from 'three'

// Miami's painted stucco retains its palette; the source surface contributes
// subtle weathering rather than turning every facade unpainted concrete.
export function applyPaintedPlaster(material: T.MeshStandardMaterial) {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', T.ShaderChunk.map_fragment.replace(
      'diffuseColor *= sampledDiffuseColor;',
      'sampledDiffuseColor.rgb = mix(vec3(0.92), sampledDiffuseColor.rgb, 0.15); diffuseColor *= sampledDiffuseColor;'
    ))
  }
  material.customProgramCacheKey = () => 'miami-painted-plaster-v1'
}

/** Ocean Drive facade: painted plaster plus a warm street-level wash at night
 * (cafe light, sodium lamps and uplights pooling on the ground floor). One
 * varying and a few ALU ops; no extra lights. `night` is a shared uniform 0..1. */
/** Shared 0..1 night factor for every facade using the street wash (set once per frame by MiamiWorld). */
export const streetNight = { value: 1 }
export function applyOceanDriveFacade(material: T.MeshStandardMaterial, night: { value: number } = streetNight) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uStreetNight = night
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vStreetY;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvStreetY = (modelMatrix * vec4(transformed, 1.0)).y;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vStreetY;\nuniform float uStreetNight;')
      .replace('#include <map_fragment>', T.ShaderChunk.map_fragment.replace(
        'diffuseColor *= sampledDiffuseColor;',
        'sampledDiffuseColor.rgb = mix(vec3(0.92), sampledDiffuseColor.rgb, 0.15); diffuseColor *= sampledDiffuseColor;'
      ))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.68, 0.42) * uStreetNight * (0.3 * (1.0 - smoothstep(0.5, 8.5, vStreetY)) + 0.04);')
  }
  material.customProgramCacheKey = () => 'miami-ocean-drive-facade-v1'
}
