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
