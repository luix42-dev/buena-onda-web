# Nightdrive final world source audit

Reviewer: `/root/ux_music` (world implementer performing a second source review; **not an independent implementation reviewer**). Exact model identifier unavailable. Read-only review on 2026-10-10; no browser/GPU tests launched for this audit.

**Finding:** no source defect found that invalidates the planned 30-minute continuous soak. This does not establish its outcome or visual quality. Two authored palettes and simple building silhouettes remain a known product limitation.

| Contract | Source finding |
|---|---|
| Bounded world | `NightWorld.tsx:84` allocates 13 chunks once: 52 strip geometries and 104 instanced meshes. Modulo slot selection at line 275 reuses these objects; travel does not append a world history. Building capacity is 10/chunk; windows use at most 274 of 300 slots. Normal/color buffers initialize lazily then reuse their storage. Resource counts may warm up before plateauing. |
| Cleanup | Lines 255-264 dispose owned strip/shared geometry, each instanced mesh, owned materials and two owned textures. Installed Three 0.170 `WebGLObjects.js:70` removes instance matrix/color GPU buffers on the instanced-mesh dispose event. Cached GLTF geometry, unchanged materials and original texture remain cache-owned. Modified traffic materials are cloned and disposed separately. |
| Continuous geometry | `road.ts` provides one analytic position/derivative function. Adjacent 96 m chunks sample the same boundary station and lateral basis; local origins cancel under world translation. Asphalt UV phase differs only by whole repeats at adjoining chunks. Position/UV data and bounding spheres refresh on slot reassignment. |
| Visibility margin | Pool spans four chunks behind and eight ahead, with the current chunk included. Retired scenery is beyond the 340 m fog configured in `NightLab.tsx:29`; current camera offsets in `NightDrive.tsx` are approximately 12 m or less. Large future camera offsets or a longer fog range would require revisiting that assumption. This is a source check, not a pixel-level pop test. |
| Curvature and vehicles | Hero, traffic and scenery use the same sampler and lateral basis. Dynamics advances route parameter using its metric. Driver runs at frame priority -2; world translations run at 0, so the world reads the updated origin. Traffic has two fixed scene clones, with its own shared sampled height/yaw. |
| Shader work | The emissive-color hook is created once with the materials. The frame callback changes color/intensity uniforms and transforms, not material defines or `needsUpdate`. Instanced-colored windows and uncolored lamps can require separate initial shader variants; no unbounded or per-frame recompilation path was found. |

## Limits worth retaining in the report

- Chunk generation timings measure one chunk's synchronous CPU refill, excluding combined startup generation, shader compilation and GPU uploads. They cannot substitute for frame-time measurements.
- Fixed resource capacity does not mean zero allocation: sampler objects, temporary arrays and bounding computations produce transient garbage. A sustained heap/resource plateau must come from the browser soak; JavaScript heap is not GPU memory.
- Shared road-edge positions do not imply mathematically identical lighting normals: `computeVertexNormals()` averages within each chunk. A subtle shading seam is possible. The flat light-pool decals may intersect the very gentle grade at their edges. Traffic models follow road height/yaw but lack the hero's small grade pitch. These are presentation caveats, not identified resets or resource-growth failures.
- The source shows no endpoint reset in NightWorld/road. A CPU simulation, forced-distance jump or code review cannot prove uninterrupted runtime driving. Final evidence must identify the real wall-clock duration, camera/mood settings, actual resource samples and browser errors.
- A successful single mounted soak would not independently validate repeated route unmount/remount, React development Strict Mode behavior, physical phones or casting.

No application source changed during this audit.
