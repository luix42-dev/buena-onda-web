import type * as T from 'three'

/** While a drive warms up behind the loader (SceneWarmUp), every frame still runs (fog, lights, city blocks build)
 * but CruiseGlow and HoodReflection draw nothing: the first draw of each new material waits for its shader to link
 * (22 s of stalls on a laptop's Intel GPU, 2026-10-30), and drawing during the parallel compile would force each
 * link one at a time. `target` is where CruiseGlow draws the scene (its composer buffer, or null for the screen),
 * so the warm-up compiles the same program variants the drive will use. */
export const renderHold: { active: boolean; target: T.WebGLRenderTarget | null; worldMounted: boolean } = { active: false, target: null, worldMounted: false }
