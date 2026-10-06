import type { MeshStandardMaterial } from 'three'
import { WORLD_LENGTH } from '@/lib/cruise/constants'

/** Meter-scale wear supplements the scanned aggregate without another texture or draw call. */
export function addRoadWear(material: MeshStandardMaterial) {
  const travel = { value: 0 }
  material.onBeforeCompile = shader => {
    shader.uniforms.roadTravel = travel
    shader.vertexShader = `varying vec2 roadPosition;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nroadPosition = (modelMatrix * vec4(transformed, 1.0)).xz;',
    )
    shader.fragmentShader = `
      uniform float roadTravel;
      varying vec2 roadPosition;
      float wearHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float wearNoise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(wearHash(cell), wearHash(cell + vec2(1, 0)), f.x),
          mix(wearHash(cell + vec2(0, 1)), wearHash(cell + vec2(1, 1)), f.x), f.y);
      }
    ${shader.fragmentShader}`.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec2 wearP = vec2(roadPosition.x, mod(roadPosition.y - roadTravel, ${WORLD_LENGTH.toFixed(1)}));
      // Periodic coordinates keep macro variation continuous at the world wrap.
      float wearPhase = wearP.y * ${(Math.PI * 2 / WORLD_LENGTH).toPrecision(12)};
      float mottling = wearNoise(vec2(wearP.x * 0.55 + sin(wearPhase) * 14.0, cos(wearPhase) * 14.0));
      float wheelPath = abs(abs(wearP.x) - 3.5);
      float tireWear = 1.0 - smoothstep(0.08, 0.28, abs(wheelPath - 0.78));
      vec2 repairCell = floor(vec2((wearP.x + 7.1) / 3.55, wearP.y / 32.0));
      vec2 repairUv = fract(vec2((wearP.x + 7.1) / 3.55, wearP.y / 32.0));
      float repairSeed = wearHash(repairCell + 3.0);
      float edgeNoise = wearNoise(wearP * 8.0) * 0.018;
      float repair = step(0.82, repairSeed)
        * smoothstep(0.1, 0.12, repairUv.x + edgeNoise)
        * (1.0 - smoothstep(0.78, 0.8, repairUv.x + edgeNoise))
        * smoothstep(0.24, 0.245, repairUv.y + edgeNoise * 0.1)
        * (1.0 - smoothstep(0.35, 0.355, repairUv.y + edgeNoise * 0.1));
      diffuseColor.rgb *= 0.87 + mottling * 0.25 - tireWear * 0.045 - repair * 0.16;
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor * (0.88 + mottling * 0.2 - tireWear * 0.035 + repair * 0.08), 0.035, 1.0);
    `)
  }
  material.customProgramCacheKey = () => `cruise-measured-road-wear-v2-${WORLD_LENGTH}`
  return travel
}
