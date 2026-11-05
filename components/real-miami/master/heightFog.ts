import * as T from 'three'

/** Canyon fog for the Look's FogExp2 (City / Highway / Causeway): street-level density is unchanged, and it thins
 * with height (approximated at the mean of eye and surface height), so tower tops and the skyline separate from
 * the haze instead of greying out with distance. Linear fog (garage) is untouched. Imported once for its effect. */
const FOG_STREET = 2, FOG_SCALE = 45, FOG_FLOOR = .35
const off = typeof location !== 'undefined' && new URLSearchParams(location.search).get('canyonfog') === 'off'
if (!off && !T.ShaderChunk.fog_vertex.includes('vFogHeight')) {
  T.ShaderChunk.fog_pars_vertex += '\n#if defined(USE_FOG) && defined(FOG_EXP2)\nvarying float vFogHeight;\n#endif\n'
  // World y from the view-space position: world = R^T (v - t), and R^T's second row is the view matrix's second column.
  T.ShaderChunk.fog_vertex += '\n#if defined(USE_FOG) && defined(FOG_EXP2)\nvFogHeight = dot(viewMatrix[1].xyz, mvPosition.xyz - viewMatrix[3].xyz);\n#endif\n'
  T.ShaderChunk.fog_pars_fragment += '\n#if defined(USE_FOG) && defined(FOG_EXP2)\nvarying float vFogHeight;\n#endif\n'
  T.ShaderChunk.fog_fragment = T.ShaderChunk.fog_fragment.replace(
    'float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
    `float fogMean = max(.5 * (vFogHeight + cameraPosition.y) - ${FOG_STREET.toFixed(1)}, 0.);
		float fogDensityHere = fogDensity * mix(${FOG_FLOOR.toFixed(2)}, 1., exp(-fogMean / ${FOG_SCALE.toFixed(1)}));
		float fogFactor = 1.0 - exp( - fogDensityHere * fogDensityHere * vFogDepth * vFogDepth );`)
}
